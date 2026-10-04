import Link from 'next/link'
import Asteroid from './Asteroid'
import DownloadObj from './DownloadObj'
import EmptyList from './EmptyList'
import DotRow from './DotRow'
import {TimeCell} from './TimeCell'
import AccountLink from './AccountLink'
import {StatusDot} from './pills'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {fmtInt, shortHash} from '@/lib/format'
import {type AccountRef} from '@/lib/gql'
import {NONE} from '@/components/Detail'

export interface BlockCard {
    height: number
    hash: string
    timestamp: string
    finalized: boolean
    extrinsicCount: number
    eventCount: number
    workHash: string
    minerAddr: string | null
    minerAcc: AccountRef | null
    protocol: string
    vertices: string
}

export default function BlocksRail({cards, faces}: {cards: BlockCard[]; faces: string}) {
    if (cards.length === 0)
        return (
            <Card size="flush">
                <EmptyList what="mined blocks" />
            </Card>
        )
    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map(c => (
                <Card key={c.height} size="flush" className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <Link href={`/block/${c.height}`} className="font-mono text-[15px] font-semibold text-primary hover:underline">
                            #{fmtInt(c.height)}
                        </Link>
                        <Badge variant="outline" className="bg-background font-mono text-muted-foreground">
                            {shortHash(c.hash, 5, 4)}
                        </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
                        <TimeCell iso={c.timestamp} cycle />
                        <span className="flex items-center gap-1.5">
                            <StatusDot tone={c.finalized ? 'pos' : 'warn'} />
                            {c.finalized ? 'Finalized' : 'Confirming'}
                        </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Miner</span>
                        {c.minerAddr ? <AccountLink addr={c.minerAddr} acc={c.minerAcc ?? undefined} className="min-w-0" /> : NONE}
                    </div>
                    <div className="mt-1 flex justify-center">
                        <Asteroid vertices={c.vertices} faces={faces} size={148} interactive />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[13px]">
                        <DotRow className="gap-y-0 whitespace-nowrap">
                            <span>Extrinsics {fmtInt(c.extrinsicCount)}</span>
                            <span>Events {fmtInt(c.eventCount)}</span>
                        </DotRow>
                        <DownloadObj vertices={c.vertices} faces={faces} name={`block-${c.height}.obj`} />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[11px] text-dim">
                        <span className="truncate">OBJ {shortHash(c.workHash, 6, 4)}</span>
                        <span className="whitespace-nowrap">{c.protocol}</span>
                    </div>
                </Card>
            ))}
        </div>
    )
}
