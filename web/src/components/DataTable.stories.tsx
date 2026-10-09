import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {fmtInt, shortHash} from '@/lib/format'
import {columnsFor, DataTable, expander, type Columns} from './DataTable'

const meta = {title: 'Components/DataTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

interface Row {
    id: string
    height: number
    hash: string
    method: string
    events: number
    fee: string
}

const row = (i: number): Row => ({
    id: String(i),
    height: 1_000_000 - i * 7,
    hash: '0x' + (i + 10).toString(16).repeat(64).slice(0, 64),
    method: ['transfer_keep_alive', 'remark', 'vote', 'batch_all'][i % 4],
    events: 3 + ((i * 5) % 11),
    fee: `0.0${105 + i} NUMN`,
})

const ROWS = Array.from({length: 20}, (_, i) => row(i))

const col = columnsFor<Row>()

const columns: Columns<Row> = [
    col.display({id: 'height', header: 'Height', cell: ({row}) => <span className="font-mono text-primary">#{fmtInt(row.original.height)}</span>}),
    col.display({id: 'hash', header: 'Hash', meta: {cellClassName: 'font-mono text-xs text-muted-foreground'}, cell: ({row}) => shortHash(row.original.hash)}),
    col.display({id: 'method', header: 'Call', meta: {className: 'w-full'}, cell: ({row}) => row.original.method}),
    col.display({id: 'events', header: 'Events', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => row.original.events}),
    col.display({id: 'fee', header: 'Fee', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => row.original.fee}),
]

const wide: Columns<Row> = [
    col.display({id: 'height', header: 'Height', cell: ({row}) => <span className="font-mono text-primary">#{fmtInt(row.original.height)}</span>}),
    col.display({id: 'hash', header: 'Hash', meta: {cellClassName: 'font-mono text-xs text-muted-foreground'}, cell: ({row}) => row.original.hash}),
    col.display({id: 'parent', header: 'Parent hash', meta: {cellClassName: 'font-mono text-xs text-muted-foreground'}, cell: ({row}) => row.original.hash.split('').reverse().join('')}),
    col.display({id: 'method', header: 'Call', cell: ({row}) => row.original.method}),
    col.display({id: 'events', header: 'Events', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => row.original.events}),
    col.display({id: 'fee', header: 'Fee', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => row.original.fee}),
]

const detail = (r: Row) => (
    <div className="border-t bg-background px-5 py-3 font-mono text-xs break-all text-muted-foreground">
        {r.method} emitted {r.events} events, block hash {r.hash}
    </div>
)

const table = (node: React.ReactNode) => <Card size="flush">{node}</Card>

export const EmptyDefault: Story = {render: () => table(<DataTable columns={columns} rows={[]} />)}

export const EmptyCustom: Story = {render: () => table(<DataTable columns={columns} rows={[]} empty="No extrinsics in this block." emptyClassName="py-10 text-center" />)}

export const OneRow: Story = {render: () => table(<DataTable columns={columns} rows={ROWS.slice(0, 1)} getRowId={r => r.id} />)}

export const ManyRows: Story = {render: () => table(<DataTable columns={columns} rows={ROWS} getRowId={r => r.id} />)}

export const Headless: Story = {render: () => table(<DataTable columns={columns} rows={ROWS.slice(0, 3)} head={false} getRowId={r => r.id} />)}

export const WideScrollsSideways: Story = {render: () => <div className="max-w-xl">{table(<DataTable columns={wide} rows={ROWS.slice(0, 5)} getRowId={r => r.id} />)}</div>}

export const ExpandableCollapsed: Story = {render: () => table(<DataTable columns={[...columns, expander(col)]} rows={ROWS.slice(0, 4)} getRowId={r => r.id} canExpand={r => r.events > 5} expand={detail} />)}

export const ExpandableBoxedOpen: Story = {
    render: () => table(<DataTable columns={[...columns, expander(col, true)]} rows={ROWS.slice(0, 4)} getRowId={r => r.id} canExpand={() => true} expand={detail} />),
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByText('#1,000,000'))
        await expect(canvas.getAllByRole('button', {name: 'expand'})[0]).toHaveAttribute('aria-expanded', 'true')
    },
}
