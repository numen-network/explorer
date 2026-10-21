import type {StoryObj} from '@storybook/nextjs-vite'
import * as echarts from 'echarts'
import {expect, waitFor, within} from 'storybook/test'
import {accountDayRows} from '../../../../../mock/fixtures/accounts.js'
import {all, axesLegible, categoriesIn, lastTooltipLines, lonePointsPainted, pixelAt, tooltipsInView, plotLefts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story} from './page.stories.helpers'

export default {title: 'Pages/Account/Charts', ...pageMeta(AccountPage), decorators: [wellKnown]}

const DAYS = accountDayRows(30)
const charted = (spec = {}, searchParams: Record<string, string> = {}) => story({accountDays: DAYS, ...spec}, {tab: 'charts', ...searchParams})
const chartSeries = (root: HTMLElement) => {
    const chart = [...root.querySelectorAll<HTMLElement>('[_echarts_instance_]')].map(el => echarts.getInstanceByDom(el)!)[0]
    return chart.getOption() as {series: {name: string; data: number[]}[]; yAxis: unknown[]}
}
// the note under a chart starts where its plot does
const noteAligned = async (root: HTMLElement, note: string) => {
    const text = within(root).getByText(note)
    expect(text.closest('[data-slot=card]')).not.toBeNull()
    const chart = root.querySelector<HTMLElement>('[_echarts_instance_]')!
    await waitFor(() => expect(text.getBoundingClientRect().left + parseFloat(getComputedStyle(text).paddingLeft) - chart.getBoundingClientRect().left).toBeCloseTo(plotLefts(root)[0], 0))
}
const chartViews = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Chart'})).getAllByRole('link')

export const Balance: StoryObj = {
    ...charted(),
    play: all(axesLegible, tooltipsInView, async ({canvasElement}) => {
        expect(chartViews(canvasElement).map(l => [l.textContent, l.dataset.active])).toEqual([
            ['Balance', 'true'],
            ['Activity', 'false'],
            ['Fees', 'false'],
        ])
        // the quiet days between the rows are filled in, up to the head day
        const [days] = categoriesIn(canvasElement)
        expect(days).toHaveLength(30)
        expect(days[0]).toBe(DAYS[0].day)
        expect(days.at(-1)).toBe(DAYS.at(-1)!.day)
        const {series, yAxis} = chartSeries(canvasElement)
        expect(series.map(s => s.name)).toEqual(['Transferable', 'Locked'])
        await noteAligned(canvasElement, 'at the last block of each UTC day')
        expect(yAxis).toHaveLength(1)
        // the two layers pile up to free plus reserved
        const last = DAYS.at(-1)!
        expect(series[0].data.at(-1)! + series[1].data.at(-1)!).toBeCloseTo(Number(BigInt(last.free) + BigInt(last.reserved)) / 1e18)
        // a day with nothing locked keeps the transferable edge on top
        const chart = echarts.getInstanceByDom(canvasElement.querySelector<HTMLElement>('[_echarts_instance_]')!)!
        expect(series[1].data[1]).toBe(0)
        await waitFor(() => expect(pixelAt(chart, 0, [1, series[0].data[1]])).toBe('4caf50'))
        // a quiet day holds the close before it
        const quiet = days.findIndex(d => !DAYS.some(r => r.day === d))
        expect(series.map(s => s.data[quiet])).toEqual(series.map(s => s.data[quiet - 1]))
        expect(lastTooltipLines(canvasElement)[0].slice(0, 2)).toEqual([`${last.day} (UTC)`, 'Balance: 2,105 NUMN'])
    }),
}

// a view the strip does not offer opens the default one
export const UnknownView: StoryObj = {
    ...charted({}, {chart: 'flow'}),
    play: async ({canvasElement}) => {
        await waitFor(() => expect(chartViews(canvasElement).find(l => l.dataset.active === 'true')?.textContent).toBe('Balance'))
    },
}

export const Activity: StoryObj = {
    ...charted({}, {chart: 'activity'}),
    play: all(axesLegible, tooltipsInView, async ({canvasElement}) => {
        const {series} = chartSeries(canvasElement)
        expect(series.map(s => s.name)).toEqual(['Extrinsics', 'Transfer-in', 'Transfer-out'])
        const [days] = categoriesIn(canvasElement)
        const quiet = days.findIndex(d => !DAYS.some(r => r.day === d))
        expect(series.map(s => s.data[quiet])).toEqual([0, 0, 0])
        await noteAligned(canvasElement, 'summed over each UTC day')
        expect(within(canvasElement).queryByText(/at the last block/)).toBeNull()
    }),
}

export const Fees: StoryObj = {
    ...charted({}, {chart: 'fees'}),
    play: all(axesLegible, tooltipsInView, async ({canvasElement}) => {
        expect(chartSeries(canvasElement).series.map(s => s.name)).toEqual(['To treasury', 'To miner', 'Tip'])
        const [lines] = lastTooltipLines(canvasElement)
        expect(lines.slice(0, 2)).toEqual([`${DAYS.at(-1)!.day} (UTC)`, 'Fees: 0.55 NUMN'])
        await noteAligned(canvasElement, 'summed over each UTC day')
        expect(within(canvasElement).queryByText(/at the last block/)).toBeNull()
    }),
}

// a single day the account was ever touched draws as a dot
export const OneDay: StoryObj = {...charted({accountDays: DAYS.slice(-1)}), play: lonePointsPainted}

// nothing happened in the window, so the close before it runs flat across all of it
export const QuietWindow: StoryObj = {
    ...charted({accountDays: [], priorDay: {...DAYS[0], day: '2020-01-01'}}, {r: '30'}),
    play: async ({canvasElement}) => {
        await waitFor(() => expect(categoriesIn(canvasElement)).toHaveLength(1))
        const [days] = categoriesIn(canvasElement)
        expect(days).toHaveLength(31)
        expect(new Set(chartSeries(canvasElement).series[0].data).size).toBe(1)
    },
}

export const EmptyRange: StoryObj = {
    ...charted({accountDays: [], counts: {accountDays: 30}}, {after: '2020-01-01', before: '2020-01-31'}),
    play: async ({canvasElement}) => {
        await within(canvasElement).findByText('No data in this range.')
    },
}
