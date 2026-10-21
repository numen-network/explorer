import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {chainInfo, HEAD} from '../../../../mock/fixtures.js'
import {GENESIS, sealed} from '../../../../mock/fixtures/blocks.js'
import {columnTexts, expectShortHashes} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import BlocksPage from './page'

export default {title: 'Pages/Blocks/List', ...pageMeta(BlocksPage)}

const TOTAL = HEAD + 1
const chain = (count: number, from = HEAD) => Array.from({length: count}, (_, i) => sealed(from - i))
const list = (rows: object[], searchParams: Record<string, string> = {}) => pageStory({blocks: rows, blocksConnection: {totalCount: TOTAL}}, {searchParams})

export const Many = list(chain(20))

// each hash shortens to 0x4…4
export const ShortHashes: StoryObj = {...list(chain(3)), play: async ({canvasElement}) => expectShortHashes(...columnTexts(canvasElement, 'Hash'))}

// a block of thousands of events groups the digits of its count
export const ThousandsOfEvents: StoryObj = {
    ...list([...chain(2), sealed(HEAD - 2, {extrinsicCount: 3, eventCount: 3694}), ...chain(2, HEAD - 3)]),
    play: async ({canvas}) => expect(canvas.getByRole('cell', {name: '3,694'})).toBeVisible(),
}

export const MiddlePage = list(chain(10, HEAD - 49_990), {page: '5000', size: '10'})

// the pager stands on the last page with nowhere further to go
export const LastPage: StoryObj = {
    ...list([GENESIS], {page: '50001'}),
    play: async ({canvas}) => {
        const pager = within(canvas.getByRole('navigation'))
        await expect(pager.getAllByRole('link', {name: /page \d+$/}).find(link => link.getAttribute('aria-current') === 'page')).toHaveTextContent('50001')
        await expect(pager.getByRole('link', {name: /next/i})).toHaveAttribute('aria-disabled', 'true')
    },
}

// genesis carries no timestamp, so its row dates it by the network's genesis time from the config
export const OnlyGenesis: StoryObj = {
    ...pageStory({blocks: [GENESIS], blocksConnection: {totalCount: 1}}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, /^Age \| Date/)).toEqual([expect.stringContaining('| 2026-09-14 01:00:00')]),
}

// a network the config has no genesis time for, like the testnet, leaves the empty mark where the age and date go
export const OnlyGenesisUnconfigured: StoryObj = {
    ...pageStory({blocks: [GENESIS], blocksConnection: {totalCount: 1}, chainInfos: [{...chainInfo, evmChainId: 320261}]}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, /^Age \| Date/)).toEqual(['—']),
}

export const EmptyPastLastPage = pageStory(
    {blocks: ({offset}: {offset?: number}) => (offset == null ? [sealed(HEAD)] : []), blocksConnection: {totalCount: TOTAL}},
    {searchParams: {page: '60000'}}
)
