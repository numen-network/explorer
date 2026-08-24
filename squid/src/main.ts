import 'dotenv/config'
import {
    BlockHeader,
    Block as BlockData,
    DataHandlerContext,
    Call as CallData,
    Event as EventData,
    Extrinsic as ExtrinsicData,
    SubstrateBatchProcessor,
    SubstrateBatchProcessorFields,
} from '@subsquid/substrate-processor'
import {Store, TypeormDatabase} from '@subsquid/typeorm-store'
import {RpcClient} from '@subsquid/rpc-client'
import {toJSON} from '@subsquid/util-internal-json'
import {In, LessThanOrEqual} from 'typeorm'
import {Account, Block, Call, CallKind, ChainInfo, Delegation, Event, EvmLog, EvmTransaction, Extrinsic, MeshTopology, MinedObject, ProxyRelation, Token, TokenHolder, Transfer, TokenTransfer} from './model'
import {constants, events, storage} from './types'
import type {RuntimeCtx} from './types/support'
import {BatchData} from './batch'
import {parsePowDigest} from './digest'
import {fetchObj, mapLimit, parseMesh} from './objects'
import {ZERO_ADDRESS, asErc20Transfer, decodeEvmTx, decodeLog, evmMappedAccount, fetchErc20Metadata} from './evm'
import {collectGovEvent, finalizeGovernance} from './governance'
import {collectValidatorEvent, finalizeValidators} from './validators'
import {collectAnnotationCall, collectAnnotationEvent, finalizeAnnotations, seedGenesisVesting} from './annotations'
import {collectMultisigCall, collectMultisigEvent, finalizeMultisig} from './multisig'
import {collectBountyCall, collectBountyEvent, finalizeBounties} from './bounties'
import {accumulateDay, finalizeStats} from './stats'
import {readTracks} from './tracks'

const RPC_ENDPOINT = process.env.RPC_ENDPOINT
if (!RPC_ENDPOINT) throw new Error('RPC_ENDPOINT is not set')

const ZERO_H256 = '0x' + '00'.repeat(32)
const OBJECT_FETCH_CONCURRENCY = 8

const rpc = new RpcClient({url: RPC_ENDPOINT})

const processor = new SubstrateBatchProcessor()
    .setRpcEndpoint(RPC_ENDPOINT)
    .setBlockRange({from: 0})
    .includeAllBlocks()
    .addEvent({extrinsic: true, call: true, stack: true})
    .addCall({extrinsic: true})
    .setFields({
        block: {timestamp: true, digest: true},
        extrinsic: {hash: true, fee: true, tip: true, success: true, error: true, signature: true},
        call: {name: true, args: true, success: true, origin: true},
        event: {name: true, args: true, phase: true},
    })

type Fields = SubstrateBatchProcessorFields<typeof processor>
type Ctx = DataHandlerContext<Store, Fields>

let tracksSpec = -1
let chainProps: {name: string; symbol: string; decimals: number; ss58: number} | undefined

processor.run(new TypeormDatabase({supportHotBlocks: true}), async ctx => {
    if (ctx.blocks.length === 0) return
    // the tracks live in the runtime, so a spec bump is the only thing that
    // can move them
    const spec = ctx.blocks[0].header.specVersion
    if (spec !== tracksSpec) {
        await ctx.store.upsert(readTracks(ctx.blocks[0].header))
        tracksSpec = spec
    }
    const finalizedHeight = await fetchFinalizedHeight()
    const batch = new BatchData()
    const lastHeader = ctx.blocks[ctx.blocks.length - 1].header
    for (const b of ctx.blocks) await mapBlock(batch, b, finalizedHeight)
    if (ctx.blocks[0].header.height === 0) await seedGenesisVesting(batch, ctx.blocks[0].header)
    await fetchObjects(ctx, batch, lastHeader)
    await finalizeTokens(ctx, batch)
    await finalizeGovernance(ctx, batch, lastHeader, rpc)
    await finalizeMultisig(batch, lastHeader, ctx.store)
    await finalizeBounties(batch, lastHeader, ctx.store)
    await finalizeValidators(ctx, batch, lastHeader)
    await finalizeAccounts(ctx, batch, lastHeader)
    // after the merge so the newly created accounts are known
    await finalizeStats(ctx, batch, lastHeader)
    // runs after the account merge so annotations land on the persisted entities
    await finalizeAnnotations(batch, lastHeader, ctx.store)
    await persist(ctx, batch)
    await markFinalized(ctx, finalizedHeight)
    await refreshChainInfo(ctx, lastHeader, finalizedHeight)
})

async function mapBlock(batch: BatchData, b: BlockData<Fields>, finalizedHeight: number): Promise<void> {
    const h = b.header
    const engine = constants.poscan.engine.v100
    if (!engine.is(h)) throw new Error(`unhandled Poscan.Engine shape at block ${h.height}`)
    const {author, seal} = parsePowDigest(
        h.digest?.logs ?? [],
        Buffer.from(engine.get(h).slice(2), 'hex')
    )
    if (h.height > 0 && !seal) throw new Error(`block ${h.height} has no pow seal`)
    const block = new Block({
        id: h.id,
        height: h.height,
        hash: h.hash,
        parentHash: h.parentHash,
        timestamp: new Date(h.timestamp ?? 0),
        specVersion: h.specVersion,
        author: author ? batch.touch(author, h.height) : undefined,
        difficulty: await currentDifficulty(h),
        reward: 0n,
        nonce: seal?.nonce ?? ZERO_H256,
        workHash: seal?.work ?? ZERO_H256,
        finalized: h.height <= finalizedHeight,
        extrinsicCount: b.extrinsics.length,
        eventCount: b.events.length,
        logs: h.digest?.logs ?? [],
    })
    batch.blocks.push(block)
    const transfersBefore = batch.transfers.length
    const evmBefore = batch.evmTxs.length
    for (const ext of b.extrinsics) mapExtrinsic(batch, block, ext)
    mapCalls(batch, block, b.calls)
    for (const call of b.calls) {
        if (!call.success) continue
        const origin = originOf(call)
        if (origin == null) continue
        if (call.name.startsWith('Identity.') || call.name.startsWith('Proxy.')) collectAnnotationCall(batch, call.name, call.args, origin, h.height)
        else if (call.name.startsWith('Multisig.') && call.extrinsic != null) collectMultisigCall(batch, call.name, call.args, origin, call.extrinsic.id)
        else if (call.name.startsWith('ChildBounties.')) collectBountyCall(batch, call.name, call.args, h.height)
    }
    for (const ev of b.events) mapEvent(batch, block, ev, author)
    await mapEvm(batch, b, block)
    let transferVolume = 0n
    for (let i = transfersBefore; i < batch.transfers.length; i++) transferVolume += batch.transfers[i].amount
    let fees = 0n
    let signed = 0
    for (const ext of b.extrinsics) {
        if (ext.signature != null) {
            signed += 1
            fees += ext.fee ?? 0n
        }
    }
    accumulateDay(batch, block, {
        extrinsicsSigned: signed,
        transfers: batch.transfers.length - transfersBefore,
        transferVolume,
        evmTxs: batch.evmTxs.length - evmBefore,
        fees,
        referendaNew: b.events.reduce((n, ev) => n + (ev.name === 'Referenda.Submitted' ? 1 : 0), 0),
    })
}

async function mapEvm(batch: BatchData, b: BlockData<Fields>, block: Block): Promise<void> {
    const transacts = b.extrinsics.filter(x => x.call?.name === 'Ethereum.transact')
    if (transacts.length === 0) return
    const h = b.header
    const receiptsStore = storage.ethereum.currentReceipts.v100
    const baseFeeStore = storage.baseFee.baseFeePerGas.v100
    const facadeConst = constants.precompiles.balancesErc20.v100
    if (!receiptsStore.is(h) || !baseFeeStore.is(h) || !facadeConst.is(h)) {
        throw new Error(`unhandled spec version at block ${h.height}`)
    }
    const receipts = (await receiptsStore.get(h)) ?? []
    const baseFee = (await baseFeeStore.get(h)) ?? 0n
    const nativeFacade = facadeConst.get(h)
    if (receipts.length !== transacts.length) {
        throw new Error(`receipt count ${receipts.length} does not match evm tx count ${transacts.length} at block ${h.height}`)
    }
    const logsByExt = new Map<number, EventData<Fields>[]>()
    for (const ev of b.events) {
        if (ev.name === 'EVM.Log' && ev.extrinsicIndex != null) {
            let arr = logsByExt.get(ev.extrinsicIndex)
            if (arr == null) logsByExt.set(ev.extrinsicIndex, (arr = []))
            arr.push(ev)
        }
    }
    let prevGas = 0n
    let blockLogIndex = 0
    for (let txIndex = 0; txIndex < transacts.length; txIndex++) {
        const ext = transacts[txIndex]
        const executed = b.events.find(ev => ev.extrinsicIndex === ext.index && ev.name === 'Ethereum.Executed')
        if (executed == null) throw new Error(`Ethereum.transact without Executed event at block ${h.height}`)
        const decoded = decodeEvmTx(ext.call!.args, executed.args, baseFee)
        // frontier receipts carry cumulative gas following eth receipt semantics
        const cumGas = receipts[txIndex].value.usedGas
        const gasUsed = cumGas - prevGas
        prevGas = cumGas
        const extrinsic = batch.extrinsicById.get(ext.id)!
        // canonical home of the tx payload is EvmTransaction, keep the call row lean
        batch.callById.get(ext.call!.id)!.args = undefined
        batch.touch(evmMappedAccount(decoded.from), h.height).evmAddress = decoded.from
        const evmTx = new EvmTransaction({
            id: decoded.hash,
            extrinsic,
            block,
            txIndex,
            from: decoded.from,
            to: decoded.to,
            contractAddress: decoded.contractAddress,
            value: decoded.value,
            input: Buffer.from(decoded.input.slice(2), 'hex'),
            inputSelector: decoded.input.length >= 10 ? decoded.input.slice(0, 10) : undefined,
            nonce: decoded.nonce,
            gasLimit: decoded.gasLimit,
            gasUsed,
            gasPrice: decoded.gasPrice,
            txType: decoded.txType,
            status: decoded.status,
            statusReason: decoded.statusReason || undefined,
            timestamp: block.timestamp,
        })
        batch.evmTxs.push(evmTx)
        for (const logEv of logsByExt.get(ext.index) ?? []) {
            const log = decodeLog(logEv.args)
            const logId = `${decoded.hash}-${String(blockLogIndex).padStart(4, '0')}`
            batch.evmLogs.push(
                new EvmLog({
                    id: logId,
                    transaction: evmTx,
                    block,
                    logIndex: blockLogIndex,
                    address: log.address,
                    topic0: log.topics[0],
                    topics: log.topics,
                    data: Buffer.from(log.data.slice(2), 'hex'),
                })
            )
            const t = asErc20Transfer(log, nativeFacade)
            if (t != null) batch.erc20Queue.push({...t, id: logId, tx: evmTx, block, timestamp: block.timestamp})
            blockLogIndex++
        }
    }
}

async function finalizeTokens(ctx: Ctx, batch: BatchData): Promise<void> {
    if (batch.erc20Queue.length === 0) return
    const tokenIds = [...new Set(batch.erc20Queue.map(q => q.token))]
    const tokens = new Map((await ctx.store.findBy(Token, {id: In(tokenIds)})).map(t => [t.id, t]))
    const deploys = await deployBlocks(ctx, batch, tokenIds.filter(id => !tokens.has(id)))
    const holderIds = new Set<string>()
    for (const q of batch.erc20Queue) {
        if (q.from !== ZERO_ADDRESS) holderIds.add(`${q.token}-${q.from}`)
        if (q.to !== ZERO_ADDRESS) holderIds.add(`${q.token}-${q.to}`)
    }
    const holders = new Map(
        (
            await ctx.store.find(TokenHolder, {
                where: {id: In([...holderIds])},
                relations: {token: true},
            })
        ).map(x => [x.id, x])
    )
    for (const q of batch.erc20Queue) {
        let token = tokens.get(q.token)
        if (token == null) {
            const meta = await fetchErc20Metadata(rpc, q.token)
            token = new Token({
                id: q.token,
                name: meta.name,
                symbol: meta.symbol,
                decimals: meta.decimals,
                totalSupply: 0n,
                holderCount: 0,
                transferCount: 0,
                deployBlock: deploys.get(q.token),
                firstBlock: q.block.height,
            })
            tokens.set(q.token, token)
        }
        token.transferCount += 1
        if (q.from === ZERO_ADDRESS) token.totalSupply += q.amount
        if (q.to === ZERO_ADDRESS) token.totalSupply -= q.amount
        adjustHolder(holders, token, q.from, -q.amount)
        adjustHolder(holders, token, q.to, q.amount)
        batch.tokenTransfers.push(
            new TokenTransfer({
                id: q.id,
                token,
                from: q.from,
                to: q.to,
                amount: q.amount,
                transaction: q.tx,
                block: q.block,
                timestamp: q.timestamp,
            })
        )
    }
    batch.tokens = [...tokens.values()]
    batch.holders = [...holders.values()]
}

// a create tx names the contract it made, but a token only surfaces at its
// first transfer, which can be many batches later or in this very batch
async function deployBlocks(ctx: Ctx, batch: BatchData, ids: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>()
    if (ids.length === 0) return out
    const want = new Set(ids)
    for (const tx of batch.evmTxs) {
        if (tx.contractAddress != null && want.has(tx.contractAddress)) out.set(tx.contractAddress, tx.block.height)
    }
    for (const tx of await ctx.store.find(EvmTransaction, {where: {contractAddress: In(ids)}, relations: {block: true}})) {
        if (tx.contractAddress != null) out.set(tx.contractAddress, tx.block.height)
    }
    return out
}

function adjustHolder(holders: Map<string, TokenHolder>, token: Token, addr: string, delta: bigint): void {
    if (addr === ZERO_ADDRESS) return
    const id = `${token.id}-${addr}`
    let holder = holders.get(id)
    if (holder == null) {
        holder = new TokenHolder({id, token, address: addr, balance: 0n})
        holders.set(id, holder)
    }
    const before = holder.balance
    holder.balance += delta
    if (before === 0n && holder.balance > 0n) token.holderCount += 1
    if (before > 0n && holder.balance === 0n) token.holderCount -= 1
}

function mapExtrinsic(batch: BatchData, block: Block, ext: ExtrinsicData<Fields>): void {
    const [pallet, method] = splitName(ext.call?.name)
    const signer = signerOf(ext)
    const e = new Extrinsic({
        id: ext.id,
        block,
        indexInBlock: ext.index,
        hash: ext.hash ?? ZERO_H256,
        pallet,
        method,
        signer: signer ? batch.touch(signer, block.height) : undefined,
        success: ext.success ?? true,
        error: ext.error != null ? toJSON(ext.error) : undefined,
        fee: ext.fee,
        tip: ext.tip,
    })
    batch.extrinsics.push(e)
    batch.extrinsicById.set(e.id, e)
    const kind = `${pallet}.${method}`
    if (!batch.callKinds.has(kind)) batch.callKinds.set(kind, new CallKind({id: kind, pallet, method}))
}

// the whole tree, so what a batch or a proxy wraps is a row of its own rather
// than a shape somebody has to dig out of the root call args
function mapCalls(batch: BatchData, block: Block, calls: CallData<Fields>[]): void {
    for (const call of calls) {
        const extrinsic = call.extrinsic != null ? batch.extrinsicById.get(call.extrinsic.id) : undefined
        if (extrinsic == null) throw new Error(`call ${call.id} belongs to no extrinsic`)
        const [pallet, method] = splitName(call.name)
        const origin = originOf(call)
        const c = new Call({
            id: call.id,
            extrinsic,
            block,
            address: call.address,
            pallet,
            method,
            args: toJSON(call.args),
            success: call.success ?? true,
            origin: origin ? batch.touch(origin, block.height) : undefined,
        })
        batch.calls.push(c)
        batch.callById.set(c.id, c)
    }
    for (const call of calls) {
        if (call.parentCall != null) batch.callById.get(call.id)!.parent = batch.callById.get(call.parentCall.id)
    }
}

function mapEvent(batch: BatchData, block: Block, ev: EventData<Fields>, author: string | undefined): void {
    const [pallet, method] = splitName(ev.name)
    const extrinsic = ev.extrinsic != null ? batch.extrinsicById.get(ev.extrinsic.id) : undefined
    const call = ev.call != null ? batch.callById.get(ev.call.id) : undefined
    batch.events.push(
        new Event({
            id: ev.id,
            block,
            extrinsic,
            call,
            indexInBlock: ev.index,
            phase: ev.phase ?? 'ApplyExtrinsic',
            pallet,
            method,
            args: toJSON(ev.args),
        })
    )
    if (events.balances.transfer.v100.is(ev)) {
        const t = events.balances.transfer.v100.decode(ev)
        batch.transfers.push(
            new Transfer({
                id: ev.id,
                block,
                extrinsic,
                call,
                from: batch.touch(t.from, block.height),
                to: batch.touch(t.to, block.height),
                amount: t.amount,
                timestamp: block.timestamp,
            })
        )
    }
    if (ev.phase === 'Finalization' && author && events.balances.deposit.v100.is(ev)) {
        const d = events.balances.deposit.v100.decode(ev)
        if (d.who === author) block.reward += d.amount
    }
    const name = ev.name ?? ''
    collectGovEvent(batch, name, ev.args, block.height, signerOf(ev.extrinsic), ev.call?.args)
    collectValidatorEvent(batch, name, ev.args, block.height)
    collectAnnotationEvent(batch, ev.id, name, ev.args, block.height, block.timestamp, ev)
    collectMultisigEvent(batch, name, ev.args, block.height, extrinsic != null ? {id: extrinsic.id, indexInBlock: extrinsic.indexInBlock} : undefined)
    collectBountyEvent(batch, name, ev.args, block.height, signerOf(ev.extrinsic))
}

let topologyCache: MeshTopology | undefined

async function fetchObjects(ctx: Ctx, batch: BatchData, header: RuntimeCtx): Promise<void> {
    const published = constants.poscan.protocol.v100
    if (!published.is(header)) throw new Error('unhandled Poscan.Protocol shape')
    // the runtime carries the domain separation prefix as raw bytes
    const PROTOCOL = Buffer.from(published.get(header).slice(2), 'hex').toString('utf8')
    const targets = batch.blocks.filter(b => b.height > 0)
    const meshes = await mapLimit(targets, OBJECT_FETCH_CONCURRENCY, async b => parseMesh(await fetchObj(rpc, b.hash)))
    topologyCache ??= await ctx.store.get(MeshTopology, PROTOCOL)
    for (let i = 0; i < targets.length; i++) {
        const m = meshes[i]
        if (topologyCache == null) {
            topologyCache = new MeshTopology({id: PROTOCOL, faces: m.facesGz, faceCount: m.faceCount})
            await ctx.store.upsert(topologyCache)
        }
        if (m.faceCount !== topologyCache.faceCount) {
            throw new Error(`mesh topology drifted at block ${targets[i].height}, expected ${topologyCache.faceCount} faces got ${m.faceCount}`)
        }
        batch.objects.push(
            new MinedObject({
                id: targets[i].id,
                block: targets[i],
                protocol: PROTOCOL,
                vertices: m.verticesGz,
                vertexCount: m.vertexCount,
            })
        )
    }
}

async function finalizeAccounts(ctx: Ctx, batch: BatchData, last: BlockHeader<Fields>): Promise<void> {
    const ids = [...batch.accounts.keys()]
    if (ids.length === 0) return
    const existing = await ctx.store.findBy(Account, {id: In(ids)})
    const known = new Set(existing.map(e => e.id))
    for (const id of ids) if (!known.has(id)) batch.newAccounts.add(id)
    for (const e of existing) {
        const draft = batch.accounts.get(e.id)!
        e.lastActiveBlock = draft.lastActiveBlock
        if (draft.evmAddress != null) e.evmAddress = draft.evmAddress
        batch.accounts.set(e.id, e)
    }
    const s = storage.system.account.v100
    if (!s.is(last)) throw new Error(`unhandled spec version at block ${last.height}`)
    const locksStore = storage.balances.locks.v100
    const holdsStore = storage.balances.holds.v100
    const subsStore = storage.identity.subsOf.v100
    const proxyStore = storage.proxy.proxies.v100
    const announceStore = storage.proxy.announcements.v100
    if (!locksStore.is(last) || !holdsStore.is(last) || !subsStore.is(last) || !proxyStore.is(last) || !announceStore.is(last)) {
        throw new Error(`unhandled spec version at block ${last.height}`)
    }
    const [infos, locks, holds, subs, proxies, announcements] = await Promise.all([
        s.getMany(last, ids),
        locksStore.getMany(last, ids),
        holdsStore.getMany(last, ids),
        subsStore.getMany(last, ids),
        proxyStore.getMany(last, ids),
        announceStore.getMany(last, ids),
    ])
    ids.forEach((id, i) => {
        const a = batch.accounts.get(id)!
        const info = infos[i]
        a.nonce = info?.nonce ?? 0
        a.free = info?.data.free ?? 0n
        a.reserved = info?.data.reserved ?? 0n
        a.frozen = info?.data.frozen ?? 0n
        a.locksJson = (locks[i] ?? []).map(l => ({id: lockId(l.id), amount: l.amount.toString(), reasons: l.reasons.__kind}))
        a.holdsJson = (holds[i] ?? []).map(h => ({id: h.id.__kind, amount: h.amount.toString()}))
        a.depositsJson = deposits([
            ['subs', subs[i]?.[0]],
            ['proxy', proxies[i]?.[1]],
            ['announcement', announcements[i]?.[1]],
        ])
    })
    await addUsernameDeposits(batch, last, ids)
}

// a pallet that reserves instead of holding leaves no reason on the balance, so
// every amount here is read back from the state it paid for
function deposits(found: [string, bigint | undefined][]): {id: string; amount: string}[] {
    return found.filter(([, amount]) => amount != null && amount > 0n).map(([id, amount]) => ({id, amount: amount!.toString()}))
}

/**
 * A username authority pays out of its own pocket per name it grants, and the
 * chain files those deposits under the names rather than under the authority,
 * so the only way to total one up is to walk them.
 */
async function addUsernameDeposits(batch: BatchData, last: BlockHeader<Fields>, ids: string[]): Promise<void> {
    const authorityStore = storage.identity.authorityOf.v100
    const infoStore = storage.identity.usernameInfoOf.v100
    if (!authorityStore.is(last) || !infoStore.is(last)) throw new Error(`unhandled spec version at block ${last.height}`)
    const wanted = new Set(ids)
    const authorities: {suffix: string; account: string}[] = []
    for (const [suffix, props] of await authorityStore.getPairs(last)) {
        if (props != null && wanted.has(props.accountId)) authorities.push({suffix: suffix.slice(2), account: props.accountId})
    }
    if (authorities.length === 0) return
    const owed = new Map<string, bigint>()
    for (const [name, info] of await infoStore.getPairs(last)) {
        const provider = info?.provider
        if (provider?.__kind !== 'AuthorityDeposit') continue
        // a name ends in a dot followed by the suffix its authority registered
        const owner = authorities.find(a => name.endsWith(`2e${a.suffix}`))?.account
        if (owner == null) continue
        owed.set(owner, (owed.get(owner) ?? 0n) + provider.value)
    }
    for (const [id, amount] of owed) {
        const a = batch.accounts.get(id)!
        a.depositsJson = [...(a.depositsJson as {id: string; amount: string}[]), {id: 'username', amount: amount.toString()}]
    }
}

// a lock identifier is eight ascii bytes chosen by the pallet that set it
function lockId(hex: string): string {
    return Buffer.from(hex.slice(2), 'hex').toString('utf8').replace(/\0/g, '').trim()
}

async function persist(ctx: Ctx, batch: BatchData): Promise<void> {
    await ctx.store.upsert([...batch.accounts.values()])
    await ctx.store.insert(batch.blocks)
    await ctx.store.insert(batch.extrinsics)
    // a subcall points at its parent, so the shallow rows have to land first
    batch.calls.sort((a, b) => a.address.length - b.address.length)
    await ctx.store.insert(batch.calls)
    await ctx.store.upsert([...batch.callKinds.values()])
    await ctx.store.insert(batch.events)
    await ctx.store.insert(batch.transfers)
    await ctx.store.insert(batch.objects)
    await ctx.store.upsert(batch.tokens)
    await ctx.store.insert(batch.evmTxs)
    await ctx.store.insert(batch.evmLogs)
    await ctx.store.insert(batch.tokenTransfers)
    await ctx.store.upsert(batch.holders)
    await ctx.store.upsert([...batch.referenda.values()])
    await ctx.store.upsert([...batch.votes.values()])
    await ctx.store.upsert([...batch.spends.values()])
    await ctx.store.upsert([...batch.validators.values()])
    await ctx.store.upsert(batch.days)
    await ctx.store.upsert(batch.minerDays)
    if (batch.prime != null) await ctx.store.upsert(batch.prime)
    await ctx.store.upsert(batch.delegations)
    if (batch.delegationRemovals.length > 0) await ctx.store.remove(Delegation, batch.delegationRemovals)
    await ctx.store.upsert([...batch.msigOps.values()])
    await ctx.store.upsert(batch.proxyRelations)
    await ctx.store.upsert(batch.registrars)
    await ctx.store.upsert(batch.judgements)
    if (batch.proxyRemovals.length > 0) await ctx.store.remove(ProxyRelation, batch.proxyRemovals)
    await ctx.store.upsert([...batch.bounties.values()])
    await ctx.store.upsert([...batch.childBounties.values()])
}

async function markFinalized(ctx: Ctx, finalizedHeight: number): Promise<void> {
    const stale = await ctx.store.find(Block, {where: {finalized: false, height: LessThanOrEqual(finalizedHeight)}})
    if (stale.length === 0) return
    for (const b of stale) b.finalized = true
    await ctx.store.upsert(stale)
}

async function fetchFinalizedHeight(): Promise<number> {
    const hash: string = await rpc.call('chain_getFinalizedHead', [])
    const header: {number: string} = await rpc.call('chain_getHeader', [hash])
    return parseInt(header.number, 16)
}

// the explorer never talks to a node, so what it needs from one lands here
async function refreshChainInfo(ctx: Ctx, h: BlockHeader<Fields>, finalizedHeight: number): Promise<void> {
    if (!chainProps) {
        const [props, name] = await Promise.all([
            rpc.call('system_properties', []) as Promise<{ss58Format: number; tokenDecimals: number; tokenSymbol: string}>,
            rpc.call('system_chain', []) as Promise<string>,
        ])
        chainProps = {name, symbol: props.tokenSymbol, decimals: props.tokenDecimals, ss58: props.ss58Format}
    }
    const blockTime = constants.difficulty.targetBlockTime.v100
    const ed = constants.balances.existentialDeposit.v100
    const sessionPeriod = constants.validator.sessionPeriod.v100
    const sessionOffset = constants.validator.sessionOffset.v100
    const chainIdStore = storage.evmChainId.chainId.v100
    if (!blockTime.is(h) || !ed.is(h) || !sessionPeriod.is(h) || !sessionOffset.is(h) || !chainIdStore.is(h)) {
        throw new Error(`unhandled spec version at block ${h.height}`)
    }
    const head: {number: string} = await rpc.call('chain_getHeader', [])
    await ctx.store.upsert(
        new ChainInfo({
            id: 'chain',
            ...chainProps,
            blockTime: Number(blockTime.get(h)),
            existentialDeposit: ed.get(h),
            evmChainId: Number((await chainIdStore.get(h)) ?? chainIdStore.getDefault(h)),
            sessionLength: sessionPeriod.get(h),
            sessionOffset: sessionOffset.get(h),
            head: parseInt(head.number, 16),
            finalizedHead: finalizedHeight,
        })
    )
}

async function currentDifficulty(h: BlockHeader<Fields>): Promise<bigint> {
    const s = storage.difficulty.currentDifficulty.v100
    if (!s.is(h)) throw new Error(`unhandled spec version at block ${h.height}`)
    return (await s.get(h)) ?? s.getDefault(h)
}

function signerOf(ext: ExtrinsicData<Fields> | undefined): string | undefined {
    if (ext == null) return undefined
    const addr = ext.signature?.address as any
    if (typeof addr === 'string') return addr
    if (addr?.__kind === 'Id') return addr.value as string
    return undefined
}

// who a nested call really dispatches as, which proxy and multisig move away
// from the signer. as_derivative and as_multi_threshold_1 leave it unresolved
// upstream, dropping those is better than crediting the wrong account
function originOf(call: CallData<Fields>): string | undefined {
    const o = call.origin as any
    return o?.__kind === 'system' && o.value?.__kind === 'Signed' ? (o.value.value as string) : undefined
}

function splitName(name: string | undefined): [string, string] {
    if (!name) throw new Error('missing qualified name')
    const dot = name.indexOf('.')
    return [name.slice(0, dot), name.slice(dot + 1)]
}
