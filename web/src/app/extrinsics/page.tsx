import Link from 'next/link'
import AccountLink from '@/components/AccountLink'
import Pager from '@/components/Pager'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {BlockLink, ExtrinsicLink} from '@/components/links'
import {FilterChip, Tag} from '@/components/pills'
import {CallCell} from '@/components/calls'
import {chainProps} from '@/lib/chain'
import {FIELD} from '@/lib/ui'
import {fmtBalance, fmtInt} from '@/lib/format'
import {callKinds, extrinsicsPage, type ExtrinsicFilter} from '@/lib/gql'
import {ss58Encode, ss58TryDecode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Extrinsics'}

const PAGE = 25
const DAY = /^\d{4}-\d{2}-\d{2}$/
const HEX_ID = /^0x[0-9a-fA-F]{64}$/

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

// a get form only submits its own fields, the rest of the filter rides along hidden
const Carry = ({keep}: {keep: Record<string, string>}) => (
    <>
        {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
    </>
)

export default async function ExtrinsicsPage(props: PageProps<'/extrinsics'>) {
    const sp = await props.searchParams
    const chain = await chainProps()
    const {callKinds: kinds} = await callKinds()

    // anything the url offers has to match the chain before it reaches a query
    const pallet = kinds.some(k => k.pallet === str(sp.pallet)) ? str(sp.pallet) : ''
    const methods = pallet ? kinds.filter(k => k.pallet === pallet).map(k => k.method) : []
    const method = methods.includes(str(sp.method)) ? str(sp.method) : ''
    const rawSigner = str(sp.signer).trim()
    const signer = !rawSigner ? '' : HEX_ID.test(rawSigner) ? rawSigner.toLowerCase() : (ss58TryDecode(rawSigner, chain.ss58) ?? '')
    const result = str(sp.result) === 'success' || str(sp.result) === 'failed' ? (str(sp.result) as 'success' | 'failed') : undefined
    const after = DAY.test(str(sp.after)) ? str(sp.after) : ''
    const before = DAY.test(str(sp.before)) ? str(sp.before) : ''
    const page = Math.max(1, Number(sp.page) || 1)

    const filter: ExtrinsicFilter = {pallet, method, signer, result, after, before}
    const pallets = [...new Set(kinds.map(k => k.pallet))].sort()
    const {rows, total, counts, leaves} = await extrinsicsPage(PAGE, (page - 1) * PAGE, filter, pallets)

    const href = (patch: Record<string, string>) => {
        const q = new URLSearchParams()
        const merged = {pallet, method, signer: rawSigner, result: result ?? '', after, before, ...patch}
        for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v)
        return `/extrinsics${q.size ? `?${q}` : ''}`
    }

    return (
        <div>
            <div className="mt-6 flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">Extrinsics</h1>
                <span className="text-xs text-sub">{fmtInt(total)} matching</span>
            </div>

            <div className="card mt-3 space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 w-14 text-xs text-sub">Pallet</span>
                    <FilterChip label="All" href={href({pallet: '', method: '', page: ''})} active={!pallet} />
                    {pallets
                        .filter(p => counts[p] > 0 || p === pallet)
                        .map(p => (
                            <FilterChip key={p} label={p} count={counts[p]} href={href({pallet: p, method: '', page: ''})} active={p === pallet} />
                        ))}
                </div>
                {pallet && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1 w-14 text-xs text-sub">Method</span>
                        <FilterChip label="All" href={href({method: '', page: ''})} active={!method} />
                        {methods.map(m => (
                            <FilterChip key={m} label={m} href={href({method: m, page: ''})} active={m === method} />
                        ))}
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 w-14 text-xs text-sub">Result</span>
                    <FilterChip label="All" href={href({result: '', page: ''})} active={!result} />
                    <FilterChip label="Success" href={href({result: 'success', page: ''})} active={result === 'success'} />
                    <FilterChip label="Failed" href={href({result: 'failed', page: ''})} active={result === 'failed'} />
                </div>
                <form className="flex flex-wrap items-center gap-2 text-xs" action="/extrinsics">
                    <span className="mr-1 w-14 text-xs text-sub">Date</span>
                    <Carry keep={{pallet, method, signer: rawSigner, result: result ?? ''}} />
                    <input type="date" name="after" defaultValue={after} className={FIELD} />
                    <span className="text-faint">to</span>
                    <input type="date" name="before" defaultValue={before} className={FIELD} />
                    <button type="submit" className={`${FIELD} hover:text-accent`}>
                        Apply
                    </button>
                    {(after || before) && (
                        <Link href={href({after: '', before: '', page: ''})} className="text-accent hover:underline">
                            clear
                        </Link>
                    )}
                </form>
                <form className="flex flex-wrap items-center gap-2 text-xs" action="/extrinsics">
                    <span className="mr-1 w-14 text-xs text-sub">Signer</span>
                    <Carry keep={{pallet, method, result: result ?? '', after, before}} />
                    <input
                        name="signer"
                        defaultValue={rawSigner}
                        placeholder="ss58 or hex account"
                        spellCheck={false}
                        className={`${FIELD} w-[34ch] font-mono`}
                    />
                    <button type="submit" className={`${FIELD} hover:text-accent`}>
                        Apply
                    </button>
                    {signer && <AccountLink addr={ss58Encode(signer, chain.ss58)} />}
                    {rawSigner && !signer && <span className="text-neg">not an address</span>}
                    {rawSigner && (
                        <Link href={href({signer: '', page: ''})} className="text-accent hover:underline">
                            clear
                        </Link>
                    )}
                </form>
            </div>

            <div className="card mt-4 overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_max-content_max-content_minmax(18ch,1fr)_max-content_max-content]">
                    <thead>
                        <tr>
                            <th>Extrinsic</th>
                            <th>Block</th>
                            <th>
                                <TimeModeButton />
                            </th>
                            <th>Call</th>
                            <th>Signer</th>
                            <th>Result</th>
                            <th className="text-right">Fee</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-6 text-sub">
                                    Nothing matches.
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
                                <td>
                                    {x.signer ? <AccountLink addr={ss58Encode(x.signer.id, chain.ss58)} acc={x.signer} /> : <span className="text-faint">unsigned</span>}
                                </td>
                                <td>
                                    <Tag text={x.success ? 'Success' : 'Failed'} tone={x.success ? 'pos' : 'neg'} />
                                </td>
                                <td className="text-right font-mono">{x.fee ? fmtBalance(x.fee, chain.decimals) : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pager page={page} pageCount={Math.max(1, Math.ceil(total / PAGE))} href={n => href({page: String(n)})} />
        </div>
    )
}
