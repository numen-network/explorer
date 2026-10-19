import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {expect, within} from 'storybook/test'
import {shortHash} from '@/lib/format'
import {SUBJECT_EVM} from '../../../mock/fixtures/accounts.js'
import {hashOf} from '../../../mock/fixtures.js'
import {expectFits, expectHalves} from '../../.storybook/fit'
import HashText from './HashText'
import {Table, TableBody, TableCell, TableRow} from './ui/table'

const meta = {title: 'Components/HashText'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const HASH = hashOf('block', 1)

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
            <Case label="H256">
                <HashText hash={HASH} />
            </Case>
            <Case label="H160">
                <HashText hash={SUBJECT_EVM} />
            </Case>
        </>
    ),
}

export const Full: Story = {
    render: () => (
        <>
            <Case label="H256">
                <HashText full hash={HASH} />
            </Case>
            <Case label="H160">
                <HashText full hash={SUBJECT_EVM} />
            </Case>
        </>
    ),
}

// a line wraps a full hash to fit. a table cell narrower than sm keeps 0x4…4
// so the other columns stay in view, a wider column too narrow for the full
// hash splits it at the middle
export const FullInLineAndCell: Story = {
    render: () => (
        <div className="max-w-72 space-y-3 font-mono text-sm">
            {[HASH, SUBJECT_EVM].map(hash => (
                <div key={hash}>
                    <HashText full hash={hash} />
                </div>
            ))}
            <Table>
                <TableBody>
                    {[HASH, SUBJECT_EVM].map(hash => (
                        <TableRow key={hash}>
                            <TableCell>
                                <HashText full hash={hash} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    ),
    play: async ({canvas}) => {
        const narrow = matchMedia('(width < 40rem)').matches
        for (const hash of [HASH, SUBJECT_EVM]) {
            const [line, cell] = canvas.getAllByText(hash)
            await expect(line).toBeVisible()
            expectFits(line.parentElement!)
            if (!narrow) {
                expectHalves(cell)
                continue
            }
            await expect(cell).not.toBeVisible()
            await expect(within(cell.closest('td')!).getByText(shortHash(hash))).toBeVisible()
        }
    },
}
