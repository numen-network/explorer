import Pager from '@/components/Pager'
import AccountLink from '@/components/AccountLink'
import {BlockLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {judgementsGiven} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {JUDGEMENT_TONE, NONE, num, tabHref, type TabCtx} from './shared'

const PAGE = 25

export default async function Judgements({addr, chain, sp, index}: TabCtx & {index: number}) {
    const page = num(sp, 'jpage')
    const {judgements, conn} = await judgementsGiven(index, PAGE, (page - 1) * PAGE)

    return (
        <>
            <div className="card overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[minmax(18ch,1fr)_max-content_max-content_max-content]">
                    <thead>
                        <tr>
                            <th>Account</th>
                            <th>Judgement</th>
                            <th>Block</th>
                            <th className="text-right">
                                <TimeModeButton />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {judgements.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-5 text-sub">
                                    None
                                </td>
                            </tr>
                        )}
                        {judgements.map(j => (
                            <tr key={j.id}>
                                <td>
                                    <AccountLink addr={ss58Encode(j.target.id, chain.ss58)} acc={j.target} />
                                </td>
                                <td>{j.kind ? <Tag text={j.kind} tone={JUDGEMENT_TONE[j.kind] ?? 'idle'} /> : NONE}</td>
                                <td>
                                    <BlockLink height={j.block} />
                                </td>
                                <td className="text-right text-sub">
                                    <TimeCell iso={j.timestamp} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {conn.totalCount > PAGE && <Pager page={page} pageCount={Math.ceil(conn.totalCount / PAGE)} href={n => tabHref(addr, 'judgements', {jpage: n})} />}
        </>
    )
}
