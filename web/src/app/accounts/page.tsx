import Pager from '@/components/Pager'
import Refresh from '@/components/Refresh'
import AccountLink from '@/components/AccountLink'
import {BlockLink} from '@/components/links'
import {chainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import {accountsPage, primeState} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Accounts'}

const PAGE = 25

const TIERS: [min: number, emoji: string][] = [
    [0.1, '\u{1F40B}'],
    [0.01, '\u{1F988}'],
    [0.001, '\u{1F42C}'],
    [0.0001, '\u{1F41F}'],
    [0.00001, '\u{1F980}'],
    [0.000001, '\u{1F990}'],
]

const tier = (pct: number) => TIERS.find(([min]) => pct >= min)?.[1] ?? ''

const fmtShare = (pct: number) => (pct >= 0.01 ? pct.toFixed(2) : pct.toFixed(6).replace(/0+$/, '')) + '% of issuance'

export default async function AccountsPage(props: PageProps<'/accounts'>) {
    const sp = await props.searchParams
    const page = Math.max(1, Number(sp.page) || 1)
    const [chain, {accounts, conn, dailyStats}, {primeStates}] = await Promise.all([chainProps(), accountsPage(PAGE, (page - 1) * PAGE), primeState()])
    const prime = primeStates[0]
    const issuance = BigInt(dailyStats[0]?.issuanceTotal ?? 0)
    const share = (held: bigint) => (issuance > 0n ? Number((held * 10n ** 12n) / issuance) / 1e10 : 0)

    return (
        <div>
            <Refresh />
            <div className="mt-6">
                <h1 className="text-lg font-semibold">Accounts</h1>
            </div>
            {prime && (
                <div className="card mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3.5">
                    <span className="text-sm font-medium text-sub">Prime key</span>
                    <AccountLink full addr={ss58Encode(prime.account.id, chain.ss58)} acc={prime.account} className="min-w-0" />
                    <span className="ml-auto text-xs text-faint">
                        {prime.since > 0 ? (
                            <>
                                since <BlockLink height={prime.since} />
                            </>
                        ) : (
                            'since genesis'
                        )}
                    </span>
                </div>
            )}
            <div className="card mt-3 overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[minmax(18ch,1fr)_max-content_max-content_max-content_max-content]">
                    <thead>
                        <tr>
                            <th>Account</th>
                            <th className="text-right">Balance</th>
                            <th className="text-right">Extrinsics</th>
                            <th className="text-right">First seen</th>
                            <th className="text-right">Last active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map(a => (
                            <tr key={a.id}>
                                <td>
                                    <AccountLink full addr={ss58Encode(a.id, chain.ss58)} acc={a} />
                                </td>
                                <td className="text-right font-mono whitespace-nowrap">
                                    {(() => {
                                        const held = BigInt(a.free) + BigInt(a.reserved)
                                        const pct = share(held)
                                        const mark = held > 0n ? tier(pct) : ''
                                        return (
                                            <span title={held > 0n ? fmtShare(pct) : undefined}>
                                                {mark && <span className="mr-1.5">{mark}</span>}
                                                {fmtBalance(held, chain.decimals, chain.symbol)}
                                            </span>
                                        )
                                    })()}
                                </td>
                                <td className="text-right font-mono">{a.nonce}</td>
                                <td className="text-right">
                                    <BlockLink height={a.firstSeenBlock} />
                                </td>
                                <td className="text-right">
                                    <BlockLink height={a.lastActiveBlock} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pager page={page} pageCount={Math.ceil(conn.totalCount / PAGE)} href={n => `/accounts?page=${n}`} />
        </div>
    )
}
