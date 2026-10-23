import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {HEAD} from '../../../../../mock/fixtures.js'
import {busy, GENESIS, heartbeat, mined, minedObject, timestampSet, topology, vestingPayout} from '../../../../../mock/fixtures/blocks.js'
import {tabPanel} from '../../../../.storybook/fit'
import {pageStory} from '../../../../.storybook/page'

type Mined = ReturnType<typeof mined>

const PAGE = 20

export const BUSY = busy(HEAD - 120)
export const QUIET = mined(HEAD - 300, [timestampSet])
// a payout batch raising thousands of events beside a heartbeat
export const AIRDROP = mined(HEAD - 500, [timestampSet, heartbeat, vestingPayout])

// the indexer holds a topology for every protocol the chain has mined under,
// and the block was mined under the newest
export function detail(b: Mined, {tab = '', page = 1, protocols = ['poscan-v1']} = {}) {
    const slice = <T,>(rows: T[]) => rows.slice((page - 1) * PAGE, page * PAGE)
    const data = {
        blocks: [b.block],
        extrinsics: slice(b.extrinsics),
        events: slice(b.events),
        minedObjects: [minedObject(b.block.height, protocols.at(-1))],
        meshTopologies: protocols.map(topology),
    }
    return pageStory(data, {params: {id: String(b.block.height)}, searchParams: {...(tab && {tab}), ...(page > 1 && {page: String(page)})}})
}

// genesis carries no extrinsic, event or log, so whichever tab it opens lists none
export const genesis = (tab = ''): StoryObj => ({
    ...pageStory({blocks: [GENESIS]}, {params: {id: '0'}, searchParams: tab ? {tab} : {}}),
    play: async ({canvasElement}) => expect(within(tabPanel(canvasElement, 'Block contents')).getByText('None')).toBeVisible(),
})
