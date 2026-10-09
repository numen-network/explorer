import Link from 'next/link'
import AccountLink from '@/components/AccountLink'
import DateRange from '@/components/DateRange'
import {emptyText} from '@/components/EmptyList'
import {ExtrinsicsTable} from '@/components/ExtrinsicsTable'
import Pager from '@/components/Pager'
import {FilterSelect} from '@/components/pills'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Field} from '@/components/ui/field'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {chainDbHead, chainProps} from '@/lib/chain'
import {isDay} from '@/lib/day'
import {fmtInt} from '@/lib/format'
import {callKinds, extrinsicsPage, type ExtrinsicFilter} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {ss58Encode, ss58TryDecode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Extrinsics'}

const HEX_ID = /^0x[0-9a-fA-F]{64}$/

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

// a get form only submits its own fields, the rest of the filter rides along hidden
const Carry = ({keep}: {keep: Record<string, string>}) => (
    <>
        {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
    </>
)

const LABEL = 'mr-1 w-14 text-xs font-normal text-muted-foreground'
const RESULT_LABEL: Record<string, string> = {success: 'Success', failed: 'Failed'}
const FIELD = 'h-auto rounded-lg bg-card px-2.5 py-1 text-xs font-normal hover:bg-card hover:text-primary'

export default async function ExtrinsicsPage(props: PageProps<'/extrinsics'>) {
    const sp = await props.searchParams
    const [chain, head] = await Promise.all([chainProps(), chainDbHead()])
    const {callKinds: kinds} = await callKinds()

    // anything the url offers has to match the chain before it reaches a query
    const pallet = kinds.some(k => k.pallet === str(sp.pallet)) ? str(sp.pallet) : ''
    const methods = pallet ? kinds.filter(k => k.pallet === pallet).map(k => k.method) : []
    const method = methods.includes(str(sp.method)) ? str(sp.method) : ''
    const rawSigner = str(sp.signer).trim()
    const signer = !rawSigner ? '' : HEX_ID.test(rawSigner) ? rawSigner.toLowerCase() : (ss58TryDecode(rawSigner, chain.ss58) ?? '')
    const result = str(sp.result) === 'success' || str(sp.result) === 'failed' ? (str(sp.result) as 'success' | 'failed') : undefined
    const after = isDay(str(sp.after)) ? str(sp.after) : ''
    const before = isDay(str(sp.before)) ? str(sp.before) : ''
    const pg = paging(sp)

    const filter: ExtrinsicFilter = {pallet, method, signer, result, after, before}
    const pallets = [...new Set(kinds.map(k => k.pallet))].sort()
    const {rows, total, counts} = await extrinsicsPage(pg.size, pg.offset, filter, pallets)

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

            <Card size="flush" className="mt-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <FilterSelect label="Pallet" labelClassName={LABEL} values={pallets} counts={counts} value={pallet} href={p => href({pallet: p, method: '', page: ''})} />
                    {pallet && <FilterSelect label="Method" labelClassName={LABEL} values={methods} value={method} href={m => href({method: m, page: ''})} fit={kinds.map(k => k.method)} />}
                    <FilterSelect label="Result" labelClassName={LABEL} values={Object.keys(RESULT_LABEL)} labelOf={r => RESULT_LABEL[r]} value={result ?? ''} href={r => href({result: r, page: ''})} />
                    <form action="/extrinsics" className="min-w-0">
                        <Field orientation="horizontal" className="flex-wrap gap-2 text-xs">
                            <Label className={LABEL}>Date</Label>
                            <Carry keep={{pallet, method, signer: rawSigner, result: result ?? ''}} />
                            <DateRange key={`${after}|${before}`} after={after} before={before} lastDay={head.timestamp?.slice(0, 10) ?? null} />
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
                    <form action="/extrinsics" className="min-w-0">
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
                </div>
            </Card>

            <Card size="flush" className="mt-4">
                <ExtrinsicsTable rows={rows} chain={chain} view="list" empty={emptyText('extrinsics', Object.values(filter).some(Boolean))} />
            </Card>
            <Pager paging={pg} total={total} href={href({})} />
        </div>
    )
}
