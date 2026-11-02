import {toJSON} from '@subsquid/util-internal-json'
import {RuntimeVersion, Track, TrackParams} from './model'
import {constants} from './types'
import type {RuntimeCtx} from './types/support'

type Header = RuntimeCtx & {specVersion: number}

export const trackParamsId = (track: string, header: {specVersion: number}) => `${track}-${header.specVersion}`

// the runtime carries the tracks, so a batch reads them at its first block and
// wherever the spec changes. each spec keeps its own copy, the track row
// follows the newest
export function readBatchTracks(headers: Header[]): {tracks: Track[]; params: TrackParams[]} {
    const starts = headers.filter((h, i) => i === 0 || h.specVersion !== headers[i - 1].specVersion)
    const params = starts.flatMap(h => readTracks(h))
    const newest = new Map(params.map(p => [p.track.id, p]))
    const tracks = [...newest.values()].map(({id, track, runtime, ...fields}) => new Track({...fields, id: track.id, index: Number(track.id)}))
    return {tracks, params}
}

function readTracks(block: Header): TrackParams[] {
    const tracks = constants.referenda.tracks.v100
    if (!tracks.is(block)) throw new Error('unhandled Referenda.Tracks shape')
    const caps = constants.origins.spendCaps.v100
    if (!caps.is(block)) throw new Error('unhandled Origins.SpendCaps shape')
    // the ceiling rides an EnsureOrigin success value, which the pallet
    // republishes as a constant keyed by the track it belongs to, and only
    // the spender tracks carry one
    const ceilings = new Map(caps.get(block).map(([track, , cap]) => [track, cap]))
    return tracks.get(block).map(([id, t]) => {
        const track = String(id)
        return new TrackParams({
            id: trackParamsId(track, block),
            track: new Track({id: track}),
            runtime: new RuntimeVersion({id: String(block.specVersion)}),
            // sp_runtime::str_array pads the name out to a fixed width
            name: t.name.replace(/\0+$/, ''),
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
