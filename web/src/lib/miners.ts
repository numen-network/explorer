import type {AccountRef, MinerDayRow} from './gql'

export interface MinerStat {
    id: string
    acc: AccountRef
    blocks: number
    rewards: string
}

// most blocks first, so a miner's rank is its index plus one
export function rankMiners(days: MinerDayRow[]): {miners: MinerStat[]; totalBlocks: number} {
    const byMiner = new Map<string, {acc: AccountRef; blocks: number; rewards: bigint}>()
    for (const d of days) {
        const cur = byMiner.get(d.account.id) ?? {acc: d.account, blocks: 0, rewards: 0n}
        cur.blocks += d.blocks
        cur.rewards += BigInt(d.rewards)
        byMiner.set(d.account.id, cur)
    }
    const miners = [...byMiner].map(([id, m]) => ({id, acc: m.acc, blocks: m.blocks, rewards: String(m.rewards)})).sort((a, b) => b.blocks - a.blocks)
    return {miners, totalBlocks: miners.reduce((n, m) => n + m.blocks, 0)}
}
