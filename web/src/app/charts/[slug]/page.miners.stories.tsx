import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Active Miners', ...pageMeta(ChartPage)}

export const Empty = chart('miners', NONE)
export const OneDay = chart('miners', FIRST)
export const ManyDays = chart('miners', DAILY)
