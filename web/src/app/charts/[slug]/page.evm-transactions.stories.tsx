import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/EVM Transactions', ...pageMeta(ChartPage)}

export const Empty = chart('evm-transactions', NONE)
export const OneDay = chart('evm-transactions', FIRST)
export const ManyDays = chart('evm-transactions', DAILY)

export const AfterQuietDay = chart('evm-transactions', DAILY.map((d, i) => (i === DAILY.length - 2 ? {...d, evmTxs: 0} : d)))

export const AllZero = chart('evm-transactions', DAILY.map(d => ({...d, evmTxs: 0})))
