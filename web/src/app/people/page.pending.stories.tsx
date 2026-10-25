import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {HEAD, numn, person} from '../../../../mock/fixtures.js'
import {lastPage, pageMeta} from '../../../.storybook/page'
import PeoplePage from './page'
import {EVERY_VERDICT, U128_MAX, bare, identities, registered, request} from './page.stories.helpers'

export default {title: 'Pages/People/Pending', ...pageMeta(PeoplePage)}

const pendingTab = (pending: object[], page = '1') => identities(EVERY_VERDICT, {pending, tab: 'pending', page})

const seat = (index: number) => ({index, account: person(index)})

const cells = (root: HTMLElement, col: number) => within(root).getAllByRole('row').slice(1).map(r => r.children[col].textContent)

export const Empty: StoryObj = {
    ...pendingTab([]),
    play: async ({canvas}) => expect(canvas.getByText('No pending judgement requests yet.')).toBeVisible(),
}

export const One: StoryObj = {
    ...pendingTab([request(registered(40, 'Liquidity'), seat(1), HEAD - 26_000, numn(10))]),
    play: async ({canvasElement}) => {
        expect(cells(canvasElement, 2)).toEqual(['Liquidity'])
        expect(cells(canvasElement, 4)).toEqual(['10 NUMN'])
    },
}

// the longest wait first, an applicant with no name, a seat since retired and the widest fee
export const EveryCase: StoryObj = {
    ...pendingTab([
        request(registered(41, 'Liquidity'), seat(1), HEAD - 26_000, numn(10)),
        request(bare(42), seat(0), HEAD - 14_000, numn(1)),
        request(registered(43, 'Orbit Labs'), {index: 3, account: null}, HEAD - 9_000),
        request(registered(44, 'Polaris Guild'), seat(2), HEAD - 60, U128_MAX),
    ]),
    play: async ({canvasElement}) => {
        expect(cells(canvasElement, 3)[2]).toBe('#3Retired')
        expect(cells(canvasElement, 2)[0]).toBe('Liquidity')
    },
}

const many = Array.from({length: 45}, (_, i) => request(registered(100 + i, `Applicant ${i + 1}`), seat(i % 3), HEAD - 50_000 + i * 1_000))

export const Many = pendingTab(many)

export const Page2 = pendingTab(many, '2')

export const LastPage = pendingTab(many, lastPage(many.length))
