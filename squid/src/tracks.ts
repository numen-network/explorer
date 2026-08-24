import {Track} from './model'
import {constants} from './types'
import type {Curve} from './types/v100'
import type {RuntimeCtx} from './types/support'

// Perbill and FixedI64 both count in billionths, the charts want a fraction
const BILLION = 1e9

function curveJson(c: Curve) {
    switch (c.__kind) {
        case 'LinearDecreasing':
            return {type: c.__kind, length: c.length / BILLION, floor: c.floor / BILLION, ceil: c.ceil / BILLION}
        case 'Reciprocal':
            return {type: c.__kind, factor: Number(c.factor) / BILLION, xOffset: Number(c.xOffset) / BILLION, yOffset: Number(c.yOffset) / BILLION}
        case 'SteppedDecreasing':
            return {type: c.__kind, begin: c.begin / BILLION, end: c.end / BILLION, step: c.step / BILLION, period: c.period / BILLION}
    }
}

export function readTracks(block: RuntimeCtx): Track[] {
    const tracks = constants.referenda.tracks.v100
    if (!tracks.is(block)) throw new Error('unhandled Referenda.Tracks shape')
    const caps = constants.origins.spendCaps.v100
    if (!caps.is(block)) throw new Error('unhandled Origins.SpendCaps shape')
    // the ceiling rides an EnsureOrigin success value, which the pallet
    // republishes as a constant keyed by the track it belongs to
    const ceilings = new Map(caps.get(block).map(([track, , cap]) => [track, cap]))
    return tracks.get(block).map(([id, t]) => {
        // sp_runtime::str_array pads the name out to a fixed width
        const name = t.name.replace(/\0+$/, '')
        const maxSpend = ceilings.get(id)
        if (maxSpend === undefined) throw new Error(`no spend ceiling published for track ${name}`)
        return new Track({
            id: String(id),
            name,
            maxSpend,
            maxDeciding: t.maxDeciding,
            decisionDeposit: t.decisionDeposit,
            preparePeriod: t.preparePeriod,
            decisionPeriod: t.decisionPeriod,
            confirmPeriod: t.confirmPeriod,
            minEnactmentPeriod: t.minEnactmentPeriod,
            minApproval: curveJson(t.minApproval),
            minSupport: curveJson(t.minSupport),
        })
    })
}
