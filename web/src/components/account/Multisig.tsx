import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {TabNav} from '@/components/Tabs'
import {Card} from '@/components/ui/card'
import {fmtInt} from '@/lib/format'
import {markArgs} from '@/lib/argMarks'
import {withCallViews} from '@/lib/args'
import {accountRefs, membershipsFor, multisigCalls, multisigOpsFor, signatoriesOf, type MultisigOpRow, type MultisigSet} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {MembershipTable} from './MembershipTable'
import type {MultisigCall} from './MultisigDetail'
import {MultisigTable} from './MultisigTable'
import {SignatoryTable} from './SignatoryTable'
import {tabHref, type TabCtx} from './shared'

const ADDRESS = 'multisig'
const SIGNATORY = 'multisig-signatory'

export async function MultisigAddress({hex, addr, chain, sp, set}: TabCtx & {set: MultisigSet}) {
    const view = sp.mtab === 'signatories' ? 'signatories' : 'operations'
    return (
        <>
            <TabNav
                aria-label="As a multisig address"
                items={[
                    {label: 'Operations', count: set.operations, href: tabHref(addr, ADDRESS, {mtab: 'operations'}), active: view === 'operations'},
                    {label: 'Signatories', count: set.signatories.length, href: tabHref(addr, ADDRESS, {mtab: 'signatories'}), active: view === 'signatories'},
                ]}
            />
            <div className="mt-4">{view === 'operations' ? <AddressOperations hex={hex} addr={addr} chain={chain} sp={sp} /> : <Signatories hex={hex} chain={chain} set={set} />}</div>
        </>
    )
}

// what the expanded rows of a page show, loaded with the page
async function details(ops: MultisigOpRow[]) {
    const ids = ops.flatMap(op => (op.call ? [op.call.id] : []))
    const people = [...new Set(ops.flatMap(op => [...op.signatories, ...op.timeline.map(s => s.account)]))]
    const [trees, refs] = await Promise.all([multisigCalls(ids), accountRefs(people)])
    const views = trees.map(t => ({calls: withCallViews(t.calls), total: t.total}))
    await markArgs(views.flatMap(t => t.calls.map(c => c.view)))
    return {
        calls: Object.fromEntries(ids.map((id, i) => [id, views[i]])) as Record<string, MultisigCall>,
        accounts: Object.fromEntries(refs.accounts.map(a => [a.id, a])),
    }
}

async function AddressOperations({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {multisigOps, conn} = await multisigOpsFor(hex, 'address', pg.size, pg.offset)
    const {calls, accounts} = await details(multisigOps)
    return (
        <>
            <Card size="flush">
                <MultisigTable rows={multisigOps} side="address" hex={hex} calls={calls} accounts={accounts} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, ADDRESS, {mtab: 'operations'})} />
        </>
    )
}

async function Signatories({hex, chain, set}: Pick<TabCtx, 'hex' | 'chain'> & {set: MultisigSet}) {
    const rows = await signatoriesOf(hex, set.signatories)
    return (
        <>
            <StatTile
                label="Threshold"
                value={`${fmtInt(set.threshold)} of ${fmtInt(set.signatories.length)}`}
                beside={[
                    {label: 'Pending', value: fmtInt(set.pending)},
                    {label: 'Operations', value: fmtInt(set.operations)},
                ]}
                row
                className="mb-3"
            />
            <Card size="flush">
                <SignatoryTable rows={rows} chain={chain} />
            </Card>
        </>
    )
}

export async function MultisigSignatory({hex, addr, chain, sp, operations, memberships}: TabCtx & {operations: number; memberships: number}) {
    const view = sp.mtab === 'memberships' ? 'memberships' : 'operations'
    return (
        <>
            <TabNav
                aria-label="As a multisig signatory"
                items={[
                    {label: 'Operations', count: operations, href: tabHref(addr, SIGNATORY, {mtab: 'operations'}), active: view === 'operations'},
                    {label: 'Memberships', count: memberships, href: tabHref(addr, SIGNATORY, {mtab: 'memberships'}), active: view === 'memberships'},
                ]}
            />
            <div className="mt-4">{view === 'operations' ? <SignatoryOperations hex={hex} addr={addr} chain={chain} sp={sp} /> : <Memberships hex={hex} addr={addr} chain={chain} sp={sp} />}</div>
        </>
    )
}

async function SignatoryOperations({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {multisigOps, conn} = await multisigOpsFor(hex, 'signatory', pg.size, pg.offset)
    const {calls, accounts} = await details(multisigOps)
    return (
        <>
            <Card size="flush">
                <MultisigTable rows={multisigOps} side="signatory" hex={hex} calls={calls} accounts={accounts} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, SIGNATORY, {mtab: 'operations'})} />
        </>
    )
}

async function Memberships({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {multisigs, conn} = await membershipsFor(hex, pg.size, pg.offset)
    return (
        <>
            <Card size="flush">
                <MembershipTable rows={multisigs} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, SIGNATORY, {mtab: 'memberships'})} />
        </>
    )
}
