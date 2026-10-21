import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Signed Extrinsics', ...pageMeta(ChartPage)}

export const Empty = chart('extrinsics', NONE)
export const OneDay = chart('extrinsics', FIRST)
export const ManyDays = chart('extrinsics', DAILY)
