import Link from 'next/link'
import Pager from '@/components/Pager'
import {BlockLink, ExtrinsicLink, Jump} from '@/components/links'
import {Tag} from '@/components/pills'
import {CallCell} from '@/components/calls'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {extrinsicsPage} from '@/lib/gql'
import {num, tabHref, type TabCtx} from './shared'

const PAGE = 25

export default async function Extrinsics({hex, addr, sp}: TabCtx) {
    const page = num(sp, 'epage')
    const {rows, total, leaves} = await extrinsicsPage(PAGE, (page - 1) * PAGE, {signer: hex}, [])

    return (
        <>
            <div className="card overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_max-content_minmax(max-content,1fr)_max-content]">
                    <thead>
                        <tr>
                            <th>Extrinsic</th>
                            <th>Block</th>
                            <th>
                                <TimeModeButton />
                            </th>
                            <th>Call</th>
                            <th className="text-right">Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-5 text-sub">
                                    None
                                </td>
                            </tr>
                        )}
                        {rows.map(x => (
                            <tr key={x.id}>
                                <td>
                                    <ExtrinsicLink id={x.id} hash={x.hash} />
                                </td>
                                <td>
                                    <BlockLink height={x.block.height} />
                                </td>
                                <td className="text-sub">
                                    <TimeCell iso={x.block.timestamp} />
                                </td>
                                <td>
                                    <CallCell call={x} leaves={leaves.get(x.id)} />
                                </td>
                                <td className="text-right">
                                    <Tag text={x.success ? 'Success' : 'Failed'} tone={x.success ? 'pos' : 'neg'} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <Link href={`/extrinsics?signer=${addr}`} className="text-accent hover:underline">
                    Search all extrinsics from this account <Jump />
                </Link>
                {total > PAGE && <Pager className="" page={page} pageCount={Math.ceil(total / PAGE)} href={n => tabHref(addr, 'extrinsics', {epage: n})} />}
            </div>
        </>
    )
}
