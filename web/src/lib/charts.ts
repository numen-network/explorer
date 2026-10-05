import {fmtInt, fmtPct, planckToNum, truncFixed} from './format'
import type {DailyRow} from './gql'

export interface ChartInput {
    days: DailyRow[]
    decimals: number
    symbol: string
}

// a day's value as the exact quotient num / den. the tooltip and the highlight
// print from it, only the plotted point is a float
export type Ratio = [num: bigint, den: bigint]

export interface ChartDef {
    slug: string
    group: string
    title: string
    about: string
    kind: 'line' | 'bar'
    // names the series in the tooltip and the legend
    unit: string
    values: (input: ChartInput) => Ratio[]
    plot: (v: Ratio, input: ChartInput) => number
    format: (v: Ratio, input: ChartInput) => string
}

type Reading = Pick<ChartDef, 'values' | 'plot' | 'format'>

const ratioToNum = ([num, den]: Ratio) => Number(num) / Number(den)

const count = (pick: (d: DailyRow) => number | string): Reading => ({
    values: ({days}) => days.map(d => [BigInt(pick(d)), 1n]),
    plot: ratioToNum,
    format: ([n]) => fmtInt(n),
})

// an amount is its planck over the planck in one coin
const amount = (pick: (d: DailyRow) => bigint | string): Reading => ({
    values: ({days, decimals}) => days.map(d => [BigInt(pick(d)), 10n ** BigInt(decimals)]),
    plot: ([planck], {decimals}) => planckToNum(planck, decimals),
    format: ([planck, coin], {decimals, symbol}) => `${fmtInt(truncFixed(planck, planck < 1000n * coin ? 2 : 0, decimals))} ${symbol}`,
})

const blockTime: Reading = {
    values: ({days}) => days.map(d => (d.blocks > 1 ? [BigInt(Date.parse(d.tsLast) - Date.parse(d.tsFirst)), BigInt((d.blocks - 1) * 1000)] : [0n, 1n])),
    plot: ratioToNum,
    format: ([num, den]) => truncFixed((num * 100n) / den, 2, 2),
}

export const CHARTS: ChartDef[] = [
    {
        slug: 'blocks',
        group: 'Network',
        title: 'Blocks Produced',
        about: 'Blocks sealed each day. A day short of the target count means the network spent time above its difficulty.',
        kind: 'bar',
        unit: 'Blocks',
        ...count(d => d.blocks),
    },
    {
        slug: 'block-time',
        group: 'Network',
        title: 'Average Block Time',
        about: 'Mean seconds between blocks, measured across the day rather than smoothed. Proof of work spaces blocks randomly, so single days wander around the target.',
        kind: 'line',
        unit: 'Seconds',
        ...blockTime,
    },
    {
        slug: 'difficulty',
        group: 'Network',
        title: 'Difficulty',
        about: 'Difficulty at the last block of each day. It tracks how much scanning work the network is throwing at the chain.',
        kind: 'line',
        unit: 'Difficulty',
        ...count(d => d.difficultyClose),
    },
    {
        slug: 'miners',
        group: 'Network',
        title: 'Active Miners',
        about: 'Accounts that sealed at least one block that day.',
        kind: 'line',
        unit: 'Miners',
        ...count(d => d.minersActive),
    },
    {
        slug: 'block-rewards',
        group: 'Network',
        title: 'Block Rewards',
        about: 'Newly issued coins paid to miners each day. The reward pallet keeps no events, so this is the deposit into the author at finalization.',
        kind: 'line',
        unit: 'Rewards',
        ...amount(d => d.rewards),
    },
    {
        slug: 'extrinsics',
        group: 'Transactions',
        title: 'Signed Extrinsics',
        about: 'Extrinsics carrying a signature, so the inherents every block must include are left out.',
        kind: 'bar',
        unit: 'Extrinsics',
        ...count(d => d.extrinsicsSigned),
    },
    {
        slug: 'extrinsics-total',
        group: 'Transactions',
        title: 'Total Signed Extrinsics',
        about: 'Running total of signed extrinsics since genesis.',
        kind: 'line',
        unit: 'Extrinsics',
        ...count(d => d.cumExtrinsicsSigned),
    },
    {
        slug: 'evm-transactions',
        group: 'Transactions',
        title: 'EVM Transactions',
        about: 'Ethereum transactions executed through the EVM each day. They ride inside an extrinsic, so they also count once in the signed extrinsic chart.',
        kind: 'bar',
        unit: 'Transactions',
        ...count(d => d.evmTxs),
    },
    {
        slug: 'fees',
        group: 'Transactions',
        title: 'Transaction Fees',
        about: 'Fees paid each day, tips and EVM gas included.',
        kind: 'line',
        unit: 'Fees',
        ...amount(d => d.fees),
    },
    {
        slug: 'transfers',
        group: 'Transfers',
        title: 'Transfers',
        about: 'Native coin transfers each day. Transfers made inside a batch are counted individually.',
        kind: 'bar',
        unit: 'Transfers',
        ...count(d => d.transfers),
    },
    {
        slug: 'transfers-total',
        group: 'Transfers',
        title: 'Total Transfers',
        about: 'Running total of native transfers since genesis.',
        kind: 'line',
        unit: 'Transfers',
        ...count(d => d.cumTransfers),
    },
    {
        slug: 'transfer-volume',
        group: 'Transfers',
        title: 'Transfer Volume',
        about: 'Value moved by native transfers each day.',
        kind: 'line',
        unit: 'Volume',
        ...amount(d => d.transferVolume),
    },
    {
        slug: 'transfer-volume-total',
        group: 'Transfers',
        title: 'Total Transfer Volume',
        about: 'Running total of transferred value since genesis.',
        kind: 'line',
        unit: 'Volume',
        ...amount(d => d.cumTransferVolume),
    },
    {
        slug: 'accounts',
        group: 'Accounts',
        title: 'Total Accounts',
        about: 'Accounts the chain has ever seen. An account joins the count on the day a block first touched it, and nothing removes it again.',
        kind: 'line',
        unit: 'Accounts',
        ...count(d => d.accountsTotal),
    },
    {
        slug: 'referenda',
        group: 'Governance',
        title: 'Total Referenda',
        about: 'Referenda submitted since genesis, whatever they decided.',
        kind: 'line',
        unit: 'Referenda',
        ...count(d => d.referendaTotal),
    },
    {
        slug: 'issuance',
        group: 'Supply',
        title: 'Total Issuance',
        about: 'Every coin in existence, mining rewards included.',
        kind: 'line',
        unit: 'Issuance',
        ...amount(d => d.issuanceTotal),
    },
    {
        slug: 'active-issuance',
        group: 'Supply',
        title: 'Active Issuance',
        about: 'Issuance minus the deactivated part. Governance support is measured against this number, not against total issuance.',
        kind: 'line',
        unit: 'Issuance',
        ...amount(d => BigInt(d.issuanceTotal) - BigInt(d.issuanceInactive)),
    },
    {
        slug: 'transferable-issuance',
        group: 'Supply',
        title: 'Transferable Issuance',
        about: 'Active issuance minus everything locked or reserved. Vested coins only count once claimed.',
        kind: 'line',
        unit: 'Issuance',
        ...amount(d => BigInt(d.issuanceTransferable) - BigInt(d.issuanceInactive)),
    },
    {
        slug: 'treasury',
        group: 'Supply',
        title: 'Treasury Pot',
        about: 'Balance of the treasury account. It is deactivated every block, which is why it drops out of the active issuance above.',
        kind: 'line',
        unit: 'Treasury',
        ...amount(d => d.treasuryPot),
    },
]

export const GROUPS = [...new Set(CHARTS.map(c => c.group))]

export function chartBySlug(slug: string): ChartDef | undefined {
    return CHARTS.find(c => c.slug === slug)
}

export function highlight(def: ChartDef, values: Ratio[], input: ChartInput): string | null {
    const last = values[values.length - 1]
    if (last == null) return null
    const prev = values[values.length - 2]
    const now = `The latest value of ${def.title} is ${def.format(last, input)}.`
    if (prev == null || prev[0] === 0n) return now
    // both days over the product of their denominators
    const [cur, was] = [last[0] * prev[1], prev[0] * last[1]]
    const dir = cur >= was ? 'up' : 'down'
    return `${now} Compared with the day before it is ${dir} by ${fmtPct(cur >= was ? cur - was : was - cur, was)}.`
}
