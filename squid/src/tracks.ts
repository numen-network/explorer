import {toJSON} from '@subsquid/util-internal-json'
import {Track} from './model'
import {constants} from './types'
import type {RuntimeCtx} from './types/support'

export function readTracks(block: RuntimeCtx): Track[] {
    const tracks = constants.referenda.tracks.v100
    if (!tracks.is(block)) throw new Error('unhandled Referenda.Tracks shape')
    const caps = constants.origins.spendCaps.v100
    if (!caps.is(block)) throw new Error('unhandled Origins.SpendCaps shape')
    // the ceiling rides an EnsureOrigin success value, which the pallet
    // republishes as a constant keyed by the track it belongs to, and only
    // the spender tracks carry one
    const ceilings = new Map(caps.get(block).map(([track, , cap]) => [track, cap]))
    return tracks.get(block).map(([id, t]) => {
        // sp_runtime::str_array pads the name out to a fixed width
        const name = t.name.replace(/\0+$/, '')
        return new Track({
            id: String(id),
            name,
            maxSpend: ceilings.get(id) ?? null,
            maxDeciding: t.maxDeciding,
            decisionDeposit: t.decisionDeposit,
            preparePeriod: t.preparePeriod,
            decisionPeriod: t.decisionPeriod,
            confirmPeriod: t.confirmPeriod,
            minEnactmentPeriod: t.minEnactmentPeriod,
            minApproval: toJSON(t.minApproval),
            minSupport: toJSON(t.minSupport),
        })
    })
}
