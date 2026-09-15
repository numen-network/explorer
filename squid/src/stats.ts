import {In, LessThan} from 'typeorm'
import {BatchData, DayDelta} from './batch'
import {Account, Block, DailyStat, MinerDayStat} from './model'
import {constants, storage, v100} from './types'
import type {RuntimeCtx} from './types/support'

// PalletId::into_account_truncating builds a sovereign account out of the type
// tag, the pallet id, and trailing zeros
const TYPE_ID = Buffer.from('modl').toString('hex')

// the largest page state_getKeysPaged accepts
const ACCOUNT_PAGE = 1000

const bigMax = (a: bigint, b: bigint) => (a > b ? a : b)

// how much transfer_allow_death can move, the way Balances::reducible_balance
// counts it
function transferable({consumers, providers, data: {free, reserved, frozen}}: v100.AccountInfo, ed: bigint): bigint {
    const keepsEd = free > 0n && consumers > 0 && providers <= 1
    const untouchable = bigMax(frozen - reserved, keepsEd ? ed : 0n)
    return bigMax(free - untouchable, 0n)
}

async function sumTransferable(at: DayDelta['header'], ed: bigint): Promise<bigint> {
    let sum = 0n
    for await (const page of storage.system.account.v100.getPairsPaged(ACCOUNT_PAGE, at)) {
        for (const [, info] of page) sum += transferable(info!, ed)
    }
    return sum
}

export function treasuryAccount(block: RuntimeCtx): string {
    const palletId = constants.treasury.palletId.v100
    if (!palletId.is(block)) throw new Error('unhandled Treasury.PalletId shape')
    return ('0x' + TYPE_ID + palletId.get(block).slice(2)).padEnd(66, '0')
}

export function accumulateDay(batch: BatchData, block: Block, header: RuntimeCtx, delta: Omit<DayDelta, 'tsFirst' | 'tsLast' | 'difficultyClose' | 'blocks' | 'rewards' | 'header'>): void {
    // genesis carries no timestamp, so there is no day to book it on
    if (block.height === 0) return
    const day = block.timestamp.toISOString().slice(0, 10)
    let d = batch.dayDeltas.get(day)
    if (d == null) {
        d = {
            blocks: 0,
            extrinsicsSigned: 0,
            transfers: 0,
            transferVolume: 0n,
            evmTxs: 0,
            fees: 0n,
            referendaNew: 0,
            rewards: 0n,
            tsFirst: block.timestamp,
            tsLast: block.timestamp,
            difficultyClose: block.difficulty,
            header,
        }
        batch.dayDeltas.set(day, d)
    }
    d.blocks += 1
    d.extrinsicsSigned += delta.extrinsicsSigned
    d.transfers += delta.transfers
    d.transferVolume += delta.transferVolume
    d.evmTxs += delta.evmTxs
    d.fees += delta.fees
    d.referendaNew += delta.referendaNew
    d.rewards += block.reward
    d.tsLast = block.timestamp
    d.difficultyClose = block.difficulty
    d.header = header

    if (block.author != null) {
        const minerId = `${day}-${block.author.id}`
        let m = batch.minerDayDeltas.get(minerId)
        if (m == null) {
            m = {day, account: block.author.id, blocks: 0, rewards: 0n}
            batch.minerDayDeltas.set(minerId, m)
        }
        m.blocks += 1
        m.rewards += block.reward
    }
}

export async function finalizeStats(ctx: {store: any}, batch: BatchData): Promise<void> {
    if (batch.dayDeltas.size === 0) return
    const dayIds = [...batch.dayDeltas.keys()].sort()
    const existing = new Map<string, DailyStat>(
        (await ctx.store.find(DailyStat, {where: {id: In(dayIds)}})).map((r: DailyStat) => [r.id, r])
    )
    const prior: DailyStat[] = await ctx.store.find(DailyStat, {
        where: {id: LessThan(dayIds[0])},
        order: {id: 'DESC'},
        take: 1,
    })
    let cumExtrinsicsSigned = prior[0]?.cumExtrinsicsSigned ?? 0n
    let cumTransfers = prior[0]?.cumTransfers ?? 0n
    let cumTransferVolume = prior[0]?.cumTransferVolume ?? 0n
    // before the first day row exists, accounts a genesis-only batch persisted
    // count toward it
    let accountsTotal = prior[0]?.accountsTotal ?? (await ctx.store.countBy(Account, {firstSeenBlock: 0}))
    let referendaTotal = prior[0]?.referendaTotal ?? 0

    // an account is born on the day of the block that first touched it, and
    // one genesis touched lands on the first dated day this batch holds
    const dayOfHeight = new Map(batch.blocks.filter(b => b.height > 0).map(b => [b.height, b.timestamp.toISOString().slice(0, 10)]))
    const bornOn = new Map<string, number>()
    for (const id of batch.newAccounts) {
        const day = dayOfHeight.get(batch.accounts.get(id)!.firstSeenBlock) ?? dayIds[0]
        bornOn.set(day, (bornOn.get(day) ?? 0) + 1)
    }

    // a miner joins the day's count on the batch that first sees it seal a
    // block that day
    const minerIds = [...batch.minerDayDeltas.keys()]
    const minerRows = new Map<string, MinerDayStat>(
        minerIds.length > 0 ? (await ctx.store.find(MinerDayStat, {where: {id: In(minerIds)}, relations: {account: true}})).map((r: MinerDayStat) => [r.id, r]) : []
    )
    const newMiners = new Map<string, number>()
    for (const [id, delta] of batch.minerDayDeltas) {
        if (!minerRows.has(id)) newMiners.set(delta.day, (newMiners.get(delta.day) ?? 0) + 1)
    }

    const totalIssuanceStore = storage.balances.totalIssuance.v100
    const inactiveIssuanceStore = storage.balances.inactiveIssuance.v100
    const accountStore = storage.system.account.v100
    const edConst = constants.balances.existentialDeposit.v100

    for (const day of dayIds) {
        const delta = batch.dayDeltas.get(day)!
        const at = delta.header
        if (!totalIssuanceStore.is(at) || !inactiveIssuanceStore.is(at) || !accountStore.is(at) || !edConst.is(at)) {
            throw new Error(`unhandled spec version for issuance at block ${at.height}`)
        }
        const [issuanceTotal, issuanceInactive, treasury, issuanceTransferable] = await Promise.all([
            totalIssuanceStore.get(at),
            inactiveIssuanceStore.get(at),
            accountStore.get(at, treasuryAccount(at)),
            sumTransferable(at, edConst.get(at)),
        ])
        let row = existing.get(day)
        if (row == null) {
            row = new DailyStat({
                id: day,
                date: new Date(`${day}T00:00:00Z`),
                blocks: 0,
                extrinsicsSigned: 0,
                transfers: 0,
                transferVolume: 0n,
                evmTxs: 0,
                fees: 0n,
                tsFirst: delta.tsFirst,
                tsLast: delta.tsLast,
                difficultyClose: delta.difficultyClose,
                issuanceTotal: 0n,
                issuanceInactive: 0n,
                issuanceTransferable: 0n,
                treasuryPot: 0n,
                cumExtrinsicsSigned: cumExtrinsicsSigned,
                cumTransfers: cumTransfers,
                cumTransferVolume: cumTransferVolume,
                accountsTotal: accountsTotal,
                referendaTotal: referendaTotal,
                minersActive: 0,
                rewards: 0n,
            })
        }
        row.blocks += delta.blocks
        row.extrinsicsSigned += delta.extrinsicsSigned
        row.transfers += delta.transfers
        row.transferVolume += delta.transferVolume
        row.evmTxs += delta.evmTxs
        row.fees += delta.fees
        row.tsLast = delta.tsLast
        row.difficultyClose = delta.difficultyClose
        row.cumExtrinsicsSigned = cumExtrinsicsSigned + BigInt(row.extrinsicsSigned)
        row.cumTransfers = cumTransfers + BigInt(row.transfers)
        row.cumTransferVolume = cumTransferVolume + row.transferVolume
        // a new row starts at the previous day's total, an existing one already
        // carries what earlier batches counted for the same day
        row.accountsTotal += bornOn.get(day) ?? 0
        row.referendaTotal += delta.referendaNew
        row.minersActive += newMiners.get(day) ?? 0
        row.rewards += delta.rewards
        cumExtrinsicsSigned = row.cumExtrinsicsSigned
        cumTransfers = row.cumTransfers
        cumTransferVolume = row.cumTransferVolume
        accountsTotal = row.accountsTotal
        referendaTotal = row.referendaTotal
        row.issuanceTotal = issuanceTotal ?? totalIssuanceStore.getDefault(at)
        row.issuanceInactive = issuanceInactive ?? inactiveIssuanceStore.getDefault(at)
        row.issuanceTransferable = issuanceTransferable
        row.treasuryPot = (treasury ?? accountStore.getDefault(at)).data.free
        batch.days.push(row)
    }

    for (const [id, delta] of batch.minerDayDeltas) {
        const row = minerRows.get(id) ?? new MinerDayStat({id, day: delta.day, account: new Account({id: delta.account}), blocks: 0, rewards: 0n})
        row.blocks += delta.blocks
        row.rewards += delta.rewards
        batch.minerDays.push(row)
    }
}
