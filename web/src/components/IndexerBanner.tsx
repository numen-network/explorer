import {fmtInt} from '@/lib/format'
import {indexerStatus} from '@/lib/gql'

// the chain head comes from the same row the processor writes, so a dead
// processor freezes both numbers and only the age of the newest block moves
const BEHIND_BLOCKS = 10
const STALL_FACTOR = 10
const STALL_FLOOR = 120

function since(seconds: number): string {
    if (seconds < 120) return `${Math.round(seconds)} seconds`
    if (seconds < 7200) return `${Math.round(seconds / 60)} minutes`
    if (seconds < 172800) return `${Math.round(seconds / 3600)} hours`
    return `${Math.round(seconds / 86400)} days`
}

function warning(status: Awaited<ReturnType<typeof indexerStatus>>, now: number): string | null {
    const block = status.blocks[0]
    const info = status.chainInfos[0]
    if (!block || !info) return null
    const behind = info.head - block.height
    if (behind > BEHIND_BLOCKS) return `Indexer is ${fmtInt(behind)} blocks behind the chain head at #${fmtInt(info.head)}.`
    const age = (now - Date.parse(block.timestamp)) / 1000
    const stall = Math.max(STALL_FLOOR, info.blockTime * STALL_FACTOR)
    return age > stall ? `No new block indexed for ${since(age)}. The chain or the indexer has stopped.` : null
}

export default async function IndexerBanner() {
    const text = await indexerStatus().then(
        s => warning(s, Date.now()),
        () => null
    )
    if (!text) return null
    return <div className="mt-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2 text-sm text-ink">{text}</div>
}
