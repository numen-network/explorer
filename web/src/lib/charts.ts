import {fmtInt, planckToNum} from './format'
import type {DailyRow} from './gql'

export interface MinerDay {
    day: string
    account: {id: string}
    blocks: number
    rewards: string
}

export interface ChartInput {
    days: DailyRow[]
    miners: MinerDay[]
    decimals: number
    symbol: string
}

export interface ChartDef {
    slug: string
    group: string
    title: string
    about: string
    kind: 'line' | 'bar'
    // names the series in the tooltip and the legend
    unit: string
    // set when the series needs the miner day table on top of the daily stats
    miners?: true
    values: (input: ChartInput) => number[]
    format: (v: number, input: ChartInput) => string
}

const num = (v: number) => fmtInt(Math.round(v))
const fixed = (digits: number) => (v: number) => v.toFixed(digits)
const token = (v: number, {symbol}: ChartInput) => `${fmtInt(v.toFixed(v < 1000 ? 2 : 0))} ${symbol}`

const planck = (pick: (d: DailyRow) => string) => (input: ChartInput) => input.days.map(d => planckToNum(pick(d), input.decimals))
const count = (pick: (d: DailyRow) => number) => (input: ChartInput) => input.days.map(pick)
const bigint = (pick: (d: DailyRow) => string) => (input: ChartInput) => input.days.map(d => Number(pick(d)))

// miner rows arrive one per miner per day, the day totals are folded here
// because openreader has no GROUP BY
function byDay(input: ChartInput, fold: (rows: MinerDay[]) => number): number[] {
    const groups = new Map<string, MinerDay[]>()
    for (const m of input.miners) {
        const arr = groups.get(m.day)
        if (arr) arr.push(m)
        else groups.set(m.day, [m])
    }
    return input.days.map(d => fold(groups.get(d.id) ?? []))
}

export const CHARTS: ChartDef[] = [
    {
        slug: 'blocks',
        group: 'Network',
        title: 'Blocks Produced',
        about: 'Blocks sealed each day. A day short of the target count means the network spent time above its difficulty.',
        kind: 'bar',
        unit: 'Blocks',
        values: count(d => d.blocks),
        format: num,
    },
    {
        slug: 'block-time',
        group: 'Network',
        title: 'Average Block Time',
        about: 'Mean seconds between blocks, measured across the day rather than smoothed. Proof of work spaces blocks randomly, so single days wander around the target.',
        kind: 'line',
        unit: 'Seconds',
        values: count(d => (d.blocks > 1 ? (Date.parse(d.tsLast) - Date.parse(d.tsFirst)) / 1000 / (d.blocks - 1) : 0)),
        format: fixed(2),
    },
    {
        slug: 'difficulty',
        group: 'Network',
        title: 'Difficulty',
        about: 'Difficulty at the last block of each day. It tracks how much scanning work the network is throwing at the chain.',
        kind: 'line',
        unit: 'Difficulty',
        values: bigint(d => d.difficultyClose),
        format: num,
    },
    {
        slug: 'miners',
        group: 'Network',
        title: 'Active Miners',
        about: 'Accounts that sealed at least one block that day.',
        kind: 'line',
        unit: 'Miners',
        miners: true,
        values: input => byDay(input, rows => new Set(rows.map(r => r.account.id)).size),
        format: num,
    },
    {
        slug: 'block-rewards',
        group: 'Network',
        title: 'Block Rewards',
        about: 'Newly issued coins paid to miners each day. The reward pallet keeps no events, so this is the deposit into the author at finalization.',
        kind: 'line',
        unit: 'Rewards',
        miners: true,
        values: input => byDay(input, rows => planckToNum(rows.reduce((a, r) => a + BigInt(r.rewards), 0n), input.decimals)),
        format: token,
    },
    {
        slug: 'extrinsics',
        group: 'Transactions',
        title: 'Signed Extrinsics',
        about: 'Extrinsics carrying a signature, so the inherents every block must include are left out.',
        kind: 'bar',
        unit: 'Extrinsics',
        values: count(d => d.extrinsicsSigned),
        format: num,
    },
    {
        slug: 'extrinsics-total',
        group: 'Transactions',
        title: 'Total Signed Extrinsics',
        about: 'Running total of signed extrinsics since genesis.',
        kind: 'line',
        unit: 'Extrinsics',
        values: bigint(d => d.cumExtrinsicsSigned),
        format: num,
    },
    {
        slug: 'evm-transactions',
        group: 'Transactions',
        title: 'EVM Transactions',
        about: 'Ethereum transactions executed through the EVM each day. They ride inside an extrinsic, so they also count once in the signed extrinsic chart.',
        kind: 'bar',
        unit: 'Transactions',
        values: count(d => d.evmTxs),
        format: num,
    },
    {
        slug: 'fees',
        group: 'Transactions',
        title: 'Transaction Fees',
        about: 'Fees paid by signed extrinsics each day, tips included.',
        kind: 'line',
        unit: 'Fees',
        values: planck(d => d.fees),
        format: token,
    },
    {
        slug: 'transfers',
        group: 'Transfers',
        title: 'Transfers',
        about: 'Native coin transfers each day. Transfers made inside a batch are counted individually.',
        kind: 'bar',
        unit: 'Transfers',
        values: count(d => d.transfers),
        format: num,
    },
    {
        slug: 'transfers-total',
        group: 'Transfers',
        title: 'Total Transfers',
        about: 'Running total of native transfers since genesis.',
        kind: 'line',
        unit: 'Transfers',
        values: bigint(d => d.cumTransfers),
        format: num,
    },
    {
        slug: 'transfer-volume',
        group: 'Transfers',
        title: 'Transfer Volume',
        about: 'Value moved by native transfers each day.',
        kind: 'line',
        unit: 'Volume',
        values: planck(d => d.transferVolume),
        format: token,
    },
    {
        slug: 'transfer-volume-total',
        group: 'Transfers',
        title: 'Total Transfer Volume',
        about: 'Running total of transferred value since genesis.',
        kind: 'line',
        unit: 'Volume',
        values: planck(d => d.cumTransferVolume),
        format: token,
    },
    {
        slug: 'accounts',
        group: 'Accounts',
        title: 'Total Accounts',
        about: 'Accounts the chain has ever seen. An account joins the count on the day a block first touched it, and nothing removes it again.',
        kind: 'line',
        unit: 'Accounts',
        values: count(d => d.accountsTotal),
        format: num,
    },
    {
        slug: 'referenda',
        group: 'Governance',
        title: 'Total Referenda',
        about: 'Referenda submitted since genesis, whatever they decided.',
        kind: 'line',
        unit: 'Referenda',
        values: count(d => d.referendaTotal),
        format: num,
    },
    {
        slug: 'issuance',
        group: 'Supply',
        title: 'Total Issuance',
        about: 'Every coin in existence, mining rewards included and burned fees deducted.',
        kind: 'line',
        unit: 'Issuance',
        values: planck(d => d.issuanceTotal),
        format: token,
    },
    {
        slug: 'active-issuance',
        group: 'Supply',
        title: 'Active Issuance',
        about: 'Issuance minus the deactivated part. Governance support is measured against this number, not against total issuance.',
        kind: 'line',
        unit: 'Issuance',
        values: input => input.days.map(d => planckToNum(BigInt(d.issuanceTotal) - BigInt(d.issuanceInactive), input.decimals)),
        format: token,
    },
    {
        slug: 'treasury',
        group: 'Supply',
        title: 'Treasury Pot',
        about: 'Balance of the treasury account. It is deactivated every block, which is why it drops out of the active issuance above.',
        kind: 'line',
        unit: 'Treasury',
        values: planck(d => d.treasuryPot),
        format: token,
    },
]

export const GROUPS = [...new Set(CHARTS.map(c => c.group))]

export function chartBySlug(slug: string): ChartDef | undefined {
    return CHARTS.find(c => c.slug === slug)
}

export function highlight(def: ChartDef, values: number[], input: ChartInput): string | null {
    const last = values[values.length - 1]
    if (last == null) return null
    const prev = values[values.length - 2]
    const now = `The latest value of ${def.title} is ${def.format(last, input)}.`
    if (prev == null || prev === 0) return now
    const pct = ((last - prev) / prev) * 100
    const dir = pct >= 0 ? 'up' : 'down'
    return `${now} Compared with the day before it is ${dir} by ${Math.abs(pct).toFixed(2)}%.`
}
