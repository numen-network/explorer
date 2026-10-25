import type {CSSProperties, ReactNode} from 'react'
import {ChevronRight} from 'lucide-react'
import Link from 'next/link'
import {cn} from 'cn'
import AccountLink from '@/components/AccountLink'
import {JsonBlock, NONE} from '@/components/Detail'
import {BlockLink, BountyLink, ReferendumLink} from '@/components/links'
import RegistrarSeat from '@/components/RegistrarSeat'
import SegmentedControl from '@/components/SegmentedControl'
import {TimeCell} from '@/components/TimeCell'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import {Tabs, TabsContent} from '@/components/ui/tabs'
import type {ArgNode, Preimage} from '@/lib/args'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtCount, fmtInt} from '@/lib/format'
import {ss58Encode} from '@/lib/ss58'

type Ctx = {chain: ChainProps; short?: boolean}

// enum variants nest, Origins(BigSpender) reads as a cell per variant and
// the innermost one stands as the value when it carries nothing
function split(node: ArgNode): {lead: string[]; tail: ArgNode | string} {
    const lead: string[] = []
    let rest: ArgNode | null = node
    while (rest?.kind === 'variant') {
        lead.push(rest.name)
        rest = rest.inner
    }
    return rest ? {lead, tail: rest} : {lead: lead.slice(0, -1), tail: lead.at(-1)!}
}

const isBlock = (tail: ArgNode | string) => typeof tail !== 'string' && (tail.kind === 'fields' || tail.kind === 'list' || tail.kind === 'call')

// a table of fields, bare or under a call, lays out on the columns of the one holding it
const isSubtable = (tail: ArgNode | string) => typeof tail !== 'string' && (tail.kind === 'fields' || tail.kind === 'call')

// the columns a node takes from where it starts, a key column, one per
// variant depth and whatever a table nested in a row takes in turn
function span(node: ArgNode): number {
    if (node.kind === 'call') return span(node.args)
    if (node.kind !== 'fields') return 1
    const rows = node.fields.map(([, n]) => {
        const {lead, tail} = split(n)
        return lead.length + (typeof tail === 'string' ? 1 : span(tail))
    })
    return 1 + Math.max(1, ...rows)
}

const CELL = 'px-3 py-1.5'

function Inline({node, ctx}: {node: ArgNode; ctx: Ctx}): ReactNode {
    switch (node.kind) {
        case 'none':
            return NONE
        case 'plain':
            return node.text
        case 'hex':
            return (
                <>
                    <span className="font-code text-xs">{node.hex}</span>
                    {node.preimage && <PreimageFold preimage={node.preimage} ctx={ctx} />}
                </>
            )
        case 'account':
            return <AccountLink full={!ctx.short} addr={ss58Encode(node.id, ctx.chain.ss58)} acc={node.acc} />
        case 'amount':
            return (
                <>
                    <span className="whitespace-nowrap">{fmtBalance(node.planck, ctx.chain.decimals)}</span> <span className="text-muted-foreground">{ctx.chain.symbol}</span>
                </>
            )
        case 'gasPrice':
            return (
                <>
                    <span className="whitespace-nowrap">{fmtBalance(node.wei, 9)}</span> <span className="text-muted-foreground">gwei</span>
                </>
            )
        case 'time':
            return <TimeCell iso={node.iso} cycle />
        case 'block':
            return <BlockLink height={node.height} />
        case 'bounty':
            return <BountyLink index={node.index} title={node.title} />
        case 'referendum':
            return <ReferendumLink index={node.index} title={node.title} />
        case 'spend':
            return (
                <>
                    <span className="font-mono">#{fmtInt(node.index)}</span>
                    {node.referendum && (
                        <>
                            {' · '}
                            <Link href={`/referendum/${node.referendum.index}`} className="text-primary hover:underline">
                                {node.referendum.title ?? `Referendum #${fmtInt(node.referendum.index)}`}
                            </Link>
                        </>
                    )}
                </>
            )
        case 'registrar':
            return <RegistrarSeat index={node.index} account={node.account} ss58={ctx.chain.ss58} />
        case 'delay':
            return <span className="whitespace-nowrap">{fmtCount(node.blocks, 'block')}</span>
        case 'vote':
            return (
                <>
                    {node.aye ? 'Aye' : 'Nay'} <span className="text-muted-foreground">{node.conviction}x conviction</span>
                </>
            )
        case 'listed':
            return (
                <>
                    {node.label} <span className="text-dim">· listed below</span>
                </>
            )
        case 'text':
            if (!node.text.includes('\n')) return node.text
            return (
                <>
                    <div className="mb-1 text-xs text-muted-foreground">{fmtCount(node.bytes, 'byte')} · UTF-8</div>
                    <div className="max-h-48 overflow-auto leading-relaxed whitespace-pre-wrap">{node.text}</div>
                </>
            )
        default:
            return null
    }
}

// a hash the index knows opens onto what it was a hash of, the way the
// transaction page opens its input bytes
function PreimageFold({preimage, ctx}: {preimage: Preimage; ctx: Ctx}) {
    const tab = preimage.kind === 'text' ? 'text' : 'call'
    return (
        <Collapsible className="group/preimage mt-1 text-xs text-muted-foreground">
            <div className="wrap-break-word">
                <CollapsibleTrigger className="inline cursor-pointer">
                    <ChevronRight className="mr-1.5 inline size-3.5 align-[-0.2em] text-dim transition-transform group-data-[state=open]/preimage:rotate-90" />
                    {preimage.kind} of
                </CollapsibleTrigger>{' '}
                <Link href={`/referendum/${preimage.referendum}?tab=${tab}`} className="font-mono whitespace-nowrap text-primary hover:underline">
                    Referendum #{fmtInt(preimage.referendum)}
                </Link>
                {preimage.title && ` · ${preimage.title}`}
            </div>
            <CollapsibleContent className="mt-2">
                {preimage.kind === 'text' ? (
                    <div className="max-h-48 overflow-y-auto rounded-lg border bg-background px-3 py-2 font-sans whitespace-pre-wrap text-foreground">{preimage.text}</div>
                ) : preimage.call ? (
                    <ArgsTable node={preimage.call} chain={ctx.chain} />
                ) : (
                    NONE
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}

function Tail({tail, ctx, depth, sub = false}: {tail: ArgNode | string; ctx: Ctx; depth: number; sub?: boolean}) {
    if (typeof tail === 'string') return <div className={CELL}>{tail}</div>
    if (isBlock(tail)) return <Body node={tail} ctx={ctx} depth={depth + 1} sub={sub} />
    return (
        <div className={cn(CELL, 'wrap-anywhere')}>
            <Inline node={tail} ctx={ctx} />
        </div>
    )
}

// variant cells, then the value running to the end of the row from the grid
// column the row sets in --at. in a narrow table the cells of a variant holding
// a table of its own make a row above that table. a table of fields in a row of
// fields takes up the columns left to it
function Cells({node, ctx, depth, sub = false}: {node: ArgNode; ctx: Ctx; depth: number; sub?: boolean}) {
    const {lead, tail} = split(node)
    const spread = sub && isSubtable(tail)
    const above = isBlock(tail) && lead.length > 0
    return (
        <>
            <div className={cn('contents', above && '@max-xs:col-span-full @max-xs:flex @max-xs:border-b @max-xs:*:last:border-r-0')}>
                {lead.map((name, i) => (
                    <div key={i} className={cn(CELL, 'border-r whitespace-nowrap [grid-column:calc(var(--at)+var(--i))]')} style={{'--i': i} as CSSProperties}>
                        {name}
                    </div>
                ))}
            </div>
            <div className={cn('min-w-0 flex-1 [grid-column:calc(var(--at)+var(--lead))/-1]', spread && 'grid grid-cols-subgrid', above && '@max-xs:[grid-column:1/-1]')} style={{'--lead': lead.length} as CSSProperties}>
                <Tail tail={tail} ctx={ctx} depth={depth} sub={spread} />
            </div>
        </>
    )
}

function Body({node, ctx, depth, sub = false}: {node: ArgNode; ctx: Ctx; depth: number; sub?: boolean}) {
    if (node.kind === 'fields') return <Fields node={node} ctx={ctx} depth={depth} sub={sub} />
    if (node.kind === 'list') return <List node={node} ctx={ctx} depth={depth} />
    if (node.kind === 'call')
        return (
            <>
                <div className={cn(CELL, 'border-b font-mono', sub && 'col-span-full')}>{node.name}</div>
                <Body node={node.args} ctx={ctx} depth={depth} sub={sub} />
            </>
        )
    return (
        <div className="flex">
            <Cells node={node} ctx={ctx} depth={depth} />
        </div>
    )
}

// keys and variant cells line up down the whole table through subgrid, one
// column per variant depth, and so do the keys of the tables nested in it. in a
// narrow table a row holding a table of its own puts its key on a line above
// and starts its cells from the first column, a narrower one does the same for
// a row of variant cells, and a very narrow one for every row
function Fields({node, ctx, depth, sub}: {node: Extract<ArgNode, {kind: 'fields'}>; ctx: Ctx; depth: number; sub: boolean}) {
    const columns = [...Array<string>(span(node) - 1).fill('max-content'), 'minmax(0,1fr)'].join(' ')
    return (
        <div className={cn('grid grid-cols-(--cols)', sub && 'col-span-full grid-cols-subgrid')} style={{'--cols': columns} as CSSProperties}>
            {node.fields.map(([key, value]) => {
                const {lead, tail} = split(value)
                const tagged = lead.length > 0
                const nested = isBlock(tail)
                return (
                    <div key={key} className={cn('col-span-full grid grid-cols-subgrid border-t [--at:2] first:border-t-0 @max-[12rem]:[--at:1]', tagged && '@max-xs:[--at:1]', nested && '@max-lg:[--at:1]')}>
                        <div className={cn(CELL, 'border-r text-muted-foreground @max-[12rem]:col-span-full @max-[12rem]:border-r-0 @max-[12rem]:border-b', depth === 0 && 'bg-background', tagged && '@max-xs:col-span-full @max-xs:border-r-0 @max-xs:border-b', nested && '@max-lg:col-span-full @max-lg:border-r-0 @max-lg:border-b')}>
                            {key}
                        </div>
                        <Cells node={value} ctx={ctx} depth={depth} sub />
                    </div>
                )
            })}
        </div>
    )
}

// a column spans one table column per variant depth, so variant cells line up
// down the list
function List({node, ctx, depth}: {node: Extract<ArgNode, {kind: 'list'}>; ctx: Ctx; depth: number}) {
    const cell = {...ctx, short: true}
    const leads = node.columns.map((_, j) => Math.max(0, ...node.rows.map(row => split(row[j]).lead.length)))
    return (
        <Table className="text-[13px]">
            <TableHeader>
                <TableRow className="bg-background hover:bg-background">
                    <TableHead className="h-auto w-px px-3 py-1.5 text-xs font-medium text-muted-foreground first:pl-3">#</TableHead>
                    {node.columns.map((c, j) => (
                        <TableHead key={j} colSpan={leads[j] + 1} className="h-auto border-l px-3 py-1.5 text-xs font-medium text-muted-foreground last:pr-3">
                            {c}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {node.rows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                        <TableCell className="px-3 py-1.5 align-top text-muted-foreground first:pl-3">{fmtInt(i)}</TableCell>
                        {row.flatMap((v, j) => {
                            const {lead, tail} = split(v)
                            return [
                                ...lead.map((name, k) => (
                                    <TableCell key={`${j}.${k}`} className="w-px border-l px-3 py-1.5 align-top">
                                        {name}
                                    </TableCell>
                                )),
                                <TableCell key={j} colSpan={leads[j] - lead.length + 1} className="border-l p-0 align-top last:pr-0">
                                    <Tail tail={tail} ctx={cell} depth={depth} />
                                </TableCell>,
                            ]
                        })}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

/** Call arguments as nested tables, each value drawn the way its runtime type reads. */
export function ArgsTable({node, chain}: {node: ArgNode; chain: ChainProps}) {
    return (
        <div data-slot="args-table" className="@container overflow-hidden rounded-lg border bg-card text-[13px]">
            <Body node={node} ctx={{chain}} depth={0} />
        </div>
    )
}

/** Switches a Tabs root between the args table and the raw JSON the indexer stored. */
export function ArgsToggle({className}: {className?: string}) {
    return (
        <SegmentedControl
            options={[
                ['table', 'Table'],
                ['json', 'JSON'],
            ]}
            size="sm"
            className={className}
        />
    )
}

/** Args as a table with the raw JSON one click away, or only the JSON when no runtime describes them. */
export function ArgsView({node, raw, chain}: {node: ArgNode | null; raw: unknown; chain: ChainProps}) {
    if (!node) return <JsonBlock value={raw} />
    return (
        <Tabs defaultValue="table" className="gap-2">
            <ArgsToggle className="self-end" />
            <TabsContent value="table">
                <ArgsTable node={node} chain={chain} />
            </TabsContent>
            <TabsContent value="json">
                <JsonBlock value={raw} />
            </TabsContent>
        </Tabs>
    )
}
