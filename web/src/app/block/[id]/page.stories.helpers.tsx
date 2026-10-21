import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {HEAD} from '../../../../../mock/fixtures.js'
import {busy, GENESIS, mined, minedObject, timestampSet, topology} from '../../../../../mock/fixtures/blocks.js'
import {pageStory} from '../../../../.storybook/page'

type Mined = ReturnType<typeof mined>

const PAGE = 20

export const BUSY = busy(HEAD - 120)
export const QUIET = mined(HEAD - 300, [timestampSet])

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

// genesis carries no timestamp inherent, so its timestamp row shows the
// network's genesis time from the explorer's config
export const genesis = (tab = ''): StoryObj => ({
    ...pageStory({blocks: [GENESIS]}, {params: {id: '0'}, searchParams: tab ? {tab} : {}}),
    play: async ({canvas}) => expect(canvas.getByText('Timestamp').nextElementSibling!.textContent).toContain('| 2026-09-14 01:00:00 (UTC)'),
})
