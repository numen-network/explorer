import Link from 'next/link'
import ApplyButton from '@/components/ApplyButton'
import DateRange from '@/components/DateRange'
import {emptyText} from '@/components/EmptyList'
import {EventsTable} from '@/components/EventsTable'
import Pager from '@/components/Pager'
import {FilterSelect} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {Field} from '@/components/ui/field'
import {Label} from '@/components/ui/label'
import {markArgs} from '@/lib/argMarks'
import {withEventViews} from '@/lib/args'
import {chainDbHead, chainProps} from '@/lib/chain'
import {isDay} from '@/lib/day'
import {fmtInt} from '@/lib/format'
import {eventKinds, eventsPage, type EventFilter} from '@/lib/gql'
import {paging} from '@/lib/paging'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Events'}

// frame_system::Phase, the three points of a block an event can be raised at
const PHASES = ['Initialization', 'ApplyExtrinsic', 'Finalization']

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

// a get form only submits its own fields, the rest of the filter rides along hidden
const Carry = ({keep}: {keep: Record<string, string>}) => (
    <>
        {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
    </>
)

const LABEL = 'mr-1 w-14 text-xs font-normal text-muted-foreground'

export default async function EventsPage(props: PageProps<'/events'>) {
    const sp = await props.searchParams
    const [chain, head] = await Promise.all([chainProps(), chainDbHead()])
    const {eventKinds: kinds} = await eventKinds()

    // anything the url offers has to match the chain before it reaches a query
    const pallet = kinds.some(k => k.pallet === str(sp.pallet)) ? str(sp.pallet) : ''
    const methods = pallet ? kinds.filter(k => k.pallet === pallet).map(k => k.method) : []
    const method = methods.includes(str(sp.method)) ? str(sp.method) : ''
    const phase = PHASES.includes(str(sp.phase)) ? str(sp.phase) : ''
    const after = isDay(str(sp.after)) ? str(sp.after) : ''
    const before = isDay(str(sp.before)) ? str(sp.before) : ''
    const pg = paging(sp)

    const filter: EventFilter = {pallet, method, phase, after, before}
    const pallets = [...new Set(kinds.map(k => k.pallet))].sort()
    const {rows, total, counts} = await eventsPage(pg.size, pg.offset, filter, pallets)
    const eventRows = withEventViews(rows)
    await markArgs(eventRows.map(r => r.view))

    const href = (patch: Record<string, string>) => {
        const q = new URLSearchParams()
        const merged = {pallet, method, phase, after, before, ...patch}
        for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v)
        return `/events${q.size ? `?${q}` : ''}`
    }

    return (
        <div>
            <div className="mt-6 flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">Events</h1>
                <span className="text-xs text-muted-foreground">{fmtInt(total)} matching</span>
            </div>

            <Card size="flush" className="mt-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <FilterSelect label="Pallet" labelClassName={LABEL} values={pallets} counts={counts} value={pallet} href={p => href({pallet: p, method: '', page: ''})} />
                    {pallet && <FilterSelect label="Method" labelClassName={LABEL} values={methods} value={method} href={m => href({method: m, page: ''})} fit={kinds.map(k => k.method)} />}
                    <FilterSelect label="Phase" labelClassName={LABEL} values={PHASES} value={phase} href={p => href({phase: p, page: ''})} />
                    <form action="/events" className="min-w-0">
                        <Field orientation="horizontal" className="flex-wrap gap-2 text-xs">
                            <Label className={LABEL}>Date</Label>
                            <Carry keep={{pallet, method, phase}} />
                            <DateRange key={`${after}|${before}`} after={after} before={before} lastDay={head.timestamp?.slice(0, 10) ?? null} />
                            <ApplyButton />
                            {(after || before) && (
                                <Link href={href({after: '', before: '', page: ''})} className="text-primary hover:underline">
                                    clear
                                </Link>
                            )}
                        </Field>
                    </form>
                </div>
            </Card>

            <Card size="flush" className="mt-4">
                <EventsTable rows={eventRows} view="list" chain={chain} empty={emptyText('events', Object.values(filter).some(Boolean))} />
            </Card>
            <Pager paging={pg} total={total} href={href({})} />
        </div>
    )
}
