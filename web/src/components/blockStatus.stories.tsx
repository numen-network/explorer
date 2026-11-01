import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {useState} from 'react'
import {expect, mocked, spyOn, userEvent, waitFor} from 'storybook/test'
import {BlockStatus, LiveHeads} from './blockStatus'

const HEIGHT = 1_000
const heads = (indexed: number, finalized: number) => ({best: indexed, finalized, indexed})
const mark = (canvas: {queryByRole: (role: 'img') => HTMLElement | null}) => canvas.queryByRole('img')?.getAttribute('aria-label')

function Refreshed({ms}: {ms: number}) {
    const [rendered, setRendered] = useState(heads(HEIGHT - 1, HEIGHT - 3))
    return (
        <>
            <button onClick={() => setRendered(heads(HEIGHT, HEIGHT - 2))}>refresh</button>
            <LiveHeads rendered={rendered} ms={ms}>
                <BlockStatus height={HEIGHT} />
            </LiveHeads>
        </>
    )
}

export default {title: 'Components/BlockStatus', component: Refreshed} satisfies Meta<typeof Refreshed>

// a block the page just refreshed in is marked by that same render, ahead of the next poll
export const RenderNewerThanPoll: StoryObj<typeof Refreshed> = {
    args: {ms: 3_600_000},
    play: async ({canvas}) => {
        await expect(mark(canvas)).toBeUndefined()
        await userEvent.click(canvas.getByRole('button', {name: 'refresh'}))
        await expect(mark(canvas)).toBe('Confirming')
    },
}

// a poll ahead of the page's last render moves the mark without waiting for a refresh
export const PollNewerThanRender: StoryObj<typeof Refreshed> = {
    args: {ms: 20},
    beforeEach: () => {
        spyOn(globalThis, 'fetch')
        mocked(globalThis.fetch).mockImplementation(async () => Response.json(heads(HEIGHT + 2, HEIGHT)))
        return () => mocked(globalThis.fetch).mockRestore()
    },
    play: async ({canvas}) => {
        await waitFor(() => expect(mark(canvas)).toBe('Finalized'))
    },
}
