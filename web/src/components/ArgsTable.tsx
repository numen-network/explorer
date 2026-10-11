import type {ReactNode} from 'react'
import {ChevronRight} from 'lucide-react'
import Link from 'next/link'
import {cn} from 'cn'
import AccountLink from '@/components/AccountLink'
import {JsonBlock, NONE} from '@/components/Detail'
import {BlockLink, ReferendumLink} from '@/components/links'
import {TabSwitch} from '@/components/Tabs'
import {Badge} from '@/components/ui/badge'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import {Tabs, TabsContent} from '@/components/ui/tabs'
import type {ArgNode, Preimage} from '@/lib/args'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtCount, fmtInt} from '@/lib/format'
import {ss58Encode} from '@/lib/ss58'

type Ctx = {chain: ChainProps; short?: boolean}

// enum variants nest, Origins(BigSpender) reads as two tags in a row
function peel(node: ArgNode): {tags: string[]; rest: ArgNode | null} {
    const tags: string[] = []
    let rest: ArgNode | null = node
    while (rest?.kind === 'variant') {
        tags.push(rest.name)
        rest = rest.inner
    }
    return {tags, rest}
}

const isBlock = (node: ArgNode | null) => node != null && (node.kind === 'fields' || node.kind === 'list' || node.kind === 'call')

const Tag = ({name}: {name: string}) => (
    <Badge variant="outline" className="font-mono text-muted-foreground">
        {name}
    </Badge>
)

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
                <span className="whitespace-nowrap">
                    {fmtBalance(node.planck, ctx.chain.decimals)} <span className="text-muted-foreground">{ctx.chain.symbol}</span>
                </span>
            )
        case 'block':
            return <BlockLink height={node.height} />
        case 'referendum':
            return <ReferendumLink index={node.index} />
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

// a value that is a table of its own, a struct, a list or a call, under the
// tags of whatever enum wraps it
function Nested({node, ctx, depth}: {node: ArgNode; ctx: Ctx; depth: number}) {
    const {tags, rest} = peel(node)
    const call = rest?.kind === 'call' ? rest : null
    const head = tags.length > 0 || call
    return (
        <>
            {head && (
                <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-1.5">
                    {tags.map(t => (
                        <Tag key={t} name={t} />
                    ))}
                    {call && <span className="font-mono">{call.name}</span>}
                </div>
            )}
            {call ? <Body node={call.args} ctx={ctx} depth={depth} /> : rest && <Body node={rest} ctx={ctx} depth={depth} />}
        </>
    )
}

function Body({node, ctx, depth}: {node: ArgNode; ctx: Ctx; depth: number}) {
    if (node.kind === 'fields') return <Fields fields={node.fields} ctx={ctx} depth={depth} />
    if (node.kind === 'list') return <List node={node} ctx={ctx} depth={depth} />
    return <Nested node={node} ctx={ctx} depth={depth} />
}

function Value({node, ctx, depth}: {node: ArgNode; ctx: Ctx; depth: number}) {
    const {tags, rest} = peel(node)
    if (isBlock(rest)) return <Nested node={node} ctx={ctx} depth={depth + 1} />
    return (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {tags.map(t => (
                <Tag key={t} name={t} />
            ))}
            {rest && (
                <div className="min-w-0 wrap-anywhere">
                    <Inline node={rest} ctx={ctx} />
                </div>
            )}
        </div>
    )
}

// keys line up down the whole table through subgrid. in a narrow table a row
// holding a table of its own puts its key on a line above it, and in a very
// narrow one every row does
function Fields({fields, ctx, depth}: {fields: [string, ArgNode][]; ctx: Ctx; depth: number}) {
    return (
        <div className="grid grid-cols-[max-content_minmax(0,1fr)]">
            {fields.map(([key, node]) => {
                const nested = isBlock(peel(node).rest)
                return (
                    <div key={key} className={cn('col-span-full grid grid-cols-subgrid border-t first:border-t-0 @max-[12rem]:block', nested && '@max-lg:block')}>
                        <div className={cn('border-r px-3 py-1.5 text-muted-foreground @max-[12rem]:border-r-0 @max-[12rem]:border-b', depth === 0 && 'bg-background', nested && '@max-lg:border-r-0 @max-lg:border-b')}>{key}</div>
                        <div className={cn('min-w-0', !nested && 'px-3 py-1.5')}>
                            <Value node={node} ctx={ctx} depth={depth} />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function List({node, ctx, depth}: {node: Extract<ArgNode, {kind: 'list'}>; ctx: Ctx; depth: number}) {
    const cell = {...ctx, short: true}
    return (
        <Table className="text-[13px]">
            <TableHeader>
                <TableRow className="bg-background hover:bg-background">
                    <TableHead className="h-auto w-px px-3 py-1.5 text-xs font-medium text-muted-foreground first:pl-3">#</TableHead>
                    {node.columns.map((c, i) => (
                        <TableHead key={i} className="h-auto border-l px-3 py-1.5 text-xs font-medium text-muted-foreground last:pr-3">
                            {c}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {node.rows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                        <TableCell className="px-3 py-1.5 align-top text-muted-foreground first:pl-3">{fmtInt(i)}</TableCell>
                        {row.map((v, j) => (
                            <TableCell key={j} className={cn('border-l align-top', isBlock(peel(v).rest) ? 'p-0 last:pr-0' : 'px-3 py-1.5 last:pr-3')}>
                                <Value node={v} ctx={cell} depth={depth + 1} />
                            </TableCell>
                        ))}
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
        <TabSwitch
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
