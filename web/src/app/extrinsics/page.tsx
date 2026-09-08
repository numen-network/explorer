import Link from 'next/link'
import AccountLink from '@/components/AccountLink'
import DateRange from '@/components/DateRange'
import {ExtrinsicsTable} from '@/components/ExtrinsicsTable'
import Pager from '@/components/Pager'
import {FilterChip} from '@/components/pills'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Field} from '@/components/ui/field'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {chainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {callKinds, extrinsicsPage, type ExtrinsicFilter} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {ss58Encode, ss58TryDecode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Extrinsics'}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const HEX_ID = /^0x[0-9a-fA-F]{64}$/

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

// a get form only submits its own fields, the rest of the filter rides along hidden
const Carry = ({keep}: {keep: Record<string, string>}) => (
    <>
        {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
    </>
)

const LABEL = 'mr-1 w-14 text-xs font-normal text-muted-foreground'
const FIELD = 'h-auto rounded-lg bg-card px-2.5 py-1 text-xs font-normal hover:bg-card hover:text-primary'

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
    const pg = paging(sp)

    const filter: ExtrinsicFilter = {pallet, method, signer, result, after, before}
    const pallets = [...new Set(kinds.map(k => k.pallet))].sort()
    const {rows, total, counts, leaves} = await extrinsicsPage(pg.size, pg.offset, filter, pallets)

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
                <span className="text-xs text-muted-foreground">{fmtInt(total)} matching</span>
            </div>

            <Card size="flush" className="mt-3 space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={LABEL}>Pallet</span>
                    <FilterChip label="All" href={href({pallet: '', method: '', page: ''})} active={!pallet} />
                    {pallets
                        .filter(p => counts[p] > 0 || p === pallet)
                        .map(p => (
                            <FilterChip key={p} label={p} count={counts[p]} href={href({pallet: p, method: '', page: ''})} active={p === pallet} />
                        ))}
                </div>
                {pallet && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={LABEL}>Method</span>
                        <FilterChip label="All" href={href({method: '', page: ''})} active={!method} />
                        {methods.map(m => (
                            <FilterChip key={m} label={m} href={href({method: m, page: ''})} active={m === method} />
                        ))}
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <span className={LABEL}>Result</span>
                    <FilterChip label="All" href={href({result: '', page: ''})} active={!result} />
                    <FilterChip label="Success" href={href({result: 'success', page: ''})} active={result === 'success'} />
                    <FilterChip label="Failed" href={href({result: 'failed', page: ''})} active={result === 'failed'} />
                </div>
                <form action="/extrinsics">
                    <Field orientation="horizontal" className="flex-wrap gap-2 text-xs">
                        <Label className={LABEL}>Date</Label>
                        <Carry keep={{pallet, method, signer: rawSigner, result: result ?? ''}} />
                        <DateRange key={`${after}|${before}`} after={after} before={before} />
                        <Button type="submit" variant="outline" className={FIELD}>
                            Apply
                        </Button>
                        {(after || before) && (
                            <Link href={href({after: '', before: '', page: ''})} className="text-primary hover:underline">
                                clear
                            </Link>
                        )}
                    </Field>
                </form>
                <form action="/extrinsics">
                    <Field orientation="horizontal" className="flex-wrap gap-2 text-xs">
                        <Label htmlFor="signer" className={LABEL}>
                            Signer
                        </Label>
                        <Carry keep={{pallet, method, result: result ?? '', after, before}} />
                        <Input id="signer" name="signer" defaultValue={rawSigner} placeholder="ss58 or hex account" spellCheck={false} className="h-auto w-[34ch] rounded-lg bg-card px-2.5 py-1 font-mono text-xs md:text-xs" />
                        <Button type="submit" variant="outline" className={FIELD}>
                            Apply
                        </Button>
                        {signer && <AccountLink addr={ss58Encode(signer, chain.ss58)} />}
                        {rawSigner && !signer && <span className="text-destructive">not an address</span>}
                        {rawSigner && (
                            <Link href={href({signer: '', page: ''})} className="text-primary hover:underline">
                                clear
                            </Link>
                        )}
                    </Field>
                </form>
            </Card>

            <Card size="flush" className="mt-4">
                <ExtrinsicsTable rows={rows} leaves={Object.fromEntries(leaves)} chain={chain} view="list" empty="Nothing matches." />
            </Card>
            <Pager paging={pg} total={total} href={href({})} />
        </div>
    )
}
