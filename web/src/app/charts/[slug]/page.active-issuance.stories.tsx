import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Active Issuance', ...pageMeta(ChartPage)}

export const Empty = chart('active-issuance', NONE)
export const OneDay = chart('active-issuance', FIRST)
export const ManyDays = chart('active-issuance', DAILY)
