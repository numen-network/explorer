import {GridSwatch, VoteGrid} from '@/components/charts'
import {Card} from '@/components/ui/card'
import {decisionOf} from '@/lib/conviction'
import {voteGrid} from '@/lib/gql'
import {GRID_LEGEND, type GridCell} from '@/lib/voteGrid'

// one square per referendum, coloured by how the account voted on it
export default async function VoteRecord({hex}: {hex: string}) {
    const {referenda, votes} = await voteGrid(hex)
    if (referenda.length === 0) return null
    const cast = new Map(votes.map(v => [v.referendum.index, decisionOf(v)]))
    const cells: GridCell[] = referenda.map(r => ({index: r.index, title: r.title, vote: cast.get(r.index) ?? null}))
    return (
        <Card className="mb-3 gap-3 px-5 py-4">
            <VoteGrid cells={cells} />
            <ul aria-label="Vote record legend" className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {GRID_LEGEND.map(l => (
                    <li key={l.label} className="flex items-center gap-2">
                        <GridSwatch vote={l.vote} />
                        {l.label}
                    </li>
                ))}
            </ul>
        </Card>
    )
}
