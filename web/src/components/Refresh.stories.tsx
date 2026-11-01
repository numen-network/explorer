import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {getRouter} from '@storybook/nextjs-vite/navigation.mock'
import {useState} from 'react'
import {expect, mocked, spyOn, userEvent, waitFor} from 'storybook/test'
import {BlockStatus, LiveHeads} from './blockStatus'
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
        <LiveHeads rendered={heads(HEIGHT, HEIGHT - 2)} ms={20}>
            <Refresh />
        </LiveHeads>
    ),
    beforeEach: () => polls(heads(HEIGHT, HEIGHT - 2), heads(HEIGHT + 1, HEIGHT - 1), heads(HEIGHT + 1, HEIGHT - 1), heads(HEIGHT + 2, HEIGHT)),
    play: async () => {
        await waitFor(() => expect(getRouter().refresh).toHaveBeenCalledTimes(2))
        await new Promise(resolve => setTimeout(resolve, 100))
        await expect(getRouter().refresh).toHaveBeenCalledTimes(2)
    },
}

// a page opened while the layout's heads lag doesn't refresh on arrival
export const SkipsArrival: Story = {
    render: function Arrival() {
        const [arrived, setArrived] = useState(false)
        return (
            <LiveHeads rendered={heads(HEIGHT, HEIGHT - 2)} ms={20}>
                <button onClick={() => setArrived(true)}>arrive</button>
                <BlockStatus height={HEIGHT} />
                {arrived && <Refresh />}
            </LiveHeads>
        )
    },
    beforeEach: () => polls(heads(HEIGHT + 1, HEIGHT)),
    play: async ({canvas}) => {
        await waitFor(() => expect(canvas.getByRole('img')).toHaveAttribute('aria-label', 'Finalized'))
        await userEvent.click(canvas.getByRole('button', {name: 'arrive'}))
        await new Promise(resolve => setTimeout(resolve, 100))
        await expect(getRouter().refresh).not.toHaveBeenCalled()
    },
}
