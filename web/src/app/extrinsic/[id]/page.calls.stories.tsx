import type {StoryObj} from '@storybook/nextjs-vite'
import {userEvent, within} from 'storybook/test'
import {hashOf} from '../../../../../mock/fixtures.js'
import {batchAll, batchInterrupted, batchOfProxies, failedReferendumSubmission, failedVoteRemoval, proxied, referendumSubmission, signedCall, transfer} from '../../../../../mock/fixtures/blocks.js'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import ExtrinsicPage from './page'
import {of, detail, expectCallRowsFit, payout, wasm} from './page.stories.helpers'

export default {title: 'Pages/Extrinsic/Calls', ...pageMeta(ExtrinsicPage)}

const expandAll: StoryObj['play'] = async ({canvasElement}) => {
    for (const trigger of within(canvasElement).getAllByRole('button', {expanded: false})) await userEvent.click(trigger)
}

const notePreimage = (height: number) => signedCall(height, 'Preimage.note_preimage', {bytes: wasm}, {fee: 104_857_612_000_000_000_000n, events: [['Preimage.Noted', {hash: hashOf('preimage', height)}]]})

// a failed call that can't fit its badge beside its name moves the badge under it
export const Failed: StoryObj = {...detail(of(failedVoteRemoval)), play: async ({canvasElement}) => expectCallRowsFit(canvasElement)}

export const BatchAll = detail(of(batchAll))

export const BatchInterrupted = detail(of(batchInterrupted))

export const BatchRolledBack = detail(of(failedReferendumSubmission))

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

export const Empty = detail({...of(transfer), calls: []})
