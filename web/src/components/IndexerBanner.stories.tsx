import type {Decorator, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {HEAD, chainInfo} from '../../../mock/fixtures.js'
import {pageMeta, pageStory} from '../../.storybook/page'
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

export default {title: 'Components/IndexerBanner', ...pageMeta(IndexerBanner), decorators: [underSearchBar]}

const ago = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString()

const status = (height: number, head: number, age: () => string | null) => pageStory({blocks: () => [{height, timestamp: age()}], chainInfos: [{...chainInfo, head}]})

export const InSync = status(HEAD, HEAD, () => ago(4))

export const Behind = status(HEAD, HEAD + 4_000, () => ago(4))

export const FarBehindFromGenesis = status(12, HEAD, () => ago(4))

// genesis carries no timestamp, so an index holding nothing past it has no age to tell a stall by
export const OnlyGenesisIndexed: StoryObj = {
    ...status(0, 3, () => null),
    play: async ({canvas}) => expect(canvas.queryByRole('alert')).toBeNull(),
}

export const OnlyGenesisIndexedFarBehind: StoryObj = {
    ...status(0, HEAD, () => null),
    play: async ({canvas}) => expect(canvas.getByRole('alert')).toHaveTextContent('Indexer is 1,000,000 blocks behind the chain head at #1,000,000.'),
}

export const StalledMinutes = status(HEAD, HEAD, () => ago(5 * 60))

// most of the way to a fourth hour
export const StalledHours: StoryObj = {
    ...status(HEAD, HEAD, () => ago(3 * 3600 + 2400)),
    play: async ({canvas}) => {
        await expect(canvas.getByText(/^No new block indexed for/)).toHaveTextContent('No new block indexed for 3 hours.')
    },
}

export const StalledDays = status(HEAD, HEAD, () => ago(4 * 86400))

export const NoBlocksYet = pageStory({blocks: [], chainInfos: [{...chainInfo, head: HEAD}]})
