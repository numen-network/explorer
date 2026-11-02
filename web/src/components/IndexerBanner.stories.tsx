import type {Decorator, Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, mocked, spyOn, waitFor} from 'storybook/test'
import {HEAD, chainInfo} from '../../../mock/fixtures.js'
import IndexerBanner from './IndexerBanner'
import SearchBar from './SearchBar'

// the layout puts the banner under the search bar, which also keeps a story with no banner from rendering blank
const underSearchBar: Decorator = Story => (
    <div>
        <div className="mt-5">
            <SearchBar />
        </div>
        <Story />
    </div>
)

export default {title: 'Components/IndexerBanner', component: IndexerBanner, decorators: [underSearchBar]} satisfies Meta<typeof IndexerBanner>
type Story = StoryObj<typeof IndexerBanner>

const ago = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString()
const heads = (indexed: number, best: number, indexedAt: string | null) => ({best, finalized: indexed, indexed, indexedAt})

const status = (indexed: number, best: number, age: () => string | null): Story => ({
    render: args => <IndexerBanner {...args} rendered={heads(indexed, best, age())} renderedAt={Date.now()} />,
    args: {blockTime: chainInfo.blockTime},
})

export const InSync = status(HEAD, HEAD, () => ago(4))

export const Behind = status(HEAD, HEAD + 4_000, () => ago(4))

export const FarBehindFromGenesis = status(12, HEAD, () => ago(4))

// genesis carries no timestamp, so an index holding nothing past it has no age to tell a stall by
export const OnlyGenesisIndexed: Story = {
    ...status(0, 3, () => null),
    play: async ({canvas}) => expect(canvas.queryByRole('alert')).toBeNull(),
}

export const OnlyGenesisIndexedFarBehind: Story = {
    ...status(0, HEAD, () => null),
    play: async ({canvas}) => expect(canvas.getByRole('alert')).toHaveTextContent('Indexer is 1,000,000 blocks behind the chain head at #1,000,000.'),
}

export const StalledMinutes = status(HEAD, HEAD, () => ago(5 * 60))

// most of the way to a fourth hour
export const StalledHours: Story = {
    ...status(HEAD, HEAD, () => ago(3 * 3600 + 2400)),
    play: async ({canvas}) => {
        await expect(canvas.getByText(/^No new block indexed for/)).toHaveTextContent('No new block indexed for 3 hours.')
    },
}

export const StalledDays = status(HEAD, HEAD, () => ago(4 * 86400))

// the layout renders once per visit, the banner leaves once a poll finds the index caught up
export const ClearsOnPoll: Story = {
    ...status(HEAD, HEAD + 4_000, () => ago(4)),
    args: {blockTime: 0.02},
    beforeEach: () => {
        spyOn(globalThis, 'fetch')
        mocked(globalThis.fetch).mockImplementation(async () => Response.json(heads(HEAD + 4_000, HEAD + 4_000, ago(1))))
        return () => mocked(globalThis.fetch).mockRestore()
    },
    play: async ({canvas}) => {
        await expect(canvas.getByRole('alert')).toBeInTheDocument()
        await waitFor(() => expect(canvas.queryByRole('alert')).toBeNull())
    },
}
