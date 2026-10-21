import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {ss58Encode} from '@/lib/ss58'
import {chainInfo, PEOPLE} from '../../../mock/fixtures.js'
import {expectFits, expectNoHangingDots, expectTimesFit} from '../../.storybook/fit'
import AccountLink from './AccountLink'
import DotRow from './DotRow'
import {TimeCell} from './TimeCell'

const meta = {
    title: 'Components/DotRow',
    // the card the referendum header sits on
    decorators: [
        Story => (
            <Card size="flush" className="w-fit max-w-full px-7 py-5">
                <Story />
            </Card>
        ),
    ],
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const [polaris] = PEOPLE
const ISO = '2026-09-30T12:00:00.000Z'

const who = <AccountLink addr={ss58Encode(polaris.id, chainInfo.ss58)} acc={polaris} />
const track = (
    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs text-muted-foreground">
        Medium Spender
    </Badge>
)
const when = (
    <span className="-ml-0.5 text-muted-foreground">
        <TimeCell iso={ISO} cycle />
    </span>
)

export const ThreeFacts: Story = {
    render: () => (
        <DotRow className="text-xs">
            {who}
            {track}
            {when}
        </DotRow>
    ),
}

export const OneFact: Story = {
    render: () => <DotRow className="text-xs">{who}</DotRow>,
    play: async ({canvas}) => expect(canvas.queryByText('·')).toBeNull(),
}

export const MissingFactsLeaveNoDot: Story = {
    render: () => (
        <DotRow className="text-xs">
            {who}
            {null}
            {false}
            {when}
        </DotRow>
    ),
    play: async ({canvas}) => expect(canvas.getAllByText('·')).toHaveLength(1),
}

// a dot that would end a line moves down with the fact after it
export const WrapsInNarrowColumn: Story = {
    render: () => (
        <div className="max-w-64">
            <DotRow className="text-xs">
                {who}
                {track}
                {when}
            </DotRow>
        </div>
    ),
    play: async ({canvasElement}) => {
        expectNoHangingDots(canvasElement)
        expectFits(canvasElement.querySelector('.max-w-64')!, canvasElement.querySelector('[data-slot=card]')!)
    },
}

// a fact longer than the line breaks under its own dot, which keeps to the
// fact's first line
export const LongFactWrapsUnderItsDot: Story = {
    render: () => (
        <div className="max-w-56">
            <DotRow className="text-xs">
                {who}
                {track}
                {when}
            </DotRow>
        </div>
    ),
    play: async ({canvas, canvasElement}) => {
        const age = canvas.getByText(/ ago$/)
        await expect(age.nextElementSibling!.getBoundingClientRect().top).toBeGreaterThanOrEqual(age.getBoundingClientRect().bottom)
        expectNoHangingDots(canvasElement)
        expectTimesFit(canvasElement)
        expectFits(canvasElement.querySelector('.max-w-56')!)
    },
}
