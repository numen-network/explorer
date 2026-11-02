import IdentityCards from '@/components/IdentityCards'
import {JudgementEntriesTable} from '@/components/JudgementEntriesTable'
import {BlockLink} from '@/components/links'
import {emptyText} from '@/components/EmptyList'
import Pager from '@/components/Pager'
import {FilterSelect} from '@/components/pills'
import SearchBox from '@/components/SearchBox'
import StatTile from '@/components/StatTile'
import {TabNav} from '@/components/Tabs'
import {Card} from '@/components/ui/card'
import {loadUsernameFilters} from '@/lib/actionFilters'
import {chainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {paging} from '@/lib/paging'
import {accountSearch, identitiesPage, peopleCounts, pendingRequestsPage, registrarsPage, usernameAuthoritiesPage, usernamesPage} from '@/lib/gql'
import {WALLET_URL} from '@/lib/wallet'
import {RegistrarsTable, UsernameAuthoritiesTable, UsernamesTable} from './tables'
import {withHeads} from '@/components/withHeads'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'People'}

const TABS = ['identities', 'pending', 'registrars', 'usernames', 'authorities'] as const

async function PeoplePage(props: PageProps<'/people'>) {
    const sp = await props.searchParams
    const tab = TABS.find(t => t === sp.tab) ?? 'identities'
    const pg = paging(sp)
    const {q, suffix} = loadUsernameFilters(sp)
    const query = q.trim()
    const chain = await chainProps()
    const search = accountSearch(query, chain.ss58)
    const [counts, identities, pending, usernames, authorities, registrars] = await Promise.all([
        peopleCounts(),
        tab === 'identities' ? identitiesPage(search, pg.size, pg.offset) : null,
        tab === 'pending' ? pendingRequestsPage(pg.size, pg.offset) : null,
        tab === 'usernames' ? usernamesPage(suffix, search, pg.size, pg.offset) : null,
        tab === 'authorities' ? usernameAuthoritiesPage(pg.size, pg.offset) : null,
        tab === 'registrars' ? registrarsPage(pg.size, pg.offset) : null,
    ])
    const total = {identities: identities?.total ?? 0, pending: counts.requests, usernames: usernames?.total ?? 0, authorities: counts.authorities, registrars: counts.registrars}
    // a tab opens unfiltered, while the pager and a new suffix keep the search
    const href = (t: (typeof TABS)[number], filters: Record<string, string> = {}) => {
        const qs = new URLSearchParams({...(t !== 'identities' && {tab: t}), ...filters}).toString()
        return qs ? `/people?${qs}` : '/people'
    }
    const kept = (picked: string) => ({...(picked && {suffix: picked}), ...(query && {q: query})})

    return (
        <div>
            <div className="mt-6">
                <h1 className="text-lg font-semibold">People</h1>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                    label="Direct identities"
                    value={fmtInt(counts.direct)}
                    beside={[{label: 'Sub identities', value: fmtInt(counts.subs)}]}
                    chips={[
                        {text: fmtInt(counts.verified), note: 'verified', tone: 'pos'},
                        {text: fmtInt(counts.direct - counts.verified - counts.flagged), note: 'unverified', tone: 'idle'},
                        {text: fmtInt(counts.flagged), note: 'flagged', tone: 'neg'},
                    ]}
                />
                <StatTile
                    label="Registrars"
                    value={fmtInt(counts.registrars - counts.retired)}
                    chips={[
                        {text: fmtInt(counts.retired), note: 'retired', tone: 'idle'},
                        {text: counts.latestJudgement != null ? <BlockLink height={counts.latestJudgement} /> : '—', note: 'latest judgement', tone: 'idle'},
                    ]}
                />
                <StatTile
                    label="Usernames"
                    value={fmtInt(counts.usernames)}
                    chips={[
                        {text: fmtInt(counts.usernames - counts.pending - counts.unbinding), note: 'active', tone: 'pos'},
                        {text: fmtInt(counts.pending), note: 'pending', tone: 'idle'},
                        {text: fmtInt(counts.unbinding), note: 'unbinding', tone: 'warn'},
                    ]}
                />
                <StatTile label="Authorities" value={fmtInt(counts.authorities)} chips={[{text: fmtInt(counts.allocationLeft), note: 'allocation left', tone: 'idle'}]} />
            </div>

            <div className="mt-7">
                <TabNav
                    aria-label="People"
                    items={[
                        {label: 'Identities', count: counts.direct, href: href('identities'), active: tab === 'identities'},
                        {label: 'Pending', count: counts.requests, href: href('pending'), active: tab === 'pending'},
                        {label: 'Registrars', count: counts.registrars, href: href('registrars'), active: tab === 'registrars'},
                        {label: 'Usernames', count: counts.usernames, href: href('usernames'), active: tab === 'usernames'},
                        {label: 'Authorities', count: counts.authorities, href: href('authorities'), active: tab === 'authorities'},
                    ]}
                />
                {identities && (
                    <>
                        <div className="mt-4 mb-3 flex flex-wrap items-center justify-end gap-2">
                            <SearchBox placeholder="Search by identity name or address" className="w-full sm:w-90" />
                        </div>
                        <IdentityCards rows={identities.accounts} chain={chain} wallet={WALLET_URL} filtered={query !== ''} />
                    </>
                )}
                {pending && (
                    <Card size="flush" className="mt-4">
                        <JudgementEntriesTable rows={pending.identityJudgements} chain={chain} pending />
                    </Card>
                )}
                {usernames && (
                    <>
                        <div className="mt-4 mb-3 flex flex-wrap items-center justify-between gap-2">
                            <FilterSelect label="Authority" values={usernames.suffixes} labelOf={s => `.${s}`} counts={usernames.perSuffix} allCount={usernames.all} value={usernames.suffix} href={s => href('usernames', kept(s))} />
                            <SearchBox placeholder="Search username or account" className="w-full sm:w-90" />
                        </div>
                        <Card size="flush">
                            <UsernamesTable rows={usernames.rows} chain={chain} empty={emptyText('usernames', usernames.suffix !== '' || query !== '')} />
                        </Card>
                    </>
                )}
                {authorities && (
                    <Card size="flush" className="mt-4">
                        <UsernameAuthoritiesTable rows={authorities.usernameAuthorities} chain={chain} />
                    </Card>
                )}
                {registrars && (
                    <Card size="flush" className="mt-4">
                        <RegistrarsTable rows={registrars.registrars} chain={chain} />
                    </Card>
                )}
                <Pager paging={pg} total={total[tab]} href={href(tab, kept(usernames?.suffix ?? ''))} />
            </div>
        </div>
    )
}

export default withHeads(PeoplePage)
