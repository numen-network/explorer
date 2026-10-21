import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Total Signed Extrinsics', ...pageMeta(ChartPage)}

export const Empty = chart('extrinsics-total', NONE)
export const OneDay = chart('extrinsics-total', FIRST)
export const ManyDays = chart('extrinsics-total', DAILY)
