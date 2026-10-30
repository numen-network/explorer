import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import type {Pivotal} from '@/lib/pivotal'

export type Stake = 'vote' | 'delegation'

function tipOf({ended, passing}: Pivotal, stake: Stake) {
    if (ended) return `Wouldn't have ${passing ? 'passed' : 'failed'} without this ${stake}`
    return `${passing ? 'Stops' : 'Starts'} passing without this ${stake}`
}

/** Marks an account whose vote or delegation alone flips the outcome. */
export default function PivotalBadge({pivotal, addr, stake}: {pivotal: Pivotal | null; addr: string; stake: Stake}) {
    if (!pivotal?.addrs.includes(addr)) return null
    return (
        <Tip text={tipOf(pivotal, stake)}>
            <Badge variant="primary">Pivotal</Badge>
        </Tip>
    )
}
