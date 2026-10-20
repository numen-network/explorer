import {In} from 'typeorm'
import {Account, Token, TokenTransferPair, TransferPair} from './model'
import {BatchData, PairDelta} from './batch'
import {ZERO_ADDRESS} from './evm'

// a transfer lands on both sides, out on the sender's row and in on the
// receiver's, so a transfer to oneself lands on one row both ways
export function bookPair(deltas: Map<string, PairDelta>, scope: string, from: string, to: string, amount: bigint, height: number): void {
    const out = side(deltas, scope, from, to, height)
    out.amountOut += amount
    out.countOut += 1
    const into = side(deltas, scope, to, from, height)
    into.amountIn += amount
    into.countIn += 1
    into.firstInBlock ??= height
}

function side(deltas: Map<string, PairDelta>, scope: string, owner: string, counterparty: string, height: number): PairDelta {
    const id = `${scope}${owner}-${counterparty}`
    let d = deltas.get(id)
    if (d == null) {
        d = {owner, counterparty, amountIn: 0n, countIn: 0, amountOut: 0n, countOut: 0, firstBlock: height, lastBlock: height, firstInBlock: null}
        deltas.set(id, d)
    }
    d.firstBlock = Math.min(d.firstBlock, height)
    d.lastBlock = Math.max(d.lastBlock, height)
    return d
}

function merge(row: TransferPair | TokenTransferPair, d: PairDelta): void {
    row.amountIn += d.amountIn
    row.countIn += d.countIn
    row.amountOut += d.amountOut
    row.countOut += d.countOut
    row.firstBlock = Math.min(row.firstBlock, d.firstBlock)
    row.lastBlock = Math.max(row.lastBlock, d.lastBlock)
}

const EMPTY = {amountIn: 0n, countIn: 0, amountOut: 0n, countOut: 0}

// runs after the account merge, which swaps the drafts for the stored rows
export async function finalizeTransferPairs(ctx: {store: any}, batch: BatchData): Promise<void> {
    if (batch.transferPairDeltas.size === 0) return
    const stored = new Map<string, TransferPair>((await ctx.store.findBy(TransferPair, {id: In([...batch.transferPairDeltas.keys()])})).map((r: TransferPair) => [r.id, r]))
    for (const [id, d] of batch.transferPairDeltas) {
        const row = stored.get(id) ?? new TransferPair({id, ...EMPTY, firstBlock: d.firstBlock, lastBlock: d.lastBlock})
        row.account = new Account({id: d.owner})
        row.counterparty = new Account({id: d.counterparty})
        merge(row, d)
        const a = batch.accounts.get(d.owner)!
        a.transferInVolume += d.amountIn
        a.transferOutVolume += d.amountOut
        batch.transferPairs.push(row)
    }
}

// runs after the holders are read, every party but the zero address has one
export async function finalizeTokenTransferPairs(ctx: {store: any}, batch: BatchData): Promise<void> {
    if (batch.tokenPairDeltas.size === 0) return
    const stored = new Map<string, TokenTransferPair>((await ctx.store.findBy(TokenTransferPair, {id: In([...batch.tokenPairDeltas.keys()])})).map((r: TokenTransferPair) => [r.id, r]))
    const holders = new Map(batch.holders.map(h => [h.id, h]))
    for (const [id, d] of batch.tokenPairDeltas) {
        const token = id.split('-')[0]
        const row = stored.get(id) ?? new TokenTransferPair({id, address: d.owner, counterparty: d.counterparty, ...EMPTY, firstBlock: d.firstBlock, lastBlock: d.lastBlock})
        row.token = new Token({id: token})
        merge(row, d)
        if (d.owner !== ZERO_ADDRESS) {
            const holder = holders.get(`${token}-${d.owner}`)!
            holder.transferInVolume += d.amountIn
            holder.transferOutVolume += d.amountOut
            holder.transferInCount += d.countIn
            holder.transferOutCount += d.countOut
            if (d.firstInBlock != null) holder.firstInBlock = Math.min(holder.firstInBlock ?? d.firstInBlock, d.firstInBlock)
        }
        batch.tokenTransferPairs.push(row)
    }
}
