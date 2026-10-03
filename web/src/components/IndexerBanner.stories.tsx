import type {Decorator} from '@storybook/nextjs-vite'
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

const status = (height: number, head: number, age: () => string) => pageStory({blocks: () => [{height, timestamp: age()}], chainInfos: [{...chainInfo, head}]})

export const InSync = status(HEAD, HEAD, () => ago(4))

export const Behind = status(HEAD, HEAD + 4_000, () => ago(4))

export const FarBehindFromGenesis = status(12, HEAD, () => ago(4))

export const StalledMinutes = status(HEAD, HEAD, () => ago(5 * 60))

export const StalledHours = status(HEAD, HEAD, () => ago(3 * 3600 + 600))

export const StalledDays = status(HEAD, HEAD, () => ago(4 * 86400))

export const NoBlocksYet = pageStory({blocks: [], chainInfos: [{...chainInfo, head: HEAD}]})
