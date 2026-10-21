import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import data from '../../../../mock/data.js'
import {HEAD, PEOPLE} from '../../../../mock/fixtures.js'
import {counted, listed, SPEND_STATUSES, spend, spendsInOneBlock} from '../../../../mock/fixtures/governance.js'
import {columnTexts, filterOptions} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import GovernancePage from './page'

export default {title: 'Pages/Governance/Treasury spends', ...pageMeta(GovernancePage)}

const treasuryTab = (rows: object[], filters: Record<string, string> = {}) =>
    pageStory({...data, treasurySpends: listed(rows), treasurySpendsConnection: counted(rows)}, {searchParams: {tab: 'treasury', ...filters}})

const spends = Array.from({length: 47}, (_, i) => spend(i, SPEND_STATUSES[(i * 3) % SPEND_STATUSES.length]))

export const Empty: StoryObj = {
    ...treasuryTab([]),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No spends yet.')).toBeInTheDocument()
        for (const row of ['Kind', 'Status', 'Track']) expect(await filterOptions(canvasElement, row)).toBeNull()
    },
}

export const One = treasuryTab([spend(0, 'Paid')])

export const EveryStatus = treasuryTab(SPEND_STATUSES.map((status, i) => spend(i, status)))

export const EdgeCases = treasuryTab([
    spend(0, 'AssetSpendApproved', {beneficiary: PEOPLE[7]}),
    spend(1, 'Awarded', {referendum: null}),
    spend(2, 'Paid', {amount: '0'}),
    spend(3, 'SpendApproved', {amount: '1'}),
    spend(4, 'SpendProcessed', {amount: '123456789012345678901234567890'}),
])

export const Many = treasuryTab(spends)

// spends and spend_local proposals approved in turn in one block, newest first, each kind's #10 between its #11 and #9
export const InOneBlock: StoryObj = {
    ...treasuryTab(spendsInOneBlock(HEAD - 600, [[11, 'SpendApproved'], [11, 'AssetSpendApproved'], [10, 'SpendApproved'], [10, 'AssetSpendApproved'], [9, 'SpendApproved'], [9, 'AssetSpendApproved']])),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Id')).toEqual(['#11', '#11', '#10', '#10', '#9', '#9'])
        await expect(columnTexts(canvasElement, 'Kind')).toEqual(['Local', 'Spend', 'Local', 'Spend', 'Local', 'Spend'])
    },
}

export const Filtered = treasuryTab(spends, {kind: 'spend', status: 'Paid'})

// no spend went through Root, so with Root picked every kind and status counts 0
export const FilteredEmpty: StoryObj = {
    ...treasuryTab(spends, {status: 'PaymentFailed', track: '0'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching spends.')).toBeInTheDocument()
        expect(await filterOptions(canvasElement, 'Kind')).toEqual(['[All]', 'Local 0', 'Spend 0'])
        expect(await filterOptions(canvasElement, 'Status')).toEqual(['All', 'Spend approved 0', 'Awarded 0', 'Asset spend approved 0', 'Paid 0', 'Asset spend voided 0', '[Payment failed 0]', 'Spend processed 0'])
        expect(await filterOptions(canvasElement, 'Track')).toEqual(['All', '[Root 0]', 'Runtime Upgrade 0', 'Wish For Change 0', 'Identity Admin 0', 'Referendum Canceller 0', 'Referendum Killer 0', 'Small Spender 2', 'Medium Spender 3', 'Big Spender 2'])
    },
}
