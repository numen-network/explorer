import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {chainInfo, HEAD} from '../../../../mock/fixtures.js'
import {GENESIS, sealed} from '../../../../mock/fixtures/blocks.js'
import {columnTexts, expectShortHashes} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import BlocksPage from './page'

export default {title: 'Pages/Blocks', ...pageMeta(BlocksPage)}

const TOTAL = HEAD + 1
const chain = (count: number, from = HEAD) => Array.from({length: count}, (_, i) => sealed(from - i))
const list = (rows: object[], searchParams: Record<string, string> = {}) => pageStory({blocks: rows, blocksConnection: {totalCount: TOTAL}}, {searchParams})

export const Many: StoryObj = {
    ...list([...chain(2), sealed(HEAD - 2, {extrinsicCount: 3, eventCount: 3694}), ...chain(17, HEAD - 3)]),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByRole('cell', {name: '3,694'})).toBeVisible()
        expectShortHashes(...columnTexts(canvasElement, 'Hash'))
    },
}

export const MiddlePage = list(chain(10, HEAD - 49_990), {page: '5000', size: '10'})

// genesis carries no timestamp, so its row dates it by the network's genesis time from the config
const genesisDated: StoryObj['play'] = async ({canvasElement}) => expect(columnTexts(canvasElement, /^Age \| Date/)).toEqual([expect.stringContaining('| 2026-09-14 01:00:00')])

export const LastPage: StoryObj = {...list([GENESIS], {page: '50001'}), play: genesisDated}

export const OnlyGenesis: StoryObj = {...pageStory({blocks: [GENESIS], blocksConnection: {totalCount: 1}}), play: genesisDated}

// a network the config has no genesis time for, like the testnet, leaves the empty mark where the age and date go
export const OnlyGenesisUnconfigured: StoryObj = {
    ...pageStory({blocks: [GENESIS], blocksConnection: {totalCount: 1}, chainInfos: [{...chainInfo, evmChainId: 320261}]}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, /^Age \| Date/)).toEqual(['—']),
}

export const EmptyPastLastPage = pageStory(
    {blocks: ({offset}: {offset?: number}) => (offset == null ? [sealed(HEAD)] : []), blocksConnection: {totalCount: TOTAL}},
    {searchParams: {page: '60000'}}
)
