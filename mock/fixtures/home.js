import {BLOCK_TIME, HEAD, HEAD_TIME, numn} from '../fixtures.js'

const DAY = 86_400_000
const REWARD = 16

// a smooth swing in [-1, 1] that depends only on the day and the series, so every story draws the same curve
const swing = (day, salt) => Math.sin(day * 0.9 + salt) * 0.6 + Math.sin(day * 2.3 + salt * 3) * 0.4

// treasury payouts as [days before the newest day, amount]
const SPENDS = [
    [50, numn(120_000)],
    [12, numn(250_000)],
]

// one DailyStat per UTC day of a chain whose newest block is height head, oldest day first
export function chainDays(head = HEAD) {
    const genesis = HEAD_TIME - head * BLOCK_TIME * 1000
    const first = Math.floor(genesis / DAY) * DAY
    const count = Math.floor((HEAD_TIME - first) / DAY) + 1
    let cumBlocks = 0
    let cumExtrinsics = 0n
    let cumTransfers = 0n
    let cumVolume = 0n
    let accounts = 12
    return Array.from({length: count}, (_, d) => {
        const start = Math.max(first + d * DAY, genesis)
        const end = Math.min(first + (d + 1) * DAY, HEAD_TIME)
        const share = (end - start) / DAY
        const blocks = Math.max(1, Math.round(((end - start) / 1000 / BLOCK_TIME) * (1 - 0.03 * swing(d, 0))))
        const extrinsicsSigned = Math.round((250 + 9 * d) * (1 + 0.25 * swing(d, 2)) * share)
        const transfers = Math.round((90 + 3 * d) * (1 + 0.3 * swing(d, 3)) * share)
        const transferVolume = numn(transfers * (900 + 400 * swing(d, 4)))
        const evmTxs = Math.max(0, Math.round((8 + 0.4 * d) * (1 + 0.5 * swing(d, 5)) * share))
        const spent = SPENDS.filter(([back]) => count - 1 - d <= back).reduce((sum, [, amount]) => sum + BigInt(amount), 0n)
        const treasury = String(BigInt(numn(549_600_000 + 6_000 * d)) - spent)
        cumBlocks += blocks
        cumExtrinsics += BigInt(extrinsicsSigned)
        cumTransfers += BigInt(transfers)
        cumVolume += BigInt(transferVolume)
        accounts += Math.max(0, Math.round(14 * (1 + 0.5 * swing(d, 7)) * share))
        const issuanceTotal = numn(586_500_000 + REWARD * cumBlocks)
        const date = new Date(first + d * DAY).toISOString()
        return {
            id: date.slice(0, 10),
            date,
            blocks,
            extrinsicsSigned,
            transfers,
            transferVolume,
            evmTxs,
            fees: numn(extrinsicsSigned * 0.0105 + evmTxs * 0.021),
            tsFirst: new Date(start).toISOString(),
            tsLast: new Date(end).toISOString(),
            issuanceTotal,
            issuanceInactive: treasury,
            issuanceTransferable: String(BigInt(issuanceTotal) - BigInt(numn(9_000_000 + 30_000 * d))),
            treasuryPot: treasury,
            cumExtrinsicsSigned: String(cumExtrinsics),
            cumTransfers: String(cumTransfers),
            cumTransferVolume: String(cumVolume),
            difficultyClose: String(Math.round(3.6e9 * (1 + 0.004 * d) * (1 + 0.04 * swing(d, 1)))),
            accountsTotal: accounts,
            referendaTotal: Math.min(12, Math.floor(d / 9)),
            minersActive: Math.max(1, Math.round((22 + 6 * swing(d, 6)) * Math.min(1, share * 4))),
            rewards: numn(REWARD * blocks),
        }
    })
}

// the mainnet fixture chain, genesis about 116 days before the head
export const DAILY = chainDays()
