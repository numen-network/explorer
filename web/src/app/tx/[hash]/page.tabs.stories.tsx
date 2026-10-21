import {pageMeta} from '../../../../.storybook/page'
import EvmTxPage from './page'
import {txPage, swap, wrap, payout, swapLogs} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Transaction/Tabs', ...pageMeta(EvmTxPage)}

// the router and the pair moving tokens for bob are third parties, but nothing about a real amount is poisoning
export const EveryTab = txPage(swap, {logs: swapLogs, transfers: [wrap.transfer, payout.transfer]})
