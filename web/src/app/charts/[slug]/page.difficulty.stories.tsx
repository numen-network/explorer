import {expect} from 'storybook/test'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {lastTooltipLines} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST, checked} from './page.stories.helpers'

export default {title: 'Pages/Charts/Difficulty', ...pageMeta(ChartPage)}

export const Empty = chart('difficulty', NONE)
export const OneDay = chart('difficulty', FIRST)
export const ManyDays = chart('difficulty', DAILY)

export const Extreme = chart('difficulty', DAILY.map(d => ({...d, difficultyClose: String(BigInt(d.difficultyClose) * 200_000n)})))

// the newest two days climb from just under a quintillion to just over it,
// where a float no longer tells neighbouring integers apart
const quintillions = DAILY.map(d => ({...d, difficultyClose: String(BigInt(d.difficultyClose) * 200_000_000n)}))
const pastQuintillion = [...quintillions.slice(0, -2), {...quintillions.at(-2)!, difficultyClose: '999999999999999999'}, {...quintillions.at(-1)!, difficultyClose: '1000000000000000001'}]

export const PastFloat = checked(chart('difficulty', pastQuintillion), async ({canvas, canvasElement}) => {
    await expect(canvas.getByText('The latest value of Difficulty is 1,000,000,000,000,000,001. Compared with the day before it is up by <0.01%.')).toBeInTheDocument()
    expect(lastTooltipLines(canvasElement)[0]).toContain('1,000,000,000,000,000,001')
})
