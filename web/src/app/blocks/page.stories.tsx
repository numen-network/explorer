import {HEAD} from '../../../../mock/fixtures.js'
import {GENESIS, sealed} from '../../../../mock/fixtures/blocks.js'
import {pageMeta, pageStory} from '../../../.storybook/page'
import BlocksPage from './page'

export default {title: 'Pages/Blocks', ...pageMeta(BlocksPage)}

const TOTAL = HEAD + 1
const chain = (count: number, from = HEAD) => Array.from({length: count}, (_, i) => sealed(from - i))
const list = (rows: object[], searchParams: Record<string, string> = {}) => pageStory({blocks: rows, blocksConnection: {totalCount: TOTAL}}, {searchParams})

export const Many = list([...chain(2), sealed(HEAD - 2, {extrinsicCount: 3, eventCount: 3694}), ...chain(17, HEAD - 3)])

export const MiddlePage = list(chain(10, HEAD - 49_990), {page: '5000', size: '10'})

export const LastPage = list([GENESIS], {page: '50001'})

export const OnlyGenesis = pageStory({blocks: [GENESIS], blocksConnection: {totalCount: 1}})

export const EmptyPastLastPage = pageStory(
    {blocks: ({offset}: {offset?: number}) => (offset == null ? [sealed(HEAD)] : []), blocksConnection: {totalCount: TOTAL}},
    {searchParams: {page: '60000'}}
)
