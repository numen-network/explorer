import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {seatEntries, seatTimeline, seatVerdicts} from '../../../../../mock/fixtures/accounts.js'
import {PEOPLE} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {figure, named, story, subTabs, wellKnown} from './page.stories.helpers'

export default {title: 'Pages/Account/Registrar | Current', ...pageMeta(AccountPage), decorators: [wellKnown]}

const seat = (spec = {}) => story({account: named(), registrar: 2, refs: PEOPLE, seatEvents: seatTimeline(), verdicts: seatVerdicts(), ...spec}, {tab: 'registrar-current'})

const cells = (root: HTMLElement, col: number) => within(root).getAllByRole('row').slice(1).map(r => r.children[col].textContent)

// the tile speaks for the whole seat, so it sits above the Current and History strip
export const TileAboveStrip: StoryObj = {
    ...seat({entries: seatEntries()}),
    play: async ({canvasElement}) => {
        const strip = within(canvasElement).getByRole('navigation', {name: 'Registrar'})
        const label = [...canvasElement.querySelectorAll('[data-slot=card-description]')].find(d => d.textContent === 'Pending')!
        expect(label.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(subTabs(canvasElement, 'Registrar')).toEqual(['registrar-current', 'registrar'])
        expect(within(strip).getAllByRole('link').map(a => a.querySelector('[data-slot=badge]')!.textContent)).toEqual(['4', '7'])
        expect(figure(canvasElement, 'Pending')).toBe('1')
    },
}

export const Empty: StoryObj = {
    ...seat(),
    play: async ({canvas}) => expect(canvas.getByText('No judgements yet.')).toBeVisible(),
}

export const One: StoryObj = {
    ...seat({entries: seatEntries().slice(0, 1)}),
    play: async ({canvasElement}) => {
        expect(cells(canvasElement, 3)).toEqual(['FeePaid'])
        expect(cells(canvasElement, 4)).toEqual(['12 NUMN'])
    },
}

// a waiting request beside verdicts, the seat judging its own holder through a dispatch with no extrinsic
export const Many: StoryObj = {
    ...seat({entries: seatEntries(), counts: {current: 45}}),
    play: async ({canvasElement}) => {
        expect(cells(canvasElement, 3)).toEqual(['FeePaid', 'KnownGood', 'Reasonable', 'Erroneous'])
        expect(cells(canvasElement, 4)).toEqual(['12 NUMN', '—', '—', '—'])
        expect(cells(canvasElement, 2)[1]).toBe('self')
        expect(cells(canvasElement, 0)[1]).toBe('—')
        expect(within(canvasElement).getByRole('link', {name: /page 3$/})).toBeVisible()
    },
}
