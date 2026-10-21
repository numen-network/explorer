import {userEvent, within} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {withCallViews} from '@/lib/args'
import {type CallRow, type MultisigOpRow, type MultisigSide} from '@/lib/gql'
import {CHAIN, multisigCall, SUBJECT} from '../../../../mock/fixtures/accounts.js'
import {PEOPLE} from '../../../../mock/fixtures.js'
import type {MultisigCall} from './MultisigDetail'
import {MultisigTable} from './MultisigTable'

export const headers = (root: HTMLElement) => [...root.querySelectorAll('th')].map(th => th.textContent)
export const column = (root: HTMLElement, i: number) => [...root.querySelectorAll(':scope tbody > tr:not(:has(table))')].map(tr => tr.children[i].textContent)

const ACCOUNTS = Object.fromEntries(PEOPLE.map(p => [p.id, p]))

// an operation and the tree its call reads back as, the panel listing at most shown calls
export const withCall = (op: MultisigOpRow, spec: unknown, shown = Infinity) => {
    const tree = multisigCall(op.multisig, spec)
    return {op: {...op, call: tree.call}, tree: {calls: withCallViews(tree.calls.slice(0, shown) as CallRow[]), total: tree.calls.length}}
}

export const table = (rows: MultisigOpRow[], side: MultisigSide, calls: Record<string, MultisigCall> = {}) => (
    <Card size="flush">
        <MultisigTable rows={rows} side={side} hex={SUBJECT} calls={calls} accounts={ACCOUNTS} chain={CHAIN} />
    </Card>
)

export const expand = async (root: HTMLElement, row: number) => userEvent.click(within(root).getAllByRole('button', {name: 'expand'})[row])
