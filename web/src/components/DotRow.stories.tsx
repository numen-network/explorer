import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {ss58Encode} from '@/lib/ss58'
import {chainInfo, PEOPLE} from '../../../mock/fixtures.js'
import {expectDotsBetweenFacts, expectFits, expectNoHangingDots, expectTimesFit} from '../../.storybook/fit'
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
    <span className="text-muted-foreground">
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
    play: async ({canvasElement}) => expectDotsBetweenFacts(canvasElement),
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
    play: async ({canvasElement}) => {
        await expect(canvasElement.querySelector('[data-slot=dot-row]')!.children).toHaveLength(2)
        expectDotsBetweenFacts(canvasElement)
    },
}

// a dot that would end a line moves down with the fact after it and stays
// hidden at the start of the new line
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
        expectDotsBetweenFacts(canvasElement)
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
        expectDotsBetweenFacts(canvasElement)
        expectTimesFit(canvasElement)
        expectFits(canvasElement.querySelector('.max-w-56')!)
    },
}

// end-aligned facts carry their dot after them, so a line never starts on one
export const EndAlignedWraps: Story = {
    render: () => (
        <div className="max-w-28 text-right text-xs">
            <DotRow align="end">
                <span>#12,500,000</span>
                <span>in 3y 7mo</span>
            </DotRow>
        </div>
    ),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('in 3y 7mo').getBoundingClientRect().top).toBeGreaterThanOrEqual(canvas.getByText('#12,500,000').getBoundingClientRect().bottom)
        expectDotsBetweenFacts(canvasElement)
    },
}
