import Link from 'next/link'
import {notFound, redirect} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import {DetailCard, DetailRow, JsonBlock} from '@/components/Detail'
import {TabPanels} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import AccountLink from '@/components/AccountLink'
import {BlockLink, EvmTxLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {CallTree} from '@/components/calls'
import {chainProps} from '@/lib/chain'
import {extrinsicPath, fmtBalance, fmtInt, shortHash} from '@/lib/format'
import {extrinsicDetail, extrinsicMatches, type ExtrinsicHit} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/extrinsic/[id]'>) {
    const {id} = await props.params
    return {title: `Extrinsic ${decodeURIComponent(id).startsWith('0x') ? shortHash(id, 10, 6) : id}`}
}

const CANONICAL = /^(\d+)-(\d+)$/

// two extrinsics can share a hash, picking one of them silently would be a lie
function Ambiguous({hash, hits}: {hash: string; hits: ExtrinsicHit[]}) {
    return (
        <div>
            <h1 className="mt-6 text-lg font-semibold">Extrinsic {shortHash(hash, 10, 6)}</h1>
            <p className="mt-1.5 text-sm text-sub">{fmtInt(hits.length)} extrinsics share this hash, pick the block you meant.</p>
            <div className="card mt-3 divide-y divide-edge">
                {hits.map(h => (
                    <Link key={h.id} href={`/extrinsic/${h.block.height}-${h.indexInBlock}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-bg/60">
                        <span className="font-mono text-sm text-accent">
                            {h.block.height}-{h.indexInBlock}
                        </span>
                        <span className="text-sm text-sub">
                            {h.pallet}.{h.method}
                        </span>
                        <span className="text-xs text-sub">
                            <TimeCell iso={h.block.timestamp} />
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default async function ExtrinsicPage(props: PageProps<'/extrinsic/[id]'>) {
    const [{id}, sp] = await Promise.all([props.params, props.searchParams])
    const raw = decodeURIComponent(id)
    const chain = await chainProps()

    const canonical = CANONICAL.exec(raw)
    if (!canonical) {
        if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) notFound()
        const {extrinsics} = await extrinsicMatches(raw)
        if (extrinsics.length === 0) notFound()
        if (extrinsics.length === 1) redirect(`/extrinsic/${extrinsicPath(extrinsics[0].id)}`)
        return <Ambiguous hash={raw} hits={extrinsics} />
    }

    const data = await extrinsicDetail(Number(canonical[1]), Number(canonical[2]))
    const x = data.extrinsics[0]
    if (!x) notFound()

    const events = (
        <div className="card divide-y divide-edge">
            {data.events.length === 0 && <div className="px-5 py-5 text-sm text-sub">None</div>}
            {data.events.map(e => (
                <details key={e.id} className="px-5 py-2.5">
                    <summary className="flex cursor-pointer items-center gap-3 text-sm">
                        <span className="w-8 font-mono text-xs text-sub">{e.indexInBlock}</span>
                        <span className="font-mono text-[13px]">
                            {e.pallet}.{e.method}
                        </span>
                        {e.call && (e.call.pallet !== x.pallet || e.call.method !== x.method) && (
                            <span className="font-mono text-[11px] text-faint">
                                from {e.call.pallet}.{e.call.method}
                            </span>
                        )}
                    </summary>
                    <div className="mt-2 pl-11">
                        <JsonBlock value={e.args} />
                    </div>
                </details>
            ))}
        </div>
    )

    return (
        <div>
            <div className="mt-6 flex items-center gap-3">
                <h1 className="text-lg font-semibold">
                    Extrinsic{' '}
                    <span className="font-mono">
                        {x.block.height}-{x.indexInBlock}
                    </span>
                </h1>
                <Tag text={x.success ? 'Success' : 'Failed'} tone={x.success ? 'pos' : 'neg'} />
            </div>

            <div className="mt-3">
                <DetailCard>
                    <DetailRow label="Call">
                        <span className="font-mono">
                            {x.pallet}.{x.method}
                        </span>
                    </DetailRow>
                    <DetailRow label="Hash">
                        {x.hash}
                        <CopyBtn text={x.hash} />
                    </DetailRow>
                    <DetailRow label="Block">
                        <BlockLink height={x.block.height} />
                    </DetailRow>
                    <DetailRow label="Timestamp">
                        <TimeCell iso={x.block.timestamp} cycle />
                    </DetailRow>
                    <DetailRow label="Signer">
                        {x.signer ? <AccountLink full addr={ss58Encode(x.signer.id, chain.ss58)} acc={x.signer} /> : <span className="text-faint">unsigned</span>}
                    </DetailRow>
                    <DetailRow label="Fee">{x.fee ? fmtBalance(x.fee, chain.decimals, chain.symbol) : '—'}</DetailRow>
                    <DetailRow label="Tip">{x.tip && x.tip !== '0' ? fmtBalance(x.tip, chain.decimals, chain.symbol) : '—'}</DetailRow>
                    {data.evm[0] && (
                        <DetailRow label="EVM view">
                            <EvmTxLink hash={data.evm[0].id} full />
                        </DetailRow>
                    )}
                    {!x.success && (
                        <DetailRow label="Error">
                            <JsonBlock value={x.error} />
                        </DetailRow>
                    )}
                </DetailCard>
            </div>

            <TabPanels
                at={typeof sp.tab === 'string' ? sp.tab : undefined}
                href={slug => `/extrinsic/${x.block.height}-${x.indexInBlock}?tab=${slug}`}
                panels={[
                    {
                        slug: 'calls',
                        label: 'Calls',
                        count: data.calls.length,
                        body: () => <CallTree calls={data.calls} events={data.events} chain={chain} signer={x.signer} />,
                    },
                    {slug: 'events', label: 'Events', count: data.events.length, body: () => events},
                ]}
            />
        </div>
    )
}
