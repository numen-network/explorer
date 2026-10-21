import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {hashOf} from '../../../../../mock/fixtures.js'
import {batchAll, batchInterrupted, batchOfProxies, failedReferendumSubmission, failedVoteRemoval, heartbeat, proxied, referendumSubmission, signedCall, transfer} from '../../../../../mock/fixtures/blocks.js'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import ExtrinsicPage from './page'
import {of, detail, expectCallRowsFit, payout, wasm} from './page.stories.helpers'

export default {title: 'Pages/Extrinsic/Calls', ...pageMeta(ExtrinsicPage)}

const expandAll: StoryObj['play'] = async ({canvasElement}) => {
    for (const trigger of within(canvasElement).getAllByRole('button', {expanded: false})) await userEvent.click(trigger)
}

// what the call rows show for their outcome, leaving out the extrinsic's own badge above the tabs
const outcomes = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=collapsible-trigger] [data-slot=badge]')].map(badge => badge.textContent)

const notePreimage = (height: number) => signedCall(height, 'Preimage.note_preimage', {bytes: wasm}, {fee: 104_857_612_000_000_000_000n, events: [['Preimage.Noted', {hash: hashOf('preimage', height)}]]})

const sent = of(transfer)
type Call = (typeof sent)['calls'][number]

// a single call, open, counts the six events it raised and keeps them inside its row
export const Transfer: StoryObj = {
    ...detail(sent),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('6 events')).toBeVisible()
        expectCallRowsFit(canvasElement)
    },
}

// a call that raised one event counts it in the singular
export const SingleEvent: StoryObj = {...detail(of(heartbeat)), play: async ({canvas}) => expect(canvas.getByText('1 event')).toBeVisible()}

// a failed call that can't fit its badge beside its name moves the badge under it
export const Failed: StoryObj = {...detail(of(failedVoteRemoval)), play: async ({canvasElement}) => expectCallRowsFit(canvasElement)}

export const BatchAll = detail(of(batchAll))

// the failed item and the one past it, which never ran
export const BatchInterrupted: StoryObj = {
    ...detail(of(batchInterrupted)),
    play: async ({canvasElement}) => expect(outcomes(canvasElement)).toEqual(['Failed', 'Not applied']),
}

// a rolled back batch fails at the root and leaves every call under it without an outcome
export const BatchRolledBack: StoryObj = {
    ...detail(of(failedReferendumSubmission)),
    play: async ({canvasElement}) => expect(outcomes(canvasElement)).toEqual(['Failed', 'Not applied', 'Not applied', 'Not applied']),
}

export const ProxyNested = detail(of(proxied))

// a nested call that can't fit its event count beside its name moves the count under it
export const ProxyNestedExpanded: StoryObj = {
    ...detail(of(proxied)),
    play: async context => {
        await expandAll!(context)
        expectCallRowsFit(context.canvasElement)
    },
}

const twoDepths = of(batchOfProxies)

export const TwoDepths = detail(twoDepths)

export const TwoDepthsPage2 = detail(twoDepths, {tab: 'calls', page: '2'})

export const ReferendumSubmissionLongArgs = detail(of(referendumSubmission))

export const RuntimeUpgradePreimage = detail(of(notePreimage))

export const PayoutBatch = detail(payout)

export const PayoutBatchPage2 = detail(payout, {tab: 'calls', page: '2'})

export const PayoutBatchLastPage = detail(payout, {tab: 'calls', page: lastPage(payout.calls.length)})

// the args switch to their JSON and back to the table
export const ArgsToggle: StoryObj = {
    ...detail(sent),
    play: async ({canvas}) => {
        await userEvent.click(canvas.getByRole('tab', {name: 'JSON'}))
        await expect(canvas.getByText(/"dest"/)).toBeVisible()
        await userEvent.click(canvas.getByRole('tab', {name: 'Table'}))
        await expect(canvas.getByText('dest')).toBeVisible()
    },
}

// a runtime newer than the metadata the explorer ships with leaves only the raw args
export const UnknownRuntime: StoryObj = {
    ...detail({...sent, calls: sent.calls.map((c: Call) => ({...c, block: {specVersion: 999}}))}),
    play: async ({canvas}) => {
        await expect(canvas.queryByRole('tab', {name: 'Table'})).toBeNull()
        await expect(canvas.getByText(/"transfer_keep_alive"|"dest"/)).toBeVisible()
    },
}
