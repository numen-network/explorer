import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {lastTooltipLines, tooltipsInView} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST, checked} from './page.stories.helpers'

export default {title: 'Pages/Charts/Total Issuance', ...pageMeta(ChartPage)}

export const Empty = chart('issuance', NONE)
export const OneDay = chart('issuance', FIRST)
export const ManyDays = chart('issuance', DAILY)

// issuance near ten billion coins, more millionths of a coin than a float
// holds exactly, the newest day one planck short of ten billion
const tenBillions = DAILY.map(d => ({...d, issuanceTotal: String(BigInt(d.issuanceTotal) + 9_397_000_000n * 10n ** 18n)}))
const justUnderTenBillion = [...tenBillions.slice(0, -1), {...tenBillions.at(-1)!, issuanceTotal: '9999999999999999999999999999'}]

export const PastFloat = checked(chart('issuance', justUnderTenBillion), async ({canvas, canvasElement}) => {
    await expect(canvas.getByText(/^The latest value of Total Issuance is ≈9\.99B NUMN\./)).toBeInTheDocument()
    expect(lastTooltipLines(canvasElement)[0]).toContain('≈9.99B NUMN')
})

// a nine digit NUMN reading makes the widest tooltip a chart shows
export const ManyDaysTooltip: StoryObj = {...ManyDays, play: tooltipsInView}
export const OneDayTooltip: StoryObj = {...OneDay, play: tooltipsInView}
