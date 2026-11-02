import type {ReactNode} from 'react'
import type {Decision} from '@/lib/conviction'

export type GridVote = Decision | null

export interface GridCell {
    index: number
    title: string | null
    vote: GridVote
    // the account's delegation carried the vote
    delegated: boolean
    facts: FactGroup[]
}

// a block of the tooltip, its rows each a name and its value
export interface FactGroup {
    label: string | null
    rows: [string, ReactNode][]
}

export interface GridLegendItem {
    vote: GridVote
    delegated: boolean
    label: string
}

export const GRID_LEGEND: {label: string; items: GridLegendItem[]}[] = [
    {
        label: 'Direct',
        items: [
            {vote: 'aye', delegated: false, label: 'Aye'},
            {vote: 'nay', delegated: false, label: 'Nay'},
            {vote: 'split', delegated: false, label: 'Split'},
            {vote: 'abstain', delegated: false, label: 'Abstain'},
            {vote: null, delegated: false, label: 'No vote'},
        ],
    },
    {
        label: 'Delegated',
        items: [
            {vote: 'aye', delegated: true, label: 'Aye'},
            {vote: 'nay', delegated: true, label: 'Nay'},
        ],
    },
]
