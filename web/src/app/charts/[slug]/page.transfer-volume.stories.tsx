import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Transfer Volume', ...pageMeta(ChartPage)}

export const Empty = chart('transfer-volume', NONE)
export const OneDay = chart('transfer-volume', FIRST)
export const ManyDays = chart('transfer-volume', DAILY)
