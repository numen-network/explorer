import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {PEOPLE} from '../../../mock/fixtures.js'
import {SPEND_STATUSES, spend} from '../../../mock/fixtures/governance.js'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {NEAREST, UPCOMING, UPCOMING_SPENDS, expectLevel, home, listCard, listRows, many, strips} from './page.stories.helpers'

export default {title: 'Pages/Home/Spends', ...pageMeta(Home)}

const titled = (n: number, status: string, title: string | null = `Grant number ${n}`, traits: object = {}) => spend(n, status, {referendum: {index: 100 + n, title}, ...traits})
const spendsTab = (spends: object[]) => pageStory(home({...many, spends}), {searchParams: {tab: 'spends'}})
const badges = (root: HTMLElement) => listRows(root, 'Governance').map(row => row.querySelector('[data-slot=badge]')?.textContent)

export const Empty: StoryObj = {
    ...spendsTab([]),
    play: async ({canvasElement}) => expect(within(listCard(canvasElement, 'Governance')).getByText('No spends yet.')).toBeVisible(),
}

export const One: StoryObj = {
    ...spendsTab([titled(4, 'AssetSpendApproved', 'Wallet audit, second stage', {beneficiary: PEOPLE[2]})]),
    play: async ({canvasElement}) => {
        const [row] = listRows(canvasElement, 'Governance')
        expect(within(row).getByRole('link', {name: '#4'})).toHaveAttribute('href', '/referendum/104')
        expect(within(row).getByText('Wallet audit, second stage')).toBeVisible()
        expect(within(row).getByText('Spend')).toBeVisible()
        expect(within(row).getByRole('link', {name: '#104'})).toBeVisible()
        expect(within(row).getByText('Asset spend approved')).toBeVisible()
        expect(within(row).getAllByText('·')).toHaveLength(2)
    },
}

export const Many: StoryObj = {
    ...spendsTab([0, 1, 2, 3, 4].map(n => titled(n, 'Paid'))),
    play: async ({canvasElement}) => expect(listRows(canvasElement, 'Governance')).toHaveLength(5),
}

// one row per status a spend can last have raised, spend_local ones read Local
export const EveryStatus: StoryObj = {
    ...spendsTab(SPEND_STATUSES.map((status, i) => titled(i, status))),
    play: async ({canvasElement}) => expect(badges(canvasElement)).toEqual(['Spend approved', 'Awarded', 'Asset spend approved', 'Paid', 'Asset spend voided', 'Payment failed', 'Spend processed']),
}

// with no referendum on record the row names the spend itself and links to the treasury list
export const NoReferendum: StoryObj = {
    ...spendsTab([spend(1, 'Awarded', {referendum: null})]),
    play: async ({canvasElement}) => {
        const [row] = listRows(canvasElement, 'Governance')
        expect(within(row).getByText('Treasury spend #1')).toBeVisible()
        expect(within(row).getByRole('link', {name: '#1'})).toHaveAttribute('href', '/governance?tab=treasury')
        expect(within(row).queryByText(/^Referendum/)).toBeNull()
    },
}

// an untitled referendum leaves the spend to name itself
export const UntitledReferendum: StoryObj = {
    ...spendsTab([titled(2, 'Paid', null)]),
    play: async ({canvasElement}) => expect(within(listRows(canvasElement, 'Governance')[0]).getByText('Treasury spend #2')).toBeVisible(),
}

// the strips sit over the spends as they do over the referenda, and side by side both spends still fit
export const Deadlines: StoryObj = {
    ...pageStory(home({...many, spends: UPCOMING_SPENDS, upcoming: UPCOMING}), {searchParams: {tab: 'spends'}}),
    play: async ({canvasElement}) => {
        expect(strips(canvasElement)).toEqual(NEAREST.slice(0, 3))
        expect(within(listCard(canvasElement, 'Governance')).getByRole('button', {name: 'Show 4 more'})).toBeVisible()
        expectLevel(canvasElement, 2, 2)
    },
}
