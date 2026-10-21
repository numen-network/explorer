import {HEAD, hashOf} from '../../../../../mock/fixtures.js'
import {DIGEST, mined, timestampSet} from '../../../../../mock/fixtures/blocks.js'
import {pageMeta} from '../../../../.storybook/page'
import BlockPage from './page'
import {BUSY, detail, genesis} from './page.stories.helpers'

export default {title: 'Pages/Block/Logs', ...pageMeta(BlockPage)}

const UPGRADE = mined(HEAD - 240, [timestampSet])
const grandpa = [0, 1, 2, 3].map(i => hashOf('grandpa', i))
const WEIRD_LOGS = {
    ...UPGRADE,
    block: {...UPGRADE.block, logs: [...UPGRADE.block.logs, DIGEST.grandpaChange(grandpa), DIGEST.other('numen node 1.4.2'), DIGEST.runtimeUpdated, DIGEST.unknown(7), DIGEST.truncated]},
}

export const Sealed = detail(BUSY, {tab: 'logs'})

export const EveryKind = detail(WEIRD_LOGS, {tab: 'logs'})

export const EmptyGenesis = genesis('logs')
