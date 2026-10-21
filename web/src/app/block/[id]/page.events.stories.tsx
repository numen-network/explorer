import {HEAD} from '../../../../../mock/fixtures.js'
import {mined, sessionStart, timestampSet, transfer} from '../../../../../mock/fixtures/blocks.js'
import {pageMeta} from '../../../../.storybook/page'
import BlockPage from './page'
import {AIRDROP, detail, genesis} from './page.stories.helpers'

export default {title: 'Pages/Block/Events', ...pageMeta(BlockPage)}

const SESSION = mined(HEAD - 160, [timestampSet, transfer], {initialization: sessionStart(HEAD - 160)})

export const SessionStart = detail(SESSION, {tab: 'events'})

export const Many = detail(AIRDROP, {tab: 'events'})

export const EmptyGenesis = genesis('events')
