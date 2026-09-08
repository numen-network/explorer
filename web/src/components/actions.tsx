'use client'
import {useMemo, useState} from 'react'
import {Search} from 'lucide-react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {BlockLink} from '@/components/links'
import {Card} from '@/components/ui/card'
import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {fmtApprox, fmtInt, sentenceCase} from '@/lib/format'
import {identityLabel, type IdentityRef} from '@/lib/identity'
import {NONE} from '@/components/Detail'

export interface ActionActor {
    addr: string
    acc?: IdentityRef
}

export interface ActionImpact {
    approval: number
    support: number
}

export type ActionRow =
    | {id: string; block: number; iso: string; actor: ActionActor; amount: string; own: string; delegated: string; impact?: ActionImpact; kind: 'vote' | 'remove'; decision: string}
    | {id: string; block: number; iso: string; actor: ActionActor; amount: string; own: string; delegated: string; impact?: ActionImpact; kind: 'delegate' | 'undelegate'; by: ActionActor}

const TONE: Record<string, string> = {aye: 'text-good', nay: 'text-destructive'}

// both the cell and the filter call a move flat once it rounds to 0.00
const FLAT = 0.005

// radix reserves the empty item value for its placeholder, the catch-all
// entries carry their own sentinels instead
const KINDS = [
    {value: 'all', label: 'All actions'},
    {value: 'vote', label: 'Vote'},
    {value: 'remove', label: 'Remove vote'},
    {value: 'delegate', label: 'Delegate'},
    {value: 'undelegate', label: 'Undelegate'},
]

const MOVES = [
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
                <span className="block">
                    {a.kind === 'delegate' ? 'Delegated by' : 'Undelegated by'}
                    <AccountLink addr={a.by.addr} acc={a.by.acc} />
                </span>
            )
    }
}

function Delta({label, value}: {label: string; value: number}) {
    const flat = Math.abs(value) < FLAT
    const tone = flat ? 'text-muted-foreground' : value > 0 ? 'text-good' : 'text-destructive'
    return (
        <div>
            <span className="text-muted-foreground">{label} </span>
            <span className={tone}>{flat ? '0.00%' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`}</span>
        </div>
    )
}

function Picker({value, options, onChange}: {value: string; options: {value: string; label: string}[]; onChange: (v: string) => void}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[150px] gap-2 bg-card py-1.5 pr-2.5 pl-3 hover:bg-background data-[size=default]:h-auto [&_svg]:size-3.5">
                <SelectValue>{options.find(o => o.value === value)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start" className="border shadow-lg ring-0">
                {options.map(o => (
                    <SelectItem key={o.value} value={o.value} className="gap-3 py-1.5 pl-3 [&_svg]:text-primary">
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

const moveHit = (i: ActionImpact | undefined, move: string) => {
    if (i == null) return false
    const v = move.startsWith('approval') ? i.approval : i.support
    if (Math.abs(v) < FLAT) return false
    return move.endsWith('up') ? v > 0 : v < 0
}

const hay = (a: ActionRow) => {
    const names = (x: ActionActor) => [x.addr, identityLabel(x.acc) ?? '']
    const parts = a.kind === 'delegate' || a.kind === 'undelegate' ? [...names(a.actor), ...names(a.by)] : names(a.actor)
    return parts.join(' ').toLowerCase()
}

const col = columnsFor<ActionRow>()

export default function ActionList({rows, decimals, symbol}: {rows: ActionRow[]; decimals: number; symbol: string}) {
    const [query, setQuery] = useState('')
    const [kind, setKind] = useState('all')
    const [move, setMove] = useState('any')
    const needle = query.trim().toLowerCase()
    const shown = rows.filter(a => (kind === 'all' || a.kind === kind) && (move === 'any' || moveHit(a.impact, move)) && (needle === '' || hay(a).includes(needle)))
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
                        {fmtApprox(row.original.amount, decimals, symbol)}
                        {row.original.delegated !== '0' && (
                            <div className="text-xs text-dim">
                                {fmtApprox(row.original.own, decimals)} + {fmtApprox(row.original.delegated, decimals)} delegated
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
        <Card size="flush">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                <h2 className="text-[15px] font-semibold">
                    Actions <span className="font-normal text-dim">({fmtInt(shown.length)})</span>
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <InputGroup className="h-auto w-90 bg-card">
                        <InputGroupAddon className="pr-[3px] pl-3">
                            <Search className="size-[15px] text-dim" />
                        </InputGroupAddon>
                        <InputGroupInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Search address or identity" spellCheck={false} className="h-auto py-1.5 pr-3 text-sm placeholder:text-dim md:text-sm" />
                    </InputGroup>
                    <Picker value={kind} options={KINDS} onChange={setKind} />
                    <Picker value={move} options={MOVES} onChange={setMove} />
                </div>
            </div>
            {/* the height cap would bury the table's own x scrollbar, so the
                wrapper keeps both axes */}
            <div className="mt-1 max-h-120 overflow-auto">
                <DataTable columns={columns} rows={shown} empty={rows.length === 0 ? 'No actions.' : 'No matching actions.'} getRowId={a => a.id} />
            </div>
        </Card>
    )
}
