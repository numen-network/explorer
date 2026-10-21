import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {HEAD} from '../../../../../mock/fixtures.js'
import {heartbeat, mined, sessionStart, timestampSet, transfer, vestingPayout} from '../../../../../mock/fixtures/blocks.js'
import {pageMeta} from '../../../../.storybook/page'
import BlockPage from './page'
import {BUSY, detail, genesis} from './page.stories.helpers'

export default {title: 'Pages/Block/Events', ...pageMeta(BlockPage)}

const SESSION = mined(HEAD - 160, [timestampSet, transfer], {initialization: sessionStart(HEAD - 160)})
const AIRDROP = mined(HEAD - 500, [timestampSet, heartbeat, vestingPayout])

export const SessionStart = detail(SESSION, {tab: 'events'})

export const BusyBlock = detail(BUSY, {tab: 'events'})

export const Many: StoryObj = {
    ...detail(AIRDROP, {tab: 'events'}),
    play: async ({canvas}) => expect(canvas.getByText('Extrinsics / events').nextElementSibling).toHaveTextContent('3 / 3,694'),
}

export const EmptyGenesis = genesis('events')
