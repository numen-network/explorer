import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, waitFor} from 'storybook/test'
import data from '../../../../mock/data.js'
import {numn} from '../../../../mock/fixtures.js'
import {linear, listed, reciprocal, stepped, track} from '../../../../mock/fixtures/governance.js'
import {axesLegible, columnTexts, expectLegibleAxes} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import GovernancePage from './page'

export default {title: 'Pages/Governance/Tracks', ...pageMeta(GovernancePage)}

const tracksTab = (rows: object[]): StoryObj => ({...pageStory({...data, tracks: listed(rows), tracksConnection: {totalCount: rows.length}}, {searchParams: {tab: 'tracks'}}), play: rows.length ? axesLegible : undefined})

const CURVES = [linear(5e8, 5e8, 1e9), reciprocal('222222224', '333333335', '333333332'), stepped(1e9, 5e8, 1e8, 2e8)]

export const Empty = tracksTab([])

export const One = tracksTab(data.tracks.slice(6, 7))

export const EveryCurve = tracksTab([
    ...data.tracks,
    track('40', 'stepped_spender', {maxSpend: numn(50_000), minApproval: stepped(1e9, 5e8, 1e8, 2e8), minSupport: stepped(2e8, 1e7, 5e7, 2.5e8)}),
])

const extremeTracks = tracksTab([
    track('50', 'fast_track', {preparePeriod: 1, decisionPeriod: 60, confirmPeriod: 6, minEnactmentPeriod: 0, decisionDeposit: '1'}),
    track('51', 'a_track_name_long_enough_to_wrap_inside_its_card_title', {
        maxDeciding: 2_147_483_647,
        maxSpend: '340282366920938463463374607431768211455',
        decisionPeriod: 3_153_600,
        minSupport: reciprocal('1', '1', '0'),
    }),
])

// the widest values keep their separators and a period of one block hovers in the singular
export const Extremes: StoryObj = {
    ...extremeTracks,
    play: async context => {
        await extremeTracks.play!(context)
        const {canvas, userEvent} = context
        await expect(canvas.getByRole('cell', {name: '2,147,483,647'})).toBeVisible()
        const prepare = canvas.getByRole('cell', {name: 'Fast Track'}).closest('tr')!.children[5]
        await userEvent.hover(prepare.querySelector('[data-slot=tooltip-trigger]')!)
        await expect(await screen.findByRole('tooltip')).toHaveTextContent(/^1 block$/)
    },
}

// periods that stop between two whole units of time
export const UnevenPeriods: StoryObj = {
    ...tracksTab([track('60', 'uneven_track', {preparePeriod: 540, decisionPeriod: 36_000, confirmPeriod: 2_100, minEnactmentPeriod: 45})]),
    play: async ({canvasElement}) => {
        await waitFor(() => expectLegibleAxes(canvasElement))
        const row = canvasElement.querySelector<HTMLTableRowElement>('tbody tr')!
        await expect([...row.cells].slice(-4).map(cell => cell.textContent)).toEqual(['1h 30m', '4d 4h', '5h 50m', '7m 30s'])
    },
}

const manyTracks = tracksTab(Array.from({length: 24}, (_, i) => track(String(i), `track_${i}`, {minApproval: CURVES[i % 3], minSupport: linear(1e9, 0, 2e8 + i * 1e7)})))

// two-digit ids come after the single digits
export const Many: StoryObj = {
    ...manyTracks,
    play: async context => {
        await manyTracks.play!(context)
        await expect(columnTexts(context.canvasElement, 'Track')).toEqual(Array.from({length: 20}, (_, i) => `Track ${i}`))
    },
}
