import {pageMeta} from '../../../../.storybook/page'
import EvmTxPage from './page'
import {txPage, plain} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Transaction/Native transfers', ...pageMeta(EvmTxPage)}

export const PlainValueTransfer = txPage(plain)
