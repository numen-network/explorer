import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {chainInfo, HEAD, hashOf, person} from '../../../../../mock/fixtures.js'
import {busy, DIGEST, GENESIS, heartbeat, mined, minedObject, sessionStart, timestampSet, topology, transfer, vestingPayout} from '../../../../../mock/fixtures/blocks.js'
import {drawnCanvases, drawnFaces, expectInContentBox, expectNamedNavs, expectShortHashes} from '../../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import BlockPage from './page'

export default {title: 'Pages/Block', ...pageMeta(BlockPage)}

type Mined = ReturnType<typeof mined>

const PAGE = 20

const BUSY = busy(HEAD - 120)
const QUIET = mined(HEAD - 300, [timestampSet])
const crowd = (i: number) => (i % 4 === 0 ? heartbeat : (height: number) => transfer(height, {from: person(i), to: person(i + 3)}))
const CROWDED = mined(HEAD - 400, [timestampSet, ...Array.from({length: 44}, (_, i) => crowd(i))])
const SESSION = mined(HEAD - 160, [timestampSet, transfer], {initialization: sessionStart(HEAD - 160)})
const AIRDROP = mined(HEAD - 500, [timestampSet, heartbeat, vestingPayout])
const PAYOUT_SIZES = [526, 731, 412, 650]
const PAYOUTS = mined(HEAD - 520, [timestampSet, ...PAYOUT_SIZES.map(count => (height: number) => vestingPayout(height, {count}))])
const FRESH = mined(HEAD - 1, [timestampSet, transfer])

const whale = (height: number) => transfer(height, {tip: 1_234_567_891_234_567_891_234_567n})
const EXTREME = mined(HEAD - 113, [timestampSet, whale], {traits: {difficulty: (2n ** 128n - 1n).toString()}})

const UPGRADE = mined(HEAD - 240, [timestampSet])
const grandpa = [0, 1, 2, 3].map(i => hashOf('grandpa', i))
const WEIRD_LOGS = {
    ...UPGRADE,
    block: {...UPGRADE.block, logs: [...UPGRADE.block.logs, DIGEST.grandpaChange(grandpa), DIGEST.other('numen node 1.4.2'), DIGEST.runtimeUpdated, DIGEST.unknown(7), DIGEST.truncated]},
}

// the indexer holds a topology for every protocol the chain has mined under,
// and the block was mined under the newest
function detail(b: Mined, {tab = '', page = 1, protocols = ['poscan-v1']} = {}) {
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
const genesis = (tab = ''): StoryObj => ({
    ...pageStory({blocks: [GENESIS]}, {params: {id: '0'}, searchParams: tab ? {tab} : {}}),
    play: async ({canvas}) => expect(canvas.getByText('Timestamp').nextElementSibling!.textContent).toContain('| 2026-09-14 01:00:00 (UTC)'),
})

// a network the config has no genesis time for, like the testnet, leaves the empty mark
export const GenesisUnconfigured: StoryObj = {
    ...pageStory({blocks: [GENESIS], chainInfos: [{...chainInfo, evmChainId: 320261}]}, {params: {id: '0'}}),
    play: async ({canvas}) => expect(canvas.getByText('Timestamp').nextElementSibling!.textContent).toBe('—'),
}

// the object keeps to its card, clear of the padding, under its shortened hash
export const Extrinsics: StoryObj = {
    ...detail(BUSY),
    play: async ({canvas, canvasElement}) => {
        const [object] = await drawnCanvases(canvasElement, 1)
        expectInContentBox(object.closest('[data-slot=card]')!, object)
        expectShortHashes(canvas.getByText(/^OBJ /).textContent!)
    },
}

export const ExtrinsicsOne = detail(QUIET)

// the links to the neighbouring blocks share the page with the list's pager
export const ExtrinsicsMany: StoryObj = {...detail(CROWDED), play: async ({canvasElement}) => expectNamedNavs(canvasElement)}

export const ExtrinsicsManyLastPage = detail(CROWDED, {page: 3})

// thousands of leaf calls across one block, each row counting its own
export const ExtrinsicsPayoutBatches: StoryObj = {
    ...detail(PAYOUTS),
    play: async ({canvas}) => {
        for (const count of PAYOUT_SIZES) await expect(canvas.getByText(`${count}× Vesting.vested_transfer`)).toBeVisible()
    },
}

export const ExtrinsicsEmptyGenesis = genesis()

export const Events = detail(SESSION, {tab: 'events'})

export const EventsBusyBlock = detail(BUSY, {tab: 'events'})

export const EventsMany: StoryObj = {
    ...detail(AIRDROP, {tab: 'events'}),
    play: async ({canvas}) => expect(canvas.getByText('Extrinsics / events').nextElementSibling).toHaveTextContent('3 / 3,694'),
}

export const EventsEmptyGenesis = genesis('events')

export const Logs = detail(BUSY, {tab: 'logs'})

export const LogsEveryKind = detail(WEIRD_LOGS, {tab: 'logs'})

export const LogsEmptyGenesis = genesis('logs')

export const Confirming = detail(FRESH)

export const ExtremeValues = detail(EXTREME)

// an upgraded chain holds both topologies, and the object draws on its own protocol's
export const UpgradedProtocol: StoryObj = {
    ...detail(QUIET, {protocols: ['poscan-v1', 'poscan-v2']}),
    play: async ({canvasElement}) => expect(await drawnFaces(canvasElement, 1)).toEqual([topology('poscan-v2').faceCount]),
}
