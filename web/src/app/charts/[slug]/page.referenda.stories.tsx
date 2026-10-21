import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Total Referenda', ...pageMeta(ChartPage)}

export const Empty = chart('referenda', NONE)
export const OneDay = chart('referenda', FIRST)
export const ManyDays = chart('referenda', DAILY)
