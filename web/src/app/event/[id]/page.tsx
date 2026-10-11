import {notFound} from 'next/navigation'
import {ArgsView} from '@/components/ArgsTable'
import {DetailCard, DetailRow, NONE} from '@/components/Detail'
import {TimeCell} from '@/components/TimeCell'
import {BlockLink, ExtrinsicLink} from '@/components/links'
import {describeEvent} from '@/lib/args'
import {chainProps} from '@/lib/chain'
import {eventDetail} from '@/lib/gql'
import {markArgs} from '@/lib/argMarks'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/event/[id]'>) {
    const {id} = await props.params
    return {title: `Event ${id}`}
}

const CANONICAL = /^(\d+)-(\d+)$/

export default async function EventPage(props: PageProps<'/event/[id]'>) {
    const {id} = await props.params
    const canonical = CANONICAL.exec(id)
    if (!canonical) notFound()
    const [chain, {events}] = await Promise.all([chainProps(), eventDetail(Number(canonical[1]), Number(canonical[2]))])
    const ev = events[0]
    if (!ev) notFound()
    const view = describeEvent({...ev, specVersion: ev.block.specVersion})
    await markArgs([view])

    return (
        <div>
            <h1 className="mt-6 text-lg font-semibold">
                Event{' '}
                <span className="font-mono">
                    {ev.block.height}-{ev.indexInBlock}
                </span>
            </h1>

            <div className="mt-3">
                <DetailCard>
                    <DetailRow label="Event">
                        {ev.pallet}.{ev.method}
                    </DetailRow>
                    <DetailRow label="Block">
                        <BlockLink height={ev.block.height} />
                    </DetailRow>
                    <DetailRow label="Timestamp">
                        <TimeCell iso={ev.block.timestamp} cycle />
                    </DetailRow>
                    <DetailRow label="Phase">{ev.phase}</DetailRow>
                    <DetailRow label="Extrinsic">{ev.extrinsic ? <ExtrinsicLink id={ev.extrinsic.id} /> : NONE}</DetailRow>
                    <DetailRow label="Call">{ev.call ? `${ev.call.pallet}.${ev.call.method}` : NONE}</DetailRow>
                    <DetailRow label="Args">
                        <ArgsView node={view} raw={ev.args} chain={chain} />
                    </DetailRow>
                </DetailCard>
            </div>
        </div>
    )
}
