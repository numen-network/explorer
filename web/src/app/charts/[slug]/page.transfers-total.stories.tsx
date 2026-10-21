import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Total Transfers', ...pageMeta(ChartPage)}

export const Empty = chart('transfers-total', NONE)
export const OneDay = chart('transfers-total', FIRST)
export const ManyDays = chart('transfers-total', DAILY)
