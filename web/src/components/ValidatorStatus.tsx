'use client'

import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import {camelLabel, fmtInt} from '@/lib/format'
import type {ValidatorRow} from '@/lib/gql'
import {variantName} from '@/lib/variant'

type Lifecycle = Pick<ValidatorRow, 'active' | 'status' | 'kicked' | 'rejoinCooldown' | 'lockExpiry'>

// ValidatorLocks has no Pending. An Active lock outside the session set is
// still waiting for a session boundary to promote it
function look(v: Lifecycle) {
    switch (v.status) {
        case 'Active':
            return v.active ? {label: 'Active', variant: 'pos'} as const : {label: 'Pending', variant: 'primary'} as const
        case 'ExitRequested':
            return {label: 'Exit requested', variant: 'warn'} as const
        case 'Kicked':
            return {label: `Kicked · ${variantName(v.kicked)}`, variant: 'neg'} as const
        default:
            return {label: camelLabel(v.status), variant: 'idle'} as const
    }
}

export function ValidatorStatus({v}: {v: Lifecycle}) {
    const {label, variant} = look(v)
    return <Badge variant={variant}>{label}</Badge>
}

export function LockExpiry({v, renewEvery}: {v: Lifecycle; renewEvery: string}) {
    if (v.status === 'Active')
        return (
            <Tip text={`Renews every ${renewEvery}`}>
                <span>Auto-renews</span>
            </Tip>
        )
    return v.lockExpiry != null ? `#${fmtInt(v.lockExpiry)}` : '—'
}

// the deadline is the last block that refuses a lock, so once the head reaches
// it the next block can lock again
export function RejoinAfter({v, head}: {v: Lifecycle; head: number}) {
    return v.rejoinCooldown != null && v.rejoinCooldown > head ? `#${fmtInt(v.rejoinCooldown)}` : '—'
}
