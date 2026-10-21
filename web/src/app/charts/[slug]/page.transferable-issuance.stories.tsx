import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/Transferable Issuance', ...pageMeta(ChartPage)}

export const Empty = chart('transferable-issuance', NONE)
export const OneDay = chart('transferable-issuance', FIRST)
export const ManyDays = chart('transferable-issuance', DAILY)
