import type {StoryObj} from '@storybook/nextjs-vite'
import {userEvent, within} from 'storybook/test'
import {extrinsic, HEAD, hashOf, paged} from '../../../../../mock/fixtures.js'
import {batchAll, batchInterrupted, batchOfProxies, evmTransact, evmTxHash, failedVoteRemoval, heartbeat, mined, pick, proxied, referendumSubmission, signedCall, timestampSet, tipped, transfer, vestingPayout} from '../../../../../mock/fixtures/blocks.js'
import {expectAddressForm, expectFits, PHONE} from '../../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import ExtrinsicPage from './page'

export default {title: 'Pages/Extrinsic', ...pageMeta(ExtrinsicPage)}

type Picked = ReturnType<typeof pick>
type Spec = Parameters<typeof mined>[1][number]

const H = HEAD - 120

const of = (spec: Spec) => pick(mined(H, [timestampSet, spec]), 1)

function detail({extrinsics, calls, events}: Picked, {tab = '', page = '1', evm = false} = {}) {
    const [x] = extrinsics
    const data = {
        extrinsics,
        calls: paged(calls),
        callsConnection: {totalCount: calls.length},
        events: paged(events),
        eventsConnection: {totalCount: events.length},
        evmTransactions: evm ? [{id: evmTxHash(H)}] : [],
    }
    return pageStory(data, {params: {id: `${x.block.height}-${x.indexInBlock}`}, searchParams: {tab, page}})
}

const expandAll: StoryObj['play'] = async ({canvasElement}) => {
    for (const trigger of within(canvasElement).getAllByRole('button', {expanded: false})) await userEvent.click(trigger)
}

const whale = (height: number) => transfer(height, {fee: 987_654_321_987_654_321_987_654n, tip: 1_234_567_891_234_567_891_234_567n})
const payout = pick(mined(H, [timestampSet, heartbeat, vestingPayout]), 2)

const wasm = '0x' + Array.from({length: 31_250}, (_, i) => hashOf('wasm', i).slice(2)).join('')
const notePreimage = (height: number) => signedCall(height, 'Preimage.note_preimage', {bytes: wasm}, {fee: 104_857_612_000_000_000_000n, events: [['Preimage.Noted', {hash: hashOf('preimage', height)}]]})
const applyUpgrade = (height: number) => signedCall(height, 'System.apply_authorized_upgrade', {code: wasm}, {fee: 0n, events: [['System.CodeUpdated', null]]})

const shared = hashOf('replayed', 1)
const hit = (height: number, index: number) => {
    const {id, indexInBlock, pallet, method, success, block} = extrinsic(height, index)
    return {id, indexInBlock, hash: shared, pallet, method, success, block}
}

const ambiguous = (hits: object[], page = '1') => pageStory({extrinsics: paged(hits), extrinsicsConnection: {totalCount: hits.length}}, {params: {id: shared}, searchParams: {page}})

const replays = Array.from({length: 45}, (_, i) => hit(300_000 + i * 15_000, 1 + (i % 3)))

export const Transfer = detail(of(transfer))

// the signer keeps its full address on a phone and wraps it inside its row
export const TransferOnPhone: StoryObj = {
    ...Transfer,
    globals: PHONE,
    play: async ({canvasElement}) => {
        expectAddressForm(canvasElement, 'full')
        expectFits(canvasElement.querySelector('a[href^="/account/"]')!.closest('[data-slot=card] > *')!)
    },
}

export const TransferEvents = detail(of(transfer), {tab: 'events'})

export const TransferWithTip = detail(of(tipped))

export const Failed = detail(of(failedVoteRemoval))

export const FailedEvents = detail(of(failedVoteRemoval), {tab: 'events'})

export const Unsigned = detail(pick(mined(H, [timestampSet]), 0))

export const UnsignedHeartbeatEvents = detail(of(heartbeat), {tab: 'events'})

export const EvmTransact = detail(of(evmTransact), {evm: true})

export const BatchAll = detail(of(batchAll))

export const BatchAllEvents = detail(of(batchAll), {tab: 'events'})

export const BatchInterrupted = detail(of(batchInterrupted))

export const ProxyNested = detail(of(proxied))

export const ProxyNestedExpanded: StoryObj = {...detail(of(proxied)), play: expandAll}

export const ProxyNestedEvents = detail(of(proxied), {tab: 'events'})

const twoDepths = of(batchOfProxies)

export const TwoDepthsCalls = detail(twoDepths)

export const TwoDepthsCallsPage2 = detail(twoDepths, {tab: 'calls', page: '2'})

export const ReferendumSubmissionLongArgs = detail(of(referendumSubmission))

export const RuntimeUpgradePreimage = detail(of(notePreimage))

export const RuntimeUpgradeFeeWaived = detail(of(applyUpgrade))

export const PayoutBatchCalls = detail(payout)

export const PayoutBatchCallsPage2 = detail(payout, {tab: 'calls', page: '2'})

export const PayoutBatchCallsLastPage = detail(payout, {tab: 'calls', page: lastPage(payout.calls.length)})

export const PayoutBatchEvents = detail(payout, {tab: 'events'})

export const PayoutBatchEventsPage2 = detail(payout, {tab: 'events', page: '2'})

export const PayoutBatchEventsLastPage = detail(payout, {tab: 'events', page: lastPage(payout.events.length)})

export const ExtremeFeeAndTip = detail(of(whale))

export const CallsEmpty = detail({...of(transfer), calls: []})

export const EventsEmpty = detail({...of(transfer), events: []}, {tab: 'events'})

export const AmbiguousHash = ambiguous([hit(412_007, 3), hit(698_311, 1), hit(HEAD - 42, 2)])

export const AmbiguousHashMany = ambiguous(replays)

export const AmbiguousHashLastPage = ambiguous(replays, lastPage(replays.length))
