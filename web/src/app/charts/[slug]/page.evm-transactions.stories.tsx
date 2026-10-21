import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {DAILY} from '../../../../../mock/fixtures/home.js'
import {pageMeta} from '../../../../.storybook/page'
import ChartPage from './page'
import {chart, NONE, FIRST} from './page.stories.helpers'

export default {title: 'Pages/Charts/EVM Transactions', ...pageMeta(ChartPage)}

export const Empty = chart('evm-transactions', NONE)
export const OneDay = chart('evm-transactions', FIRST)
export const ManyDays = chart('evm-transactions', DAILY)

// a day with no EVM transaction leaves the next day's highlight nothing to compare against
export const AfterQuietDay: StoryObj = {
    ...chart('evm-transactions', DAILY.map((d, i) => (i === DAILY.length - 2 ? {...d, evmTxs: 0} : i === DAILY.length - 1 ? {...d, evmTxs: 42} : d))),
    play: async ({canvas}) => {
        await expect(canvas.getByText('The latest value of EVM Transactions is 42.')).toBeInTheDocument()
    },
}

export const AllZero = chart('evm-transactions', DAILY.map(d => ({...d, evmTxs: 0})))
