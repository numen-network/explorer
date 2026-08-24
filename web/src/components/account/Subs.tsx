import Pager from '@/components/Pager'
import AccountLink from '@/components/AccountLink'
import {subIdentitiesPage} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {NONE, num, tabHref, type TabCtx} from './shared'

const PAGE = 25

export default async function Subs({hex, addr, chain, sp}: TabCtx) {
    const page = num(sp, 'spage')
    const {accounts, conn} = await subIdentitiesPage(hex, PAGE, (page - 1) * PAGE)

    return (
        <>
            <div className="card overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_minmax(18ch,1fr)]">
                    <thead>
                        <tr>
                            <th>Sub identity</th>
                            <th>Account</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.length === 0 && (
                            <tr>
                                <td colSpan={2} className="py-5 text-sub">
                                    None
                                </td>
                            </tr>
                        )}
                        {accounts.map(s => (
                            <tr key={s.id}>
                                <td>{s.identitySubName ?? NONE}</td>
                                <td>
                                    <AccountLink full addr={ss58Encode(s.id, chain.ss58)} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {conn.totalCount > PAGE && <Pager page={page} pageCount={Math.ceil(conn.totalCount / PAGE)} href={n => tabHref(addr, 'subs', {spage: n})} />}
        </>
    )
}
