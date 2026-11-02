import Link from 'next/link'
import Asteroid from './Asteroid'
import DownloadObj from './DownloadObj'
import EmptyList from './EmptyList'
import ScrollStrip from './ScrollStrip'
import DotRow from './DotRow'
import TimeAgo from './TimeAgo'
import AccountLink from './AccountLink'
import {FinalityDot} from './blockStatus'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {fmtInt, shortHash} from '@/lib/format'
import {type AccountRef} from '@/lib/gql'
import {NONE} from '@/components/Detail'

export interface BlockCard {
    height: number
    hash: string
    timestamp: string
    extrinsicCount: number
    eventCount: number
    workHash: string
    minerAddr: string | null
    minerAcc: AccountRef | null
    protocol: string
    vertices: string
    faces: string
}

export default function BlocksRail({cards}: {cards: BlockCard[]}) {
    if (cards.length === 0)
        return (
            <Card size="flush">
                <EmptyList what="mined blocks" />
            </Card>
        )
    return (
        <ScrollStrip look="disc" stripClassName="grid auto-cols-[min(260px,80%)] grid-flow-col snap-x snap-mandatory gap-4 lg:grid-flow-row lg:grid-cols-5">
            {cards.map(c => (
                <Card key={c.height} size="flush" className="snap-start px-4 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <Link href={`/block/${c.height}`} className="font-mono text-[15px] font-semibold text-primary hover:underline">
                            #{fmtInt(c.height)}
                        </Link>
                        <Badge variant="outline" className="bg-background font-mono text-muted-foreground">
                            {shortHash(c.hash)}
                        </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TimeAgo iso={c.timestamp} />
                        <FinalityDot height={c.height} />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Miner</span>
                        {c.minerAddr ? <AccountLink addr={c.minerAddr} acc={c.minerAcc ?? undefined} className="min-w-0" /> : NONE}
                    </div>
                    <div className="mt-1 flex justify-center">
                        <Asteroid vertices={c.vertices} faces={c.faces} size={148} interactive />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[13px]">
                        <DotRow className="gap-y-0 whitespace-nowrap">
                            <span>Extrinsics {fmtInt(c.extrinsicCount)}</span>
                            <span>Events {fmtInt(c.eventCount)}</span>
                        </DotRow>
                        <DownloadObj vertices={c.vertices} faces={c.faces} name={`block-${c.height}.obj`} />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[11px] text-dim">
                        <span className="truncate">OBJ {shortHash(c.workHash)}</span>
                        <span className="whitespace-nowrap">{c.protocol}</span>
                    </div>
                </Card>
            ))}
        </ScrollStrip>
    )
}
