import Link from 'next/link'
import {notFound} from 'next/navigation'
import Asteroid from '@/components/Asteroid'
import {DetailCard, DetailRow} from '@/components/Detail'
import CopyBtn from '@/components/CopyBtn'
import DownloadObj from '@/components/DownloadObj'
import Pager from '@/components/Pager'
import {TabPanels} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import AccountLink from '@/components/AccountLink'
import {ExtrinsicLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {CallCell} from '@/components/calls'
import {JsonBlock} from '@/components/Detail'
import {chainProps} from '@/lib/chain'
import {parseDigest} from '@/lib/digest'
import {fmtBalance, fmtInt, shortHash} from '@/lib/format'
import {blockDetail, leafCalls} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {FIELD} from '@/lib/ui'

export const dynamic = 'force-dynamic'

const EVENT_ROW = 'grid grid-cols-[2.5rem_minmax(0,1fr)_8rem_9rem] items-center gap-3'
const XPAGE = 25
const EPAGE = 50

export async function generateMetadata(props: PageProps<'/block/[id]'>) {
    const {id} = await props.params
    return {title: /^\d+$/.test(id) ? `Block #${fmtInt(id)}` : `Block ${shortHash(id, 10, 6)}`}
}

export default async function BlockPage(props: PageProps<'/block/[id]'>) {
    const {id} = await props.params
    const sp = await props.searchParams
    const tab = String(sp.tab ?? '')
    const xPage = Math.max(1, Number(sp.xpage) || 1)
    const ePage = Math.max(1, Number(sp.epage) || 1)
    const [chain, data] = await Promise.all([
        chainProps(),
        blockDetail(id, {limit: XPAGE, offset: (xPage - 1) * XPAGE}, {limit: EPAGE, offset: (ePage - 1) * EPAGE}),
    ])
    const block = data.blocks[0]
    if (!block) notFound()
    const leaves = await leafCalls(data.extrinsics.map(x => x.id))
    const pageHref = (patch: Record<string, number>) => {
        const q = new URLSearchParams()
        const merged = {xpage: xPage, epage: ePage, ...patch}
        for (const [k, v] of Object.entries(merged)) if (v > 1) q.set(k, String(v))
        return `/block/${id}${q.size ? `?${q}` : ''}`
    }
    const object = data.minedObjects[0]
    const faces = data.topology[0]?.faces ?? ''
    const logs = parseDigest(block.logs ?? [])

    const extrinsics = (
        <>
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_minmax(18ch,1fr)_max-content_max-content]">
                <thead>
                    <tr>
                        <th>Extrinsic</th>
                        <th>Call</th>
                        <th>Signer</th>
                        <th>Result</th>
                        <th className="text-right">Fee</th>
                    </tr>
                </thead>
                <tbody>
                    {data.extrinsics.map(x => (
                        <tr key={x.id}>
                            <td>
                                <ExtrinsicLink id={x.id} hash={x.hash} />
                            </td>
                            <td>
                                <CallCell call={x} leaves={leaves.get(x.id)} />
                            </td>
                            <td>
                                {x.signer ? <AccountLink full addr={ss58Encode(x.signer.id, chain.ss58)} acc={x.signer} /> : <span className="text-faint">—</span>}
                            </td>
                            <td>
                                <Tag text={x.success ? 'Success' : 'Failed'} tone={x.success ? 'pos' : 'neg'} />
                            </td>
                            <td className="text-right font-mono">{x.fee ? fmtBalance(x.fee, chain.decimals) : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {block.extrinsicCount > XPAGE && <Pager page={xPage} pageCount={Math.ceil(block.extrinsicCount / XPAGE)} href={n => pageHref({xpage: n})} />}
        </>
    )

    const events = (
        <>
        <div className="card">
            <div className={`${EVENT_ROW} border-b border-edge px-5 py-2.5 text-xs text-sub`}>
                <span>#</span>
                <span>Event</span>
                <span>Phase</span>
                <span>Extrinsic</span>
            </div>
            <div className="divide-y divide-edge">
                {data.events.map(e => (
                    <details key={e.id} className="group px-5 py-2.5">
                        <summary className={`${EVENT_ROW} cursor-pointer text-sm`}>
                            <span className="font-mono text-xs text-sub">{e.indexInBlock}</span>
                            <span className="truncate font-mono text-[13px]">
                                {e.pallet}.{e.method}
                                {e.call && <span className="ml-2 text-[11px] text-faint">from {e.call.pallet}.{e.call.method}</span>}
                            </span>
                            <span className="text-xs text-faint">{e.phase}</span>
                            <span className="text-xs">
                                {e.extrinsic ? <ExtrinsicLink id={e.extrinsic.id} hash={e.extrinsic.hash} /> : <span className="text-faint">—</span>}
                            </span>
                        </summary>
                        <div className="mt-2 pl-11">
                            <JsonBlock value={e.args} />
                        </div>
                    </details>
                ))}
            </div>
        </div>
        {block.eventCount > EPAGE && <Pager page={ePage} pageCount={Math.ceil(block.eventCount / EPAGE)} href={n => pageHref({epage: n})} />}
        </>
    )

    const digest = (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_max-content_minmax(0,1fr)]">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th>Engine</th>
                        <th>Data</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.length === 0 && (
                        <tr>
                            <td colSpan={4} className="py-5 text-sub">
                                None
                            </td>
                        </tr>
                    )}
                    {logs.map(l => (
                        <tr key={l.index}>
                            <td className="font-mono text-sub">{l.index}</td>
                            <td>{l.kind}</td>
                            <td className="font-mono text-[13px] text-sub">{l.engine ?? '—'}</td>
                            <td className="font-mono text-[13px]">
                                <span className="block truncate" title={l.data}>
                                    {l.data}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    return (
        <div>
            <div className="mt-6 flex items-center gap-3">
                <h1 className="text-lg font-semibold">Block #{fmtInt(block.height)}</h1>
                <Tag text={block.finalized ? 'Finalized' : 'Confirming'} tone={block.finalized ? 'pos' : 'warn'} />
                <div className="ml-auto flex gap-2 font-mono text-sm">
                    {block.height > 0 && (
                        <Link href={`/block/${block.height - 1}`} className={`${FIELD} hover:text-accent`}>
                            ←
                        </Link>
                    )}
                    <Link href={`/block/${block.height + 1}`} className={`${FIELD} hover:text-accent`}>
                        →
                    </Link>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
                <div className="card flex min-w-0 flex-col items-center overflow-hidden px-5 py-5">
                    {object ? (
                        <>
                            <Asteroid vertices={object.vertices} faces={faces} size={290} interactive />
                            <div className="mt-3 text-center font-mono text-[11px] text-sub">
                                <div className="flex items-center justify-center gap-1">
                                    OBJ {shortHash(block.workHash, 10, 8)}
                                    <CopyBtn text={block.workHash} />
                                    <DownloadObj vertices={object.vertices} faces={faces} name={`block-${block.height}.obj`} />
                                </div>
                                <div className="mt-1 text-faint">
                                    {object.protocol} · {fmtInt(object.vertexCount)} vertices
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="grid h-[290px] place-items-center text-sm text-faint">object not indexed</div>
                    )}
                </div>

                <DetailCard>
                    <DetailRow label="Hash">
                        {block.hash}
                        <CopyBtn text={block.hash} />
                    </DetailRow>
                    <DetailRow label="Parent">
                        {block.height > 0 ? (
                            <>
                                <Link href={`/block/${block.height - 1}`} className="text-accent hover:underline">
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
                    <DetailRow label="Reward">{fmtBalance(block.reward, chain.decimals, chain.symbol)}</DetailRow>
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
