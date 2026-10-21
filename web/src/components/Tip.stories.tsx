import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import Link from 'next/link'
import {expect, screen, waitFor} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {account, chainInfo} from '../../../mock/fixtures.js'
import {Tip} from './Tip'

const meta = {title: 'Components/Tip'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const HASH = '0x568b1433558b12a0588b1759578b15c65a8b1a7f598b18ec5c8b1da55b8b1c12'

const hovered: Story = {
    play: async ({canvas, userEvent}) => {
        await userEvent.hover(canvas.getByText('hover me'))
        await expect(await screen.findByRole('tooltip')).toBeInTheDocument()
    },
}

// opens the tip, then reads the lines its text takes and whether it stays on
// screen, leaving out the copy Radix keeps for screen readers
async function openTip({canvas, userEvent}: Parameters<NonNullable<Story['play']>>[0]) {
    await userEvent.hover(canvas.getByText('hover me'))
    await screen.findByRole('tooltip')
    const tip = document.querySelector('[data-slot=tooltip-content]')!
    const range = document.createRange()
    range.selectNodeContents(tip.firstChild!)
    const box = tip.getBoundingClientRect()
    return {lines: new Set([...range.getClientRects()].map(r => Math.round(r.top))).size, onScreen: box.left >= -0.5 && box.right <= document.documentElement.clientWidth + 0.5}
}

// room above and beside the trigger so the open tip is in the shot
const Stage = ({children}: {children: React.ReactNode}) => <div className="px-6 pt-24 pb-6 text-sm">{children}</div>

export const ShortText: Story = {
    ...hovered,
    render: () => (
        <Stage>
            <Tip text="Download OBJ">
                <span className="text-primary underline">hover me</span>
            </Tip>
        </Stage>
    ),
}

// a hash keeps to one line from sm up, the tip widening to hold it, and breaks anywhere below sm
export const UnbrokenHash: Story = {
    render: () => (
        <Stage>
            <Tip text={HASH}>
                <span className="font-mono text-primary underline">hover me</span>
            </Tip>
        </Stage>
    ),
    play: async context => {
        const {lines, onScreen} = await openTip(context)
        await expect({oneLine: lines === 1, onScreen}).toEqual({oneLine: matchMedia('(width >= 40rem)').matches, onScreen: true})
    },
}

// a sentence wraps to the width of the tip
export const LongSentence: Story = {
    render: () => (
        <Stage>
            <Tip text="Accounts the chain has ever seen. An account joins the count on the day a block first touched it, and nothing removes it again.">
                <span className="text-primary underline">hover me</span>
            </Tip>
        </Stage>
    ),
    play: async context => {
        const {lines, onScreen} = await openTip(context)
        await expect({wraps: lines > 1, onScreen}).toEqual({wraps: true, onScreen: true})
    },
}

export const RichContent: Story = {
    ...hovered,
    render: () => (
        <Stage>
            <Tip
                align="start"
                className="flex-col items-start sm:max-w-md"
                text={
                    <>
                        <span className="font-mono">{ss58Encode(account(1), chainInfo.ss58)}</span>
                        <span className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-t border-current/25 pt-1.5">
                            <span className="opacity-60">Web</span>
                            <span className="truncate">polaris.example</span>
                            <span className="opacity-60">X</span>
                            <span className="truncate">@polaris_guild</span>
                        </span>
                    </>
                }
            >
                <span className="font-medium text-primary underline">hover me</span>
            </Tip>
        </Stage>
    ),
}

export const NoText: Story = {
    render: () => (
        <Stage>
            <Tip text="">
                <span className="text-primary underline">hover me</span>
            </Tip>
        </Stage>
    ),
    play: async ({canvas, userEvent}) => {
        await userEvent.hover(canvas.getByText('hover me'))
        await expect(screen.queryByRole('tooltip')).toBeNull()
    },
}

// a screen with no hover, the way a phone answers the media query the tip reads
const touchScreen = () => {
    const real = window.matchMedia
    window.matchMedia = (query: string) =>
        query === '(hover: none)'
            ? ({matches: true, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false} as MediaQueryList)
            : real.call(window, query)
    return () => {
        window.matchMedia = real
    }
}

// on a touch screen a tap opens the text, and a tap anywhere else closes it
export const TapOnTouch: Story = {
    beforeEach: touchScreen,
    render: () => (
        <Stage>
            <Tip text={HASH}>
                <span>tap me</span>
            </Tip>
        </Stage>
    ),
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByText('tap me'))
        await expect(await screen.findByRole('dialog')).toHaveTextContent(HASH)
        await userEvent.click(document.body)
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    },
}

// a link keeps its tap for where it goes
export const TapOnTouchLink: Story = {
    beforeEach: touchScreen,
    render: () => (
        <Stage>
            <Tip text={HASH}>
                <Link href="/blocks" className="text-primary underline">
                    tap me
                </Link>
            </Tip>
        </Stage>
    ),
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByText('tap me'))
        await new Promise(r => setTimeout(r, 300))
        await expect(screen.queryByRole('dialog')).toBeNull()
    },
}
