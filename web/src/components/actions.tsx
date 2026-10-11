'use client'
import {useEffect, useMemo, useState} from 'react'
import {parseAsInteger, useQueryStates} from 'nuqs'
import {Search} from 'lucide-react'
import {useDebouncedCallback} from 'use-debounce'
import AccountLink from '@/components/AccountLink'
import Approx from '@/components/Approx'
import {columnsFor, DataTable} from '@/components/DataTable'
import Dropdown from '@/components/Dropdown'
import Pager from '@/components/Pager'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {BlockLink} from '@/components/links'
import {Card} from '@/components/ui/card'
import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group'
import {actionFilters, type ActionKind, type ActionMove} from '@/lib/actionFilters'
import {fmtInt, fmtPctMove, sentenceCase} from '@/lib/format'
import type {IdentityRef} from '@/lib/identity'
import type {Paging} from '@/lib/paging'
import {NONE} from '@/components/Detail'

export interface ActionActor {
    addr: string
    acc?: IdentityRef
}

export interface ActionImpact {
    approval: [part: bigint, whole: bigint]
    support: [part: bigint, whole: bigint]
}

export type ActionRow =
    | {id: string; block: number; iso: string; actor: ActionActor; amount: string; own: string; delegated: string; impact?: ActionImpact; kind: 'vote' | 'remove'; decision: string}
    | {id: string; block: number; iso: string; actor: ActionActor; amount: string; own: string; delegated: string; impact?: ActionImpact; kind: 'delegate' | 'undelegate'; by: ActionActor}

const TONE: Record<string, string> = {aye: 'text-good', nay: 'text-destructive'}

// radix reserves the empty item value for its placeholder, the catch-all
// entries carry their own sentinels instead
const KINDS: {value: ActionKind | 'all'; label: string}[] = [
    {value: 'all', label: 'All actions'},
    {value: 'vote', label: 'Vote'},
    {value: 'remove', label: 'Remove vote'},
    {value: 'delegate', label: 'Delegate'},
    {value: 'undelegate', label: 'Undelegate'},
]

const MOVES: {value: ActionMove | 'any'; label: string}[] = [
    {value: 'any', label: 'All impact'},
    {value: 'approval-up', label: 'Approval up'},
    {value: 'approval-down', label: 'Approval down'},
    {value: 'support-up', label: 'Support up'},
    {value: 'support-down', label: 'Support down'},
]

// branches by switch because typescript 7.0 fails to narrow the negation of
// an or-combined discriminant guard
function Action({a}: {a: ActionRow}) {
    switch (a.kind) {
        case 'vote':
        case 'remove':
            return (
                <span>
                    {a.kind === 'vote' ? 'Voted' : 'Removed'} <span className={TONE[a.decision] ?? 'text-muted-foreground'}>{sentenceCase(a.decision)}</span>
                </span>
            )
        default:
            return (
                <span className="flex flex-col">
                    {a.kind === 'delegate' ? 'Delegated by' : 'Undelegated by'}
                    <AccountLink addr={a.by.addr} acc={a.by.acc} />
                </span>
            )
    }
}

function Delta({label, value: [part, whole]}: {label: string; value: [part: bigint, whole: bigint]}) {
    const tone = part > 0n ? 'text-good' : part < 0n ? 'text-destructive' : 'text-muted-foreground'
    return (
        <div>
            <span className="text-muted-foreground">{label} </span>
            <span className={tone}>{fmtPctMove(part, whole)}</span>
        </div>
    )
}

// a search goes out once typing pauses this long, a cleared box at once
const PAUSE_MS = 300

// the pager's keys ride along so that a new filter starts over at the first
// page of the default size
const URL_KEYS = {...actionFilters, page: parseAsInteger, size: parseAsInteger}
const FIRST_PAGE = {page: null, size: null}

const col = columnsFor<ActionRow>()

interface Props {
    rows: ActionRow[]
    total: number
    filtered: boolean
    paging: Paging
    href: string
    decimals: number
    symbol: string
}

// the filters live in the url, each change asks the server for the rows again
export default function ActionList({rows, total, filtered, paging, href, decimals, symbol}: Props) {
    const [{q, action, impact}, setFilters] = useQueryStates(URL_KEYS, {shallow: false, history: 'push', scroll: false})
    // the box holds what is typed and the url takes it in one write once typing
    // pauses. nuqs debounces each key on its own timer, which can write q apart
    // from the paging it resets
    const [text, setText] = useState(q)
    const search = useDebouncedCallback((text: string) => setFilters({q: text, ...FIRST_PAGE}), PAUSE_MS)
    // back and forward bring the box along and drop a search still waiting
    useEffect(() => {
        search.cancel()
        setText(q)
    }, [q, search])
    const type = (value: string) => {
        setText(value)
        search(value)
        if (!value) search.flush()
    }
    // a pick takes what the box holds along at once
    const pick = (filter: {action: ActionKind | null} | {impact: ActionMove | null}) => {
        search.cancel()
        setFilters({q: text, ...filter, ...FIRST_PAGE})
    }
    const columns = useMemo(
        () => [
            col.display({id: 'block', header: 'Block', cell: ({row}) => <BlockLink height={row.original.block} />}),
            col.display({id: 'time', header: () => <TimeModeButton />, cell: ({row}) => <TimeCell iso={row.original.iso} />}),
            col.display({id: 'account', header: 'Account', cell: ({row}) => <AccountLink addr={row.original.actor.addr} acc={row.original.actor.acc} />}),
            col.display({id: 'action', header: 'Action', meta: {className: 'w-full'}, cell: ({row}) => <Action a={row.original} />}),
            col.display({
                id: 'amount',
                header: 'Amount',
                meta: {align: 'right', cellClassName: 'font-mono'},
                cell: ({row}) => (
                    <>
                        <Approx planck={row.original.amount} decimals={decimals} symbol={symbol} />
                        {row.original.delegated !== '0' && (
                            <div className="text-xs text-dim">
                                <Approx planck={row.original.own} decimals={decimals} /> + <Approx planck={row.original.delegated} decimals={decimals} /> delegated
                            </div>
                        )}
                    </>
                ),
            }),
            col.display({
                id: 'impact',
                header: 'Impact',
                meta: {align: 'right', cellClassName: 'font-mono text-xs'},
                cell: ({row}) =>
                    row.original.impact ? (
                        <>
                            <Delta label="Approval" value={row.original.impact.approval} />
                            <Delta label="Support" value={row.original.impact.support} />
                        </>
                    ) : (
                        NONE
                    ),
            }),
        ],
        [decimals, symbol]
    )
    return (
        <div>
            <Card size="flush">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                    <h2 className="text-[15px] font-semibold">
                        Actions <span className="font-normal text-dim">({fmtInt(total)})</span>
                    </h2>
                    <div className="flex w-full flex-wrap items-center gap-2 text-sm sm:w-auto">
                        <InputGroup className="w-full bg-card sm:w-90">
                            <InputGroupAddon className="pr-[3px] pl-3">
                                <Search className="size-[15px] text-dim" />
                            </InputGroupAddon>
                            <InputGroupInput
                                value={text}
                                onChange={e => type(e.target.value)}
                                placeholder="Search address or identity"
                                spellCheck={false}
                                className="pr-3 text-sm placeholder:text-dim"
                            />
                        </InputGroup>
                        <Dropdown className="w-[150px] grow sm:grow-0" value={action ?? 'all'} options={KINDS} onChange={v => pick({action: v === 'all' ? null : v})} />
                        <Dropdown className="w-[150px] grow sm:grow-0" value={impact ?? 'any'} options={MOVES} onChange={v => pick({impact: v === 'any' ? null : v})} />
                    </div>
                </div>
                <div className="mt-1">
                    <DataTable columns={columns} rows={rows} empty={filtered ? 'No matching actions.' : 'No actions.'} getRowId={a => a.id} />
                </div>
            </Card>
            <Pager paging={paging} total={total} href={href} />
        </div>
    )
}
