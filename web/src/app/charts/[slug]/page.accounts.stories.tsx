import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Total Accounts', ...pageMeta(ChartPage)}

export const Empty = chart('accounts', NONE)
export const OneDay = chart('accounts', FIRST)
export const ManyDays = chart('accounts', DAILY)
