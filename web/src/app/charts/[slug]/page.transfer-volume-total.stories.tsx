import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Total Transfer Volume', ...pageMeta(ChartPage)}

export const Empty = chart('transfer-volume-total', NONE)
export const OneDay = chart('transfer-volume-total', FIRST)
export const ManyDays = chart('transfer-volume-total', DAILY)
