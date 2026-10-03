import {HEAD, hashOf} from '../../../../../mock/fixtures.js'
import {busy, mined, sessionStart, timestampSet} from '../../../../../mock/fixtures/blocks.js'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import EventPage from './page'

export default {title: 'Pages/Event', ...pageMeta(EventPage)}

type Row = ReturnType<typeof busy>['events'][number]

const BUSY = busy(HEAD - 120)
const SESSION = mined(HEAD - 160, [timestampSet], {initialization: sessionStart(HEAD - 160)})

const find = (events: Row[], name: string, extrinsic?: number) => events.find(e => `${e.pallet}.${e.method}` === name && (extrinsic == null || e.extrinsic?.id.endsWith(`-${String(extrinsic).padStart(6, '0')}`)))!
const detail = (e: Row) => pageStory({events: [e]}, {params: {id: `${e.block.height}-${e.indexInBlock}`}})

export const Transfer = detail(find(BUSY.events, 'Balances.Transfer', 2))

export const RaisedByBatchItem = detail(find(BUSY.events, 'Balances.Transfer', 3))

export const ExtrinsicSuccessWithoutCall = detail(find(BUSY.events, 'System.ExtrinsicSuccess', 2))

export const BlockRewardAtFinalization = detail(find(BUSY.events, 'Balances.Issued'))

export const SessionAtInitialization = detail(find(SESSION.events, 'Session.NewSession'))

export const ArgsNull = detail(find(BUSY.events, 'Utility.ItemCompleted', 3))

const log = find(BUSY.events, 'EVM.Log')
const words = Array.from({length: 16}, (_, i) => hashOf('word', i).slice(2)).join('')

export const LongArgs = detail({...log, args: {log: {...(log.args as {log: object}).log, data: '0x' + words}}})
