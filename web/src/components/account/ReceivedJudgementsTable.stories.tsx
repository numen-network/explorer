import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {RegistrarRow} from '@/lib/gql'
import {numn} from '../../../../mock/fixtures.js'
import {CHAIN, REGISTRARS} from '../../../../mock/fixtures/accounts.js'
import {ReceivedJudgementsTable, type ReceivedJudgement} from './ReceivedJudgementsTable'

const meta = {title: 'Pages/Account/Identity | Judgements'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const seat = (registrar: number) => (REGISTRARS as RegistrarRow[]).find(r => r.index === registrar)
const verdict = (registrar: number, kind: string): ReceivedJudgement => ({registrar, kind, fee: kind === 'FeePaid' ? numn(2.5) : undefined, seat: seat(registrar)})

const table = (rows: ReceivedJudgement[]) => (
    <Card size="flush">
        <ReceivedJudgementsTable rows={rows} chain={CHAIN} />
    </Card>
)

const cells = (root: HTMLElement, registrar: number) => [...within(root).getByText(`#${registrar}`).closest('tr')!.cells].map(c => c.textContent)

// a seated registrar names its account, a verdict with no fee reserves nothing
export const One: Story = {
    render: () => table([verdict(0, 'Reasonable')]),
    play: async ({canvasElement}) => expect(cells(canvasElement, 0)).toEqual(['#0Polaris Guild', 'Reasonable', '—']),
}

// registrar 3 is retired and holds the fee paid to it
export const RetiredRegistrar: Story = {
    render: () => table([verdict(3, 'FeePaid')]),
    play: async ({canvasElement}) => expect(cells(canvasElement, 3)).toEqual(['#3Retired', 'FeePaid', '2.5 NUMN']),
}
