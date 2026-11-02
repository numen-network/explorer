import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {getRouter} from '@storybook/nextjs-vite/navigation.mock'
import {expect, mocked, spyOn, waitFor} from 'storybook/test'
import {BlockStatus, HeadsProvider} from './blockStatus'
import Refresh from './Refresh'

const meta = {title: 'Components/Refresh'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const HEIGHT = 1_000
const heads = (indexed: number, finalized: number) => ({best: indexed, finalized, indexed})

const polls = (...sequence: ReturnType<typeof heads>[]) => {
    spyOn(globalThis, 'fetch')
    mocked(globalThis.fetch).mockImplementation(async () => Response.json(sequence.length > 1 ? sequence.shift() : sequence[0]))
    return () => mocked(globalThis.fetch).mockRestore()
}

// one refresh per new block a poll finds, none for a poll that brings nothing new
export const FollowsNewBlocks: Story = {
    render: () => (
        <HeadsProvider heads={heads(HEIGHT, HEIGHT - 2)}>
            <Refresh ms={20} />
        </HeadsProvider>
    ),
    beforeEach: () => polls(heads(HEIGHT, HEIGHT - 2), heads(HEIGHT + 1, HEIGHT - 1), heads(HEIGHT + 1, HEIGHT - 1), heads(HEIGHT + 2, HEIGHT)),
    play: async () => {
        await waitFor(() => expect(getRouter().refresh).toHaveBeenCalledTimes(2))
        await new Promise(resolve => setTimeout(resolve, 100))
        await expect(getRouter().refresh).toHaveBeenCalledTimes(2)
    },
}

// a poll only asks for a refresh, the marks keep to the heads the page rendered with
export const MarksWaitForTheRefresh: Story = {
    render: () => (
        <HeadsProvider heads={heads(HEIGHT, HEIGHT - 2)}>
            <BlockStatus height={HEIGHT} />
            <Refresh ms={20} />
        </HeadsProvider>
    ),
    beforeEach: () => polls(heads(HEIGHT + 1, HEIGHT)),
    play: async ({canvas}) => {
        await waitFor(() => expect(getRouter().refresh).toHaveBeenCalled())
        await expect(canvas.getByRole('img')).toHaveAttribute('aria-label', 'Confirming')
    },
}
