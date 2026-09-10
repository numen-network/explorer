import {verdictOf} from '@/components/JudgementBadge'
import {BlockLink} from '@/components/links'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {TabBar} from '@/components/Tabs'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {paging} from '@/lib/paging'
import {identitiesPage, identityCounts, registrarsList} from '@/lib/gql'
import {IdentitiesTable, RegistrarsTable} from './tables'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Identities'}


export default async function IdentitiesPage(props: PageProps<'/identities'>) {
    const sp = await props.searchParams
    const tab = sp.tab === 'registrars' ? 'registrars' : 'identities'
    const pg = paging(sp)
    const [chain, counts, registrars] = await Promise.all([chainProps(), identityCounts(), registrarsList()])
    const rows = tab === 'identities' ? (await identitiesPage(pg.size, pg.offset)).accounts : []
    const verdicts = counts.registered.map(a => verdictOf(a.identityJson))
    const direct = counts.registered.length
    const verified = verdicts.filter(v => v === 'verified').length
    const flagged = verdicts.filter(v => v === 'bad').length
    const retired = registrars.registrars.filter(r => r.retiredAt != null).length

    return (
        <div>
            <div className="mt-6">
                <h1 className="text-lg font-semibold">Identities</h1>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                    label="Direct identities"
                    value={fmtInt(direct)}
                    chips={[
                        {text: fmtInt(verified), note: 'verified', tone: 'pos'},
                        {text: fmtInt(direct - verified - flagged), note: 'unverified', tone: 'idle'},
                        {text: fmtInt(flagged), note: 'flagged', tone: 'neg'},
                    ]}
                />
                <StatTile label="Sub identities" value={fmtInt(counts.subs.totalCount)} />
                <StatTile label="Registrars" value={fmtInt(registrars.registrars.length - retired)} chips={[{text: fmtInt(retired), note: 'retired', tone: 'idle'}]} />
                <StatTile
                    label="Latest judgement"
                    value={
                        registrars.registrars.some(r => r.lastJudgementBlock != null) ? (
                            <BlockLink height={Math.max(...registrars.registrars.map(r => r.lastJudgementBlock ?? 0))} />
                        ) : (
                            '—'
                        )
                    }
                />
            </div>

            <div className="mt-7">
                <TabBar
                    items={[
                        {label: 'Identities', count: direct, href: '/identities', active: tab === 'identities'},
                        {label: 'Registrars', count: registrars.registrars.length, href: '/identities?tab=registrars', active: tab === 'registrars'},
                    ]}
                />
                <Card size="flush" className="mt-4">
                    {tab === 'identities' ? <IdentitiesTable rows={rows} ss58={chain.ss58} /> : <RegistrarsTable rows={registrars.registrars} chain={chain} />}
                </Card>
                {tab === 'identities' && (
                    <Pager paging={pg} total={direct} href="/identities" />
                )}
            </div>
        </div>
    )
}
