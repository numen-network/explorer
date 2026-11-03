import type {ReactNode} from 'react'
import {Runtime} from '@subsquid/substrate-runtime'
import {Info} from 'lucide-react'
import CopyBtn from '@/components/CopyBtn'
import HashText from '@/components/HashText'
import {ReferendumLink} from '@/components/links'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import type {ChainProps} from '@/lib/chain'
import {referendumRuntime, specVersionAt, type RuntimeCodeRow} from '@/lib/gql'
import {knownRuntime} from '@/lib/runtime'
import {runtimeDiff, type Change} from '@/lib/runtimeDiff'

const VARIANT = {Added: 'pos', Removed: 'neg', Changed: 'warn'} as const

// rows sit one step in from their section title
const INDENT = 'first:pl-9'

const NULL = <span className="text-muted-foreground">Null</span>

function ChangeBadge({change}: {change: Change}) {
    return <Badge variant={VARIANT[change]}>{change}</Badge>
}

function Name({name, doc}: {name: string; doc?: string}) {
    return (
        <>
            <div className="break-words whitespace-normal">{name}</div>
            {doc && <div className="mt-0.5 text-xs whitespace-normal text-muted-foreground">{doc}</div>}
        </>
    )
}

function Value({value}: {value: ReactNode}) {
    return <div className="wrap-anywhere whitespace-normal">{value ?? NULL}</div>
}

// same column widths on every table, so they line up down the tab
function Section({title, head, rows}: {title: string; head: [string, string, string]; rows: ReactNode[][]}) {
    return (
        <section className="border-b pt-5 last:border-b-0">
            <h3 className="mb-2 px-5 text-sm font-semibold">{title}</h3>
            <Table className="min-w-[640px] table-fixed">
                <colgroup>
                    <col />
                    <col className="w-[170px]" />
                    <col className="w-[170px]" />
                </colgroup>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        {head.map((h, i) => (
                            <TableHead key={h} className={i === 0 ? INDENT : undefined}>
                                {h}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className={`text-muted-foreground ${INDENT}`}>
                                No changes
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((cells, i) => (
                            <TableRow key={i}>
                                {cells.map((cell, j) => (
                                    <TableCell key={j} className={j === 0 ? INDENT : undefined}>
                                        {cell}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </section>
    )
}

function CodeHash({hash}: {hash: string}) {
    return (
        <span className="inline-flex items-center gap-1">
            <HashText hash={hash} />
            <CopyBtn text={hash} />
        </span>
    )
}

function versionRows(code: RuntimeCodeRow, previous: Runtime, before: {index: number; hash: string} | null): ReactNode[][] {
    const version = previous.getConstant('System.Version') as {implVersion: number; transactionVersion: number}
    const changed = (name: string, was: number, is: number | null): ReactNode[][] => (is != null && is !== was ? [[<Name key="n" name={name} />, was, is]] : [])
    return [
        [<Name key="n" name="Code hash" />, before ? <CodeHash key="p" hash={before.hash} /> : <span className="text-muted-foreground">—</span>, <CodeHash key="v" hash={code.id} />],
        [
            <Name key="n" name="Spec version" />,
            <span key="p" className="inline-flex items-center gap-1.5">
                {previous.specVersion}
                {before && <ReferendumLink index={before.index} />}
            </span>,
            <Value key="v" value={code.specVersion} />,
        ],
        ...changed('Impl version', version.implVersion, code.implVersion),
        ...changed('Transaction version', version.transactionVersion, code.transactionVersion),
    ]
}

// the proposed runtime against the one it replaces, the runtime at replacedAt
// or the current one while the referendum can still enact
export async function upgradePanel({index, replacedAt, headSpec, chain}: {index: number; replacedAt: number | null; headSpec: number; chain: ChainProps}) {
    const replaced = replacedAt != null ? await specVersionAt(replacedAt) : headSpec
    const {code, before} = await referendumRuntime(index, replaced ?? headSpec)
    const previous = knownRuntime(replaced ?? headSpec)
    const next = code.metadata && code.specVersion != null ? new Runtime({specName: code.specName!, specVersion: code.specVersion, implName: code.specName!, implVersion: code.implVersion!}, code.metadata) : null
    const diff = next && runtimeDiff(previous, next, chain.decimals, chain.symbol)
    return (
        <Card size="flush">
            <Tip text="Compared from runtime metadata. Changes to logic or permissions don't show up here.">
                <span className="mx-5 mt-4 inline-flex w-fit items-center gap-1 text-xs text-muted-foreground">
                    <Info className="size-3.5" />
                    Interface changes only
                </span>
            </Tip>
            <Section title="Spec" head={['Version', 'Previous', 'New Value']} rows={versionRows(code, previous, before)} />
            {diff && (
                <>
                    <Section title="Constants" head={['Constant', 'Previous', 'New Value']} rows={diff.constants.map(c => [<Name key="n" name={c.name} doc={c.doc} />, <Value key="p" value={c.previous} />, <Value key="v" value={c.next} />])} />
                    <Section title="Pallets" head={['Pallet', 'Change', 'Calls']} rows={diff.pallets.map(p => [<Name key="n" name={p.name} />, <ChangeBadge key="c" change={p.change} />, p.calls])} />
                    <Section title="Calls" head={['Call', 'Change', 'Arguments']} rows={diff.calls.map(c => [<Name key="n" name={c.name} doc={c.doc} />, <ChangeBadge key="c" change={c.change} />, <Value key="a" value={c.args.join(', ') || '—'} />])} />
                </>
            )}
        </Card>
    )
}
