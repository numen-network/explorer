import type {Decision} from '@/lib/conviction'

export type GridVote = Decision | null

export interface GridCell {
    index: number
    title: string | null
    vote: GridVote
}

export const GRID_LEGEND: {vote: GridVote; label: string}[] = [
    {vote: 'aye', label: 'Aye'},
    {vote: 'nay', label: 'Nay'},
    {vote: 'split', label: 'Split'},
    {vote: 'abstain', label: 'Abstain'},
    {vote: null, label: 'No vote'},
]
