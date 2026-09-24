import {notFound} from 'next/navigation'
import {DetailCard, DetailRow, JsonBlock, NONE} from '@/components/Detail'
import {TimeCell} from '@/components/TimeCell'
import {BlockLink, ExtrinsicLink} from '@/components/links'
import {eventDetail} from '@/lib/gql'

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
    const {events} = await eventDetail(Number(canonical[1]), Number(canonical[2]))
    const ev = events[0]
    if (!ev) notFound()

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
                        <JsonBlock value={ev.args} />
                    </DetailRow>
                </DetailCard>
            </div>
        </div>
    )
}
