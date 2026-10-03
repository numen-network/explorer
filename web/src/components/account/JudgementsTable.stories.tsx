import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import type {JudgementRow} from '@/lib/gql'
import {CHAIN, JUDGEMENT_KINDS, judgementsGiven} from '../../../../mock/fixtures/accounts.js'
import {JudgementsTable} from './JudgementsTable'

const meta = {title: 'Components/Account/JudgementsTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: JudgementRow[]) => (
    <Card size="flush">
        <JudgementsTable rows={rows} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table([])}

export const One: Story = {render: () => table(judgementsGiven(1))}

export const EveryKind: Story = {render: () => table(judgementsGiven(JUDGEMENT_KINDS.length))}

export const Many: Story = {render: () => table(judgementsGiven(20))}
