import Link from 'next/link'
import {notFound} from 'next/navigation'
import Asteroid from '@/components/Asteroid'
import {DetailCard, DetailRow} from '@/components/Detail'
import CopyBtn from '@/components/CopyBtn'
import DownloadObj from '@/components/DownloadObj'
import {EventsTable} from '@/components/EventsTable'
import {ExtrinsicsTable} from '@/components/ExtrinsicsTable'
import Pager from '@/components/Pager'
import {TabPanels} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import {Tip} from '@/components/Tip'
import AccountLink from '@/components/AccountLink'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious} from '@/components/ui/pagination'
import {chainProps} from '@/lib/chain'
import {parseDigest} from '@/lib/digest'
import {fmtBalance, fmtInt, shortHash} from '@/lib/format'
import {blockDetail, leafCalls} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'
import {DigestTable} from './tables'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/block/[id]'>) {
    const {id} = await props.params
    return {title: /^\d+$/.test(id) ? `Block #${fmtInt(id)}` : `Block ${shortHash(id, 10, 6)}`}
}

export default async function BlockPage(props: PageProps<'/block/[id]'>) {
    const {id} = await props.params
    const sp = await props.searchParams
    const tab = String(sp.tab ?? '')
    const x = paging(sp, 'xpage')
    const e = paging(sp, 'epage')
    const [chain, data] = await Promise.all([
        chainProps(),
        blockDetail(id, {limit: x.size, offset: x.offset}, {limit: e.size, offset: e.offset}),
    ])
    const block = data.blocks[0]
    if (!block) notFound()
    const leaves = await leafCalls(data.extrinsics.map(x => x.id))
    const object = data.minedObjects[0]
    const faces = data.topology[0]?.faces ?? ''
    // a block with no extrinsics pays the miner nothing beyond the mint
    const minerTake = [block.reward, block.minerFees].filter(v => v !== '0')
    const logs = parseDigest(block.logs ?? [])

    const extrinsics = (
        <>
            <Card size="flush">
                <ExtrinsicsTable rows={data.extrinsics} leaves={Object.fromEntries(leaves)} chain={chain} view="block" />
            </Card>
            <Pager paging={x} total={block.extrinsicCount} href={`/block/${id}?tab=extrinsics`} pageKey="xpage" />
        </>
    )

    const events = (
        <>
            <Card size="flush">
                <EventsTable rows={data.events} view="block" />
            </Card>
            <Pager paging={e} total={block.eventCount} href={`/block/${id}?tab=events`} pageKey="epage" />
        </>
    )

    const digest = (
        <Card size="flush">
            <DigestTable rows={logs} />
        </Card>
    )

    return (
        <div>
            <div className="mt-6 flex items-center gap-3">
                <h1 className="text-lg font-semibold">Block #{fmtInt(block.height)}</h1>
                <Badge variant={block.finalized ? 'pos' : 'warn'}>{block.finalized ? 'Finalized' : 'Confirming'}</Badge>
                <Pagination className="mr-0 ml-auto w-auto">
                    <PaginationContent>
                        {block.height > 0 && (
                            <PaginationItem>
                                <PaginationPrevious href={`/block/${block.height - 1}`} aria-label="Previous block" />
                            </PaginationItem>
                        )}
                        <PaginationItem>
                            <PaginationNext href={`/block/${block.height + 1}`} aria-label="Next block" />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
                <Card size="flush" className="min-w-0 items-center px-5 py-5">
                    {object ? (
                        <>
                            <Asteroid vertices={object.vertices} faces={faces} size={290} interactive />
                            <div className="mt-auto pt-3 text-center font-mono text-[11px] text-muted-foreground">
                                <div className="flex items-center justify-center gap-1">
                                    OBJ {shortHash(block.workHash, 10, 8)}
                                    <CopyBtn text={block.workHash} />
                                    <DownloadObj vertices={object.vertices} faces={faces} name={`block-${block.height}.obj`} />
                                </div>
                                <div className="mt-1 text-dim">
                                    {object.protocol} · {fmtInt(object.vertexCount)} vertices
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="grid h-[290px] place-items-center text-sm text-dim">object not indexed</div>
                    )}
                </Card>

                <DetailCard>
                    <DetailRow label="Hash">
                        {block.hash}
                        <CopyBtn text={block.hash} />
                    </DetailRow>
                    <DetailRow label="Parent">
                        {block.height > 0 ? (
                            <>
                                <Link href={`/block/${block.height - 1}`} className="text-primary hover:underline">
                                    {block.parentHash}
                                </Link>
                                <CopyBtn text={block.parentHash} />
                            </>
                        ) : (
                            '—'
                        )}
                    </DetailRow>
                    <DetailRow label="Timestamp">
                        <TimeCell iso={block.timestamp} cycle />
                    </DetailRow>
                    <DetailRow label="Miner">
                        {block.author ? <AccountLink full addr={ss58Encode(block.author.id, chain.ss58)} acc={block.author} /> : '—'}
                    </DetailRow>
                    <DetailRow label="Reward">
                        <Tip text="minted reward plus the miner's cut of any fees and tips paid here">
                            <span>{minerTake.length > 0 ? minerTake.map(v => fmtBalance(v, chain.decimals, chain.symbol)).join(' + ') : '—'}</span>
                        </Tip>
                    </DetailRow>
                    {block.treasuryFees !== '0' && (
                        <DetailRow label="Fees to treasury">{fmtBalance(block.treasuryFees, chain.decimals, chain.symbol)}</DetailRow>
                    )}
                    <DetailRow label="Difficulty">{fmtInt(block.difficulty)}</DetailRow>
                    <DetailRow label="Nonce">{block.nonce}</DetailRow>
                    <DetailRow label="Work hash">
                        {block.workHash}
                        <CopyBtn text={block.workHash} />
                    </DetailRow>
                    <DetailRow label="Spec version">{block.specVersion ?? '—'}</DetailRow>
                    <DetailRow label="Extrinsics / events">
                        {block.extrinsicCount} / {block.eventCount}
                    </DetailRow>
                </DetailCard>
            </div>

            <TabPanels
                at={tab}
                href={s => `/block/${id}?tab=${s}`}
                panels={[
                    {slug: 'extrinsics', label: 'Extrinsics', count: block.extrinsicCount, body: () => extrinsics},
                    {slug: 'events', label: 'Events', count: block.eventCount, body: () => events},
                    {slug: 'logs', label: 'Logs', count: logs.length, body: () => digest},
                ]}
            />
        </div>
    )
}
