import {BlockLink} from '@/components/links'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {TabBar} from '@/components/Tabs'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {paging} from '@/lib/paging'
import {identitiesPage, identityCounts, registrarsPage} from '@/lib/gql'
import {IdentitiesTable, RegistrarsTable} from './tables'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Identities'}


export default async function IdentitiesPage(props: PageProps<'/identities'>) {
    const sp = await props.searchParams
    const tab = sp.tab === 'registrars' ? 'registrars' : 'identities'
    const pg = paging(sp)
    const [chain, counts, identities, registrars] = await Promise.all([
        chainProps(),
        identityCounts(),
        tab === 'identities' ? identitiesPage(pg.size, pg.offset) : null,
        tab === 'registrars' ? registrarsPage(pg.size, pg.offset) : null,
    ])

    return (
        <div>
            <div className="mt-6">
                <h1 className="text-lg font-semibold">Identities</h1>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                    label="Direct identities"
                    value={fmtInt(counts.direct)}
                    chips={[
                        {text: fmtInt(counts.verified), note: 'verified', tone: 'pos'},
                        {text: fmtInt(counts.direct - counts.verified - counts.flagged), note: 'unverified', tone: 'idle'},
                        {text: fmtInt(counts.flagged), note: 'flagged', tone: 'neg'},
                    ]}
                />
                <StatTile label="Sub identities" value={fmtInt(counts.subs)} />
                <StatTile label="Registrars" value={fmtInt(counts.registrars - counts.retired)} chips={[{text: fmtInt(counts.retired), note: 'retired', tone: 'idle'}]} />
                <StatTile label="Latest judgement" value={counts.latestJudgement != null ? <BlockLink height={counts.latestJudgement} /> : '—'} />
            </div>

            <div className="mt-7">
                <TabBar
                    items={[
                        {label: 'Identities', count: counts.direct, href: '/identities', active: tab === 'identities'},
                        {label: 'Registrars', count: counts.registrars, href: '/identities?tab=registrars', active: tab === 'registrars'},
                    ]}
                />
                <Card size="flush" className="mt-4">
                    {identities && <IdentitiesTable rows={identities.accounts} ss58={chain.ss58} />}
                    {registrars && <RegistrarsTable rows={registrars.registrars} chain={chain} />}
                </Card>
                {identities && <Pager paging={pg} total={counts.direct} href="/identities" />}
                {registrars && <Pager paging={pg} total={counts.registrars} href="/identities?tab=registrars" />}
            </div>
        </div>
    )
}
