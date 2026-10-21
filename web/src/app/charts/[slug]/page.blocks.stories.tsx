import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Blocks Produced', ...pageMeta(ChartPage)}

export const Empty = chart('blocks', NONE)
export const OneDay = chart('blocks', FIRST)
export const ManyDays = chart('blocks', DAILY)
