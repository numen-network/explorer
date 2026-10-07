import {toJSON} from '@subsquid/util-internal-json'
import {Track} from './model'
import {constants} from './types'
import type {RuntimeCtx} from './types/support'

// the runtime carries the tracks, so a batch reads them at its first block and
// wherever the spec changes, covering every track its rows can point at, and
// keeps the latest spec's copy of each since one upsert can't write a row twice
export function readBatchTracks(headers: (RuntimeCtx & {specVersion: number})[]): Track[] {
    const starts = headers.filter((h, i) => i === 0 || h.specVersion !== headers[i - 1].specVersion)
    return [...new Map(starts.flatMap(h => readTracks(h)).map(t => [t.id, t])).values()]
}

function readTracks(block: RuntimeCtx): Track[] {
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
            index: id,
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
