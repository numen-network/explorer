import {expect} from 'storybook/test'
import {numn} from '../../../../../mock/fixtures.js'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {lastTooltipLines} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST, checked} from './page.stories.helpers'

export default {title: 'Pages/Charts/Treasury Pot', ...pageMeta(ChartPage)}

export const Empty = chart('treasury', NONE)
export const OneDay = chart('treasury', FIRST)
export const ManyDays = chart('treasury', DAILY)

// the newest day's pot cut short and the day before's whole
const potUp = [...DAILY.slice(0, -2), {...DAILY.at(-2)!, treasuryPot: numn(21_000_000)}, {...DAILY.at(-1)!, treasuryPot: numn(52_513_000)}]

export const ShortForm = checked(chart('treasury', potUp), async ({canvas, canvasElement}) => {
    await expect(canvas.getByText('The latest value of Treasury Pot is ≈52.51M NUMN. Compared with the day before it is up by 150.06%.')).toBeInTheDocument()
    expect(lastTooltipLines(canvasElement)[0]).toContain('≈52.51M NUMN')
})
