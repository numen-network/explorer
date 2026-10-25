import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {seatTimeline, seatVerdicts} from '../../../../../mock/fixtures/accounts.js'
import {PEOPLE} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, named} from './page.stories.helpers'

export default {title: 'Pages/Account/Registrar | History', ...pageMeta(AccountPage), decorators: [wellKnown]}

const seat = (spec = {}) => story({account: named(), registrar: 2, refs: PEOPLE, verdicts: seatVerdicts(), ...spec}, {tab: 'registrar'})

const cells = (root: HTMLElement, col: number) => within(root).getAllByRole('row').slice(1).map(r => r.children[col].textContent)

export const Empty: StoryObj = {
    ...seat(),
    play: async ({canvas}) => expect(canvas.getByText('No requests or judgements yet.')).toBeVisible(),
}

export const One: StoryObj = {
    ...seat({seatEvents: seatTimeline().slice(0, 1)}),
    play: async ({canvasElement}) => expect(cells(canvasElement, 2)).toEqual(['JudgementRequested']),
}

// every kind of row, a verdict lost to a clear, the seat judging its own holder and a dispatch with no extrinsic
export const Many: StoryObj = {
    ...seat({seatEvents: seatTimeline(), counts: {seat: 41}}),
    play: async ({canvasElement}) => {
        expect(cells(canvasElement, 2)).toEqual(['JudgementRequested', 'JudgementGiven', 'JudgementGiven', 'JudgementUnrequested', 'JudgementGiven', 'JudgementRequested', 'JudgementGiven'])
        expect(cells(canvasElement, 4)).toEqual(['—', 'Erroneous', 'KnownGood', '—', '—', '—', 'FeePaid'])
        expect(cells(canvasElement, 3)[2]).toBe('self')
        expect(cells(canvasElement, 0)[2]).toBe('—')
        expect(within(canvasElement).getByRole('link', {name: /page 3$/})).toBeVisible()
    },
}
