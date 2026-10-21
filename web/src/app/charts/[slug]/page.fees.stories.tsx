import {expect} from 'storybook/test'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST, checked} from './page.stories.helpers'

export default {title: 'Pages/Charts/Transaction Fees', ...pageMeta(ChartPage)}

export const Empty = chart('fees', NONE)
export const OneDay = chart('fees', FIRST)
export const ManyDays = chart('fees', DAILY)

// the newest day's fees are exactly a tenth over the day before's, down to a
// digit past the millionth of a coin
const feesUpATenth = [...DAILY.slice(0, -2), {...DAILY.at(-2)!, fees: '3000001000000000000'}, {...DAILY.at(-1)!, fees: '3300001100000000000'}]

export const ChangeEdge = checked(chart('fees', feesUpATenth), async ({canvas}) => {
    await expect(canvas.getByText('The latest value of Transaction Fees is ≈3.3 NUMN. Compared with the day before it is up by 10.00%.')).toBeInTheDocument()
})
