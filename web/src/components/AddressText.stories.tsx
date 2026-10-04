import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {expect, within} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {SUBJECT, SUBJECT_EVM} from '../../../mock/fixtures/accounts.js'
import {chainInfo} from '../../../mock/fixtures.js'
import {DESKTOP, expectFits, expectHalves, PHONE} from '../../.storybook/fit'
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
        <>
            <Case label="ss58">
                <AddressText addr={SS58} />
            </Case>
            <Case label="H160">
                <AddressText addr={SUBJECT_EVM} />
            </Case>
        </>
    ),
}

export const Full: Story = {
    render: () => (
        <>
            <Case label="ss58">
                <AddressText full addr={SS58} />
            </Case>
            <Case label="H160">
                <AddressText full addr={SUBJECT_EVM} />
            </Case>
        </>
    ),
}

// a phone line wraps a full address to fit, a table cell keeps 7…4 so the
// other columns stay in view
export const FullOnPhone: Story = {
    globals: PHONE,
    render: () => (
        <div className="space-y-3 font-mono text-sm">
            {[SS58, SUBJECT_EVM].map(addr => (
                <div key={addr}>
                    <AddressText full addr={addr} />
                </div>
            ))}
            <Table>
                <TableBody>
                    {[SS58, SUBJECT_EVM].map(addr => (
                        <TableRow key={addr}>
                            <TableCell>
                                <AddressText full addr={addr} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    ),
    play: async ({canvas}) => {
        for (const addr of [SS58, SUBJECT_EVM]) {
            const [line, cell] = canvas.getAllByText(addr)
            await expect(line).toBeVisible()
            expectFits(line.parentElement!)
            await expect(cell).not.toBeVisible()
            await expect(within(cell.closest('td')!).getByText(shortAddr(addr))).toBeVisible()
        }
    },
}

// a table column too narrow for a full address shrinks to half of it
export const FullSplitsAtTheMiddle: Story = {
    globals: DESKTOP,
    render: () => (
        <div className="w-72 font-mono text-sm">
            <Table>
                <TableBody>
                    {[SS58, SUBJECT_EVM].map(addr => (
                        <TableRow key={addr}>
                            <TableCell>
                                <AddressText full addr={addr} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    ),
    play: async ({canvas}) => {
        for (const addr of [SS58, SUBJECT_EVM]) expectHalves(canvas.getByText(addr))
    },
}
