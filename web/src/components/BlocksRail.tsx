import Link from 'next/link'
import Asteroid from './Asteroid'
import DownloadObj from './DownloadObj'
import TimeAgo from './TimeAgo'
import AccountLink from './AccountLink'
import {HashPill, StatusDot} from './pills'
import {fmtInt, shortHash} from '@/lib/format'
import {type AccountRef} from '@/lib/gql'

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
    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {cards.map(c => (
                <div key={c.height} className="card px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                        <Link href={`/block/${c.height}`} className="font-mono text-[15px] font-semibold text-accent hover:underline">
                            #{fmtInt(c.height)}
                        </Link>
                        <HashPill text={shortHash(c.hash, 5, 4)} />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-sub">
                        <TimeAgo iso={c.timestamp} />
                        <StatusDot tone={c.finalized ? 'pos' : 'warn'} />
                        <span>{c.finalized ? 'Finalized' : 'Confirming'}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-sub">Miner</span>
                        {c.minerAddr ? <AccountLink addr={c.minerAddr} acc={c.minerAcc ?? undefined} className="min-w-0" /> : <span className="text-faint">—</span>}
                    </div>
                    <div className="mt-1 flex justify-center">
                        <Asteroid vertices={c.vertices} faces={faces} size={148} interactive />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[13px]">
                        <span>
                            Extrinsics {c.extrinsicCount} · Events {c.eventCount}
                        </span>
                        <DownloadObj vertices={c.vertices} faces={faces} name={`block-${c.height}.obj`} />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[11px] text-faint">
                        <span className="truncate">OBJ {shortHash(c.workHash, 6, 4)}</span>
                        <span>{c.protocol}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}
