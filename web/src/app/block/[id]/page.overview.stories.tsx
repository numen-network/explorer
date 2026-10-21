import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {chainInfo, HEAD} from '../../../../../mock/fixtures.js'
import {GENESIS, mined, timestampSet, topology, transfer} from '../../../../../mock/fixtures/blocks.js'
import {drawnCanvases, drawnFaces, expectInContentBox, expectShortHashes} from '../../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import BlockPage from './page'
import {BUSY, QUIET, detail} from './page.stories.helpers'

export default {title: 'Pages/Block/Overview', ...pageMeta(BlockPage)}

const FRESH = mined(HEAD - 1, [timestampSet, transfer])

const whale = (height: number) => transfer(height, {tip: 1_234_567_891_234_567_891_234_567n})
const EXTREME = mined(HEAD - 113, [timestampSet, whale], {traits: {difficulty: (2n ** 128n - 1n).toString()}})

// a network the config has no genesis time for, like the testnet, leaves the empty mark
export const GenesisUnconfigured: StoryObj = {
    ...pageStory({blocks: [GENESIS], chainInfos: [{...chainInfo, evmChainId: 320261}]}, {params: {id: '0'}}),
    play: async ({canvas}) => expect(canvas.getByText('Timestamp').nextElementSibling!.textContent).toBe('—'),
}

// the object keeps to its card, clear of the padding, under its shortened hash
export const ObjectFit: StoryObj = {
    ...detail(BUSY),
    play: async ({canvas, canvasElement}) => {
        const [object] = await drawnCanvases(canvasElement, 1)
        expectInContentBox(object.closest('[data-slot=card]')!, object)
        expectShortHashes(canvas.getByText(/^OBJ /).textContent!)
    },
}

export const Confirming = detail(FRESH)

export const ExtremeValues = detail(EXTREME)

// an upgraded chain holds both topologies, and the object draws on its own protocol's
export const UpgradedProtocol: StoryObj = {
    ...detail(QUIET, {protocols: ['poscan-v1', 'poscan-v2']}),
    play: async ({canvasElement}) => expect(await drawnFaces(canvasElement, 1)).toEqual([topology('poscan-v2').faceCount]),
}
