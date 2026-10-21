import {batchAll, failedVoteRemoval, heartbeat, proxied, transfer} from '../../../../../mock/fixtures/blocks.js'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import ExtrinsicPage from './page'
import {of, detail, payout} from './page.stories.helpers'

export default {title: 'Pages/Extrinsic/Events', ...pageMeta(ExtrinsicPage)}

export const Transfer = detail(of(transfer), {tab: 'events'})

export const Failed = detail(of(failedVoteRemoval), {tab: 'events'})

export const UnsignedHeartbeat = detail(of(heartbeat), {tab: 'events'})

export const BatchAll = detail(of(batchAll), {tab: 'events'})

export const ProxyNested = detail(of(proxied), {tab: 'events'})

export const PayoutBatch = detail(payout, {tab: 'events'})

export const PayoutBatchPage2 = detail(payout, {tab: 'events', page: '2'})

export const PayoutBatchLastPage = detail(payout, {tab: 'events', page: lastPage(payout.events.length)})
