import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {chainInfo, extrinsic, HEAD, hashOf, paged, person} from '../../../../../mock/fixtures.js'
import {batchAll, batchInterrupted, batchOfProxies, evmTransact, evmTxHash, failedVoteRemoval, heartbeat, mined, pick, proxied, referendumSubmission, signedCall, timestampSet, tipped, transfer, vestingPayout} from '../../../../../mock/fixtures/blocks.js'
import {expectAddressForm, expectFits, expectInContentBox, expectShortHashes, expectTimesFit} from '../../../../.storybook/fit'
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

// each call row keeps whatever its lines hold, from its name and event count
// to the events it raised, clear of its padding
function expectCallRowsFit(root: HTMLElement) {
    for (const row of root.querySelectorAll('[data-slot=collapsible]')) expectInContentBox(row, ...row.querySelectorAll('[data-slot=collapsible-trigger] > *, [data-slot=collapsible-content] > * > *'))
}

// fmtBalance prints every digit, so a shown amount reads back to its planck
function planck(text: string) {
    const [whole, frac = ''] = text.replace(/[^\d.]/g, '').split('.')
    return BigInt(whole + frac.padEnd(chainInfo.decimals, '0'))
}

// the fee lines agree with the balance events of the same extrinsic. the sender
// gets back what it was charged over the fee and the tip, the fee splits
// between the miner and the treasury, and the tip reaches the miner whole
function feesAddUp(spec: Spec, options?: Parameters<typeof detail>[1]): StoryObj {
    const scene = mined(H, [timestampSet, spec])
    const picked = pick(scene, 1)
    const events: {pallet: string; method: string; args: unknown}[] = picked.events
    const balances = (method: string) => events.filter(e => e.pallet === 'Balances' && e.method === method).map(e => e.args as {who: string; amount: string})
    const moved = (method: string, who: string) => balances(method).filter(a => a.who === who).reduce((sum, a) => sum + BigInt(a.amount), 0n)
    const [{who: payer}] = balances('Withdraw')
    const author = scene.block.author.id
    const feePaid = events.find(e => e.method === 'TransactionFeePaid')?.args as {actualFee: string} | undefined
    const withdrawn = moved('Withdraw', payer)
    const paid = feePaid ? BigInt(feePaid.actualFee) : withdrawn - moved('Deposit', payer)
    const refund = withdrawn - paid
    return {
        ...detail(picked, options),
        play: async ({canvas}) => {
            const value = (label: string) => canvas.getByText(label).nextElementSibling as HTMLElement
            const fee = planck(value('Fee').firstChild!.textContent!)
            const toMiner = planck(within(value('Fee')).getByText(/^to miner/).textContent!)
            const toTreasury = planck(within(value('Fee')).getByText(/^to treasury/).textContent!)
            const tip = planck(value('Tip').firstChild!.textContent!)
            expect(fee + tip).toBe(paid)
            expect(toMiner + toTreasury).toBe(fee)
            expect(toMiner + tip + (payer === author ? refund : 0n)).toBe(moved('Deposit', author))
            expect(toTreasury).toBe(moved('Deposit', chainInfo.treasuryAccount))
            await expect(within(value('Tip')).getByText('to miner')).toBeVisible()
        },
    }
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

// the signer keeps its full address and wraps it inside its row, the
// timestamp breaks after its age inside its own, and the call keeps its events
// inside its row
export const Transfer: StoryObj = {
    ...detail(of(transfer)),
    play: async ({canvasElement}) => {
        expectAddressForm(canvasElement)
        expectFits(canvasElement.querySelector('a[href^="/account/"]')!.closest('[data-slot=card] > *')!)
        expectTimesFit(canvasElement)
        expectCallRowsFit(canvasElement)
    },
}

export const TransferEvents = detail(of(transfer), {tab: 'events'})

export const TransferWithTip = feesAddUp(tipped)

// a failed call that can't fit its badge beside its name moves the badge under it
export const Failed: StoryObj = {...detail(of(failedVoteRemoval)), play: async ({canvasElement}) => expectCallRowsFit(canvasElement)}

export const FailedEvents = detail(of(failedVoteRemoval), {tab: 'events'})

export const Unsigned = detail(pick(mined(H, [timestampSet]), 0))

export const UnsignedHeartbeatEvents = detail(of(heartbeat), {tab: 'events'})

export const EvmTransact = feesAddUp(evmTransact, {evm: true})

export const BatchAll = detail(of(batchAll))

export const BatchAllEvents = detail(of(batchAll), {tab: 'events'})

export const BatchInterrupted = detail(of(batchInterrupted))

// the miner pays for its own batch, so the refund for the items that never ran
// lands on the account its fee share and the tip go to
export const SignedByMiner = feesAddUp((height: number) => batchInterrupted(height, {from: person(height), tip: 5_000_000_000_000_003n, refund: 1_393_089_283_907_427n}))

export const ProxyNested = detail(of(proxied))

// a nested call that can't fit its event count beside its name moves the count under it
export const ProxyNestedExpanded: StoryObj = {
    ...detail(of(proxied)),
    play: async context => {
        await expandAll!(context)
        expectCallRowsFit(context.canvasElement)
    },
}

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

export const ExtremeFeeAndTip = feesAddUp(whale)

export const CallsEmpty = detail({...of(transfer), calls: []})

export const EventsEmpty = detail({...of(transfer), events: []}, {tab: 'events'})

export const AmbiguousHash: StoryObj = {
    ...ambiguous([hit(412_007, 3), hit(698_311, 1), hit(HEAD - 42, 2)]),
    play: async ({canvas}) => expectShortHashes(canvas.getByRole('heading', {name: /^Extrinsic 0x/}).textContent!),
}

export const AmbiguousHashMany = ambiguous(replays)

export const AmbiguousHashLastPage = ambiguous(replays, lastPage(replays.length))
