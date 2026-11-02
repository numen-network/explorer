import type {ActionRow} from '@/components/actions'
import {curveAt, type Curve} from './curves'
import {pctToNum} from './format'
import type {TallySnapshotRow} from './gql'
import {activeIssuanceOf, approvalOf} from './referendum'

export interface CurveAction {
    hex: string
    row: ActionRow
}

export type Crossing = 'up' | 'down'

export interface CurveVoter extends CurveAction {
    hour: number
    approval: number
    moved: number
    crossed: Crossing | null
}

interface Decision {
    approval: Curve
    support: Curve
    hours: number
    started: boolean
    hourOf: (block: number) => number
}

const movesOf = ({impact}: ActionRow): [number, number] => (impact ? [pctToNum(...impact.approval), pctToNum(...impact.support)] : [0, 0])

function levelsAt(snapshots: TallySnapshotRow[], block: number): [number, number] {
    const s = snapshots.findLast(s => s.block <= block)
    return s ? [pctToNum(...approvalOf(s)), pctToNum(BigInt(s.support), activeIssuanceOf(s))] : [0, 0]
}

function crossing(before: number, after: number, need: number): Crossing | null {
    if (before < need && after >= need) return 'up'
    return before >= need && after < need ? 'down' : null
}

// a snapshot is the tally a block left, so each action in the block reads it
// less the moves that came after that action
export function curveVoters(actions: CurveAction[], snapshots: TallySnapshotRow[], {approval, support, hours, started, hourOf}: Decision): CurveVoter[] {
    const later = new Map<number, [number, number]>()
    return actions
        .toReversed()
        .map(({hex, row}) => {
            const hour = hourOf(row.block)
            const [endApproval, endSupport] = levelsAt(snapshots, row.block)
            const [laterApproval, laterSupport] = later.get(row.block) ?? [0, 0]
            const [moveApproval, moveSupport] = movesOf(row)
            later.set(row.block, [laterApproval + moveApproval, laterSupport + moveSupport])
            const [afterApproval, afterSupport] = [endApproval - laterApproval, endSupport - laterSupport]
            const crossings =
                started && hour >= 0
                    ? [crossing(afterApproval - moveApproval, afterApproval, curveAt(approval, hour / hours) * 100), crossing(afterSupport - moveSupport, afterSupport, curveAt(support, hour / hours) * 100)]
                    : []
            return {
                hex,
                row,
                hour,
                approval: afterApproval,
                moved: Math.max(Math.abs(moveApproval), Math.abs(moveSupport)),
                crossed: crossings.find(c => c === 'up') ?? crossings.find(c => c === 'down') ?? null,
            }
        })
        .toReversed()
}
