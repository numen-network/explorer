import {bounty, BOUNTY_STATUSES, counted, listed} from '../../../../mock/fixtures/governance.js'
import {pageMeta, pageStory} from '../../../.storybook/page'
import BountiesPage from './page'

export default {title: 'Pages/Bounties', ...pageMeta(BountiesPage)}

const list = (rows: object[]) => pageStory({bounties: listed(rows), bountiesConnection: counted(rows)})

export const Empty = list([])

export const One = list([bounty(0, 'Active')])

export const EveryStatus = list(BOUNTY_STATUSES.map((status, i) => bounty(BOUNTY_STATUSES.length - 1 - i, status)))

export const MoreThanOnePage = list(Array.from({length: 120}, (_, i) => bounty(119 - i, BOUNTY_STATUSES[i % BOUNTY_STATUSES.length])))
