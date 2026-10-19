import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {expect, within} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {SUBJECT} from '../../../mock/fixtures/accounts.js'
import {chainInfo} from '../../../mock/fixtures.js'
import {expectFits, expectHalves} from '../../.storybook/fit'
import AddressText, {shortAddr} from './AddressText'
import {Table, TableBody, TableCell, TableRow} from './ui/table'

const meta = {title: 'Components/AddressText'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const SS58 = ss58Encode(SUBJECT, chainInfo.ss58)

function Case({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-4 py-2 font-mono text-sm">
            <span className="font-sans text-xs text-muted-foreground">{label}</span>
            <span className="min-w-0 break-all">{children}</span>
        </div>
    )
}

export const Short: Story = {
    render: () => (
        <Case label="ss58">
            <AddressText addr={SS58} />
        </Case>
    ),
}

export const Full: Story = {
    render: () => (
        <Case label="ss58">
            <AddressText full addr={SS58} />
        </Case>
    ),
}

// a line wraps a full address to fit. a table cell narrower than sm keeps 7…4
// so the other columns stay in view, a wider column too narrow for the full
// address splits it at the middle
export const FullInLineAndCell: Story = {
    render: () => (
        <div className="max-w-72 space-y-3 font-mono text-sm">
            <div>
                <AddressText full addr={SS58} />
            </div>
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell>
                            <AddressText full addr={SS58} />
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    ),
    play: async ({canvas}) => {
        const [line, cell] = canvas.getAllByText(SS58)
        await expect(line).toBeVisible()
        expectFits(line.parentElement!)
        if (!matchMedia('(width < 40rem)').matches) {
            expectHalves(cell)
            return
        }
        await expect(cell).not.toBeVisible()
        await expect(within(cell.closest('td')!).getByText(shortAddr(SS58))).toBeVisible()
    },
}
