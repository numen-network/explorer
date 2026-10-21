import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Transfers', ...pageMeta(ChartPage)}

export const Empty = chart('transfers', NONE)
export const OneDay = chart('transfers', FIRST)
export const ManyDays = chart('transfers', DAILY)
