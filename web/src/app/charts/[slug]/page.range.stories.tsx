import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, waitFor, within} from 'storybook/test'
import {HEAD} from '../../../../../mock/fixtures.js'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {axesLegible, categoriesIn, expectNamedNavs} from '../../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import ChartPage from './page'
import {Play, chart, checked} from './page.stories.helpers'

export default {title: 'Pages/Charts/Range', ...pageMeta(ChartPage)}

// the page asks for every day on or after this one when a preset range is picked
const after = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
const since = (days: number) => DAILY.filter(d => d.id >= after(days))
const between = (from: string, to: string) => DAILY.filter(d => d.id >= from && d.id <= to)

// one control in the header holds the pick, a preset or the date range
const preset =
    (label: string): Play =>
    async ({canvas, canvasElement}) => {
        expectNamedNavs(canvasElement)
        await expect(within(canvas.getByRole('navigation', {name: 'Range'})).getByRole('link', {current: 'page'})).toHaveTextContent(label)
        await expect(canvas.getByRole('button', {name: 'Any date'})).toHaveAttribute('data-active', 'false')
    }

const custom =
    (range: string): Play =>
    async ({canvas}) => {
        await expect(within(canvas.getByRole('navigation', {name: 'Range'})).queryByRole('link', {current: 'page'})).toBeNull()
        await expect(canvas.getByRole('button', {name: range})).toHaveAttribute('data-active', 'true')
    }

export const Last30Days = checked(chart('transfers', since(30), {r: '30'}), preset('30D'))
export const Last90Days = checked(chart('transfers', since(90), {r: '90'}), preset('90D'))
export const All = checked(chart('transfers', DAILY, {r: 'all'}), preset('ALL'))

// the index stopped at the last block of a day sixty days back, so the 30 days
// run back from that block
const STALE = DAILY.at(-61)!
export const Last30DaysIndexBehind = checked(
    {
        ...pageStory(
            {
                blocks: () => [{height: HEAD - 60 * 8_640, timestamp: `${STALE.id}T23:59:50.000Z`}],
                dailyStats: ({where}: {where?: {date_gte?: string}}) => DAILY.filter(d => d.id <= STALE.id && d.date >= (where?.date_gte ?? '')),
            },
            {params: {slug: 'transfers'}, searchParams: {r: '30'}}
        ),
        play: axesLegible,
    },
    async ({canvasElement}) => {
        const [days] = categoriesIn(canvasElement)
        await expect(days).toHaveLength(31)
        await expect(days.at(-1)).toBe(STALE.id)
    }
)

// the newest indexed block sits late on 2026-08-10, the calendar ends on that day
const CALENDAR_HEAD = '2026-08-10T23:59:50.000Z'
export const CustomIndexBehind: StoryObj = {
    ...pageStory({dailyStats: DAILY, blocks: () => [{height: HEAD - 60 * 8_640, timestamp: CALENDAR_HEAD}]}, {params: {slug: 'transfers'}}),
    play: async ({canvas}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'Any date'}))
        const day = (d: number) => document.querySelector(`[data-day="${new Date(2026, 7, d).toLocaleDateString()}"]`)
        await waitFor(() => expect(day(10)).toBeEnabled())
        await expect(day(11)).toBeDisabled()
    },
}

const FROM = DAILY[40].id
const TO = DAILY[60].id

export const Custom = checked(chart('issuance', between(FROM, TO), {after: FROM, before: TO}), custom(`${FROM} to ${TO}`))
export const CustomFromOnly = checked(chart('issuance', DAILY.filter(d => d.id >= TO), {after: TO}), custom(`${TO} to …`))
export const CustomToOnly = checked(chart('issuance', DAILY.filter(d => d.id <= FROM), {before: FROM}), custom(`… to ${FROM}`))
export const CustomOneDay = checked(chart('issuance', between(FROM, FROM), {after: FROM, before: FROM}), custom(`${FROM} to ${FROM}`))

// a bad day in the url sets no bound, impossible dates like 2026-02-30 included
export const CustomInvalidFrom = checked(chart('issuance', DAILY.filter(d => d.id <= FROM), {after: 'yesterday', before: FROM}), custom(`… to ${FROM}`))
export const CustomInvalidTo = checked(chart('issuance', DAILY.filter(d => d.id >= TO), {after: TO, before: '2026-02-30'}), custom(`${TO} to …`))
export const CustomInvalidBoth = checked(chart('issuance', since(365), {after: '2026-13-45', before: 'today'}), preset('365D'))
