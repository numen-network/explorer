import AccountLink from '@/components/AccountLink'
import {BlockLink} from '@/components/links'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {TabBar} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import {chainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import Socials from '@/components/Socials'
import {type IdentityRef} from '@/lib/identity'
import {identitiesPage, identityCounts, registrarsList, type IdentityRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Identities'}

const PAGE = 25
// the social icons are the first thing to go when the row cannot hold four
// columns, the account and the sub count are what the page is for
const ROW = 'grid grid-cols-[1.75rem_minmax(0,1fr)_4rem] items-center gap-3 px-5 py-2.5 sm:grid-cols-[1.75rem_minmax(0,1fr)_12rem_7rem]'

function Chevron() {
    return (
        <span className="grid size-6 place-items-center rounded-md border border-edge text-sub transition-transform group-open:rotate-90">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3.5 10.5 8 6 12.5" />
            </svg>
        </span>
    )
}

function IdentityRowView({row, ss58}: {row: IdentityRow; ss58: number}) {
    const addr = ss58Encode(row.id, ss58)
    const acc: IdentityRef = {identityDisplay: row.identityDisplay, identityJson: row.identityJson}
    const cells = (
        <>
            <AccountLink addr={addr} acc={acc} className="min-w-0" />
            <span className="hidden sm:contents">
                <Socials json={row.identityJson} />
            </span>
            <span className="text-right font-mono text-sub">{fmtInt(row.subs.length)}</span>
        </>
    )
    if (row.subs.length === 0) {
        return (
            <div className={ROW}>
                <span />
                {cells}
            </div>
        )
    }
    return (
        <details className="group">
            <summary className={`${ROW} cursor-pointer list-none`}>
                <Chevron />
                {cells}
            </summary>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 px-5 pb-3 pl-[3.9rem] text-sm">
                {row.subs.map(s => (
                    <AccountLink
                        key={s.id}
                        addr={ss58Encode(s.id, ss58)}
                        acc={{identitySubName: s.identitySubName, identitySuper: acc}}
                        className="min-w-0"
                    />
                ))}
            </div>
        </details>
    )
}

export default async function IdentitiesPage(props: PageProps<'/identities'>) {
    const sp = await props.searchParams
    const tab = sp.tab === 'registrars' ? 'registrars' : 'identities'
    const page = Math.max(1, Number(sp.page) || 1)
    const [chain, counts, registrars] = await Promise.all([chainProps(), identityCounts(), registrarsList()])
    const rows = tab === 'identities' ? (await identitiesPage(PAGE, (page - 1) * PAGE)).accounts : []

    const identities = (
        <div className="card">
            <div className={`${ROW} border-b border-edge py-2.5 text-xs text-sub`}>
                <span />
                <span>Account</span>
                <span className="hidden sm:block">Socials</span>
                <span className="text-right">Sub identities</span>
            </div>
            <div className="divide-y divide-edge">
                {rows.length === 0 && <div className="px-5 py-6 text-sm text-sub">No identities yet.</div>}
                {rows.map(r => (
                    <IdentityRowView key={r.id} row={r} ss58={chain.ss58} />
                ))}
            </div>
        </div>
    )

    const registrarTable = (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_minmax(18ch,1fr)_max-content_max-content_max-content_max-content]">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Registrar</th>
                        <th>Latest judgement</th>
                        <th className="text-right">Requests received</th>
                        <th className="text-right">Judgements given</th>
                        <th className="text-right">Fee</th>
                    </tr>
                </thead>
                <tbody>
                    {registrars.registrars.length === 0 && (
                        <tr>
                            <td colSpan={6} className="py-6 text-sub">
                                No registrars yet.
                            </td>
                        </tr>
                    )}
                    {registrars.registrars.map(r => (
                        <tr key={r.id}>
                            <td className="font-mono text-sub">#{r.index}</td>
                            <td>
                                {r.account ? <AccountLink addr={ss58Encode(r.account.id, chain.ss58)} acc={r.account} /> : <span className="text-faint">—</span>}
                            </td>
                            <td className="text-sub">
                                {r.lastJudgementAt ? <TimeCell iso={r.lastJudgementAt} /> : <span className="text-faint">never</span>}
                            </td>
                            <td className="text-right font-mono">{fmtInt(r.requestCount)}</td>
                            <td className="text-right font-mono">{fmtInt(r.givenCount)}</td>
                            <td className="text-right font-mono">{fmtBalance(r.fee, chain.decimals, chain.symbol)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    return (
        <div>
            <div className="mt-6">
                <h1 className="text-lg font-semibold">Identities</h1>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                    label="Direct identities"
                    value={fmtInt(counts.direct.totalCount)}
                    chips={[
                        {text: fmtInt(counts.verified.totalCount), note: 'verified', tone: 'pos'},
                        {text: fmtInt(counts.unverified.totalCount), note: 'unverified', tone: 'idle'},
                        {text: fmtInt(counts.flagged.totalCount), note: 'flagged', tone: 'neg'},
                    ]}
                />
                <StatTile label="Sub identities" value={fmtInt(counts.subs.totalCount)} />
                <StatTile label="Registrars" value={fmtInt(registrars.registrars.length)} />
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
                        {label: 'Identities', count: counts.direct.totalCount, href: '/identities', active: tab === 'identities'},
                        {label: 'Registrars', count: registrars.registrars.length, href: '/identities?tab=registrars', active: tab === 'registrars'},
                    ]}
                />
                <div className="mt-4">{tab === 'identities' ? identities : registrarTable}</div>
                {tab === 'identities' && (
                    <Pager page={page} pageCount={Math.max(1, Math.ceil(counts.direct.totalCount / PAGE))} href={n => `/identities?page=${n}`} />
                )}
            </div>
        </div>
    )
}
