import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {HEAD} from '../../../../../mock/fixtures.js'
import {bytecode, calldata, erc20Transfer, evmLog, evmTx, exit, EXIT, SELECTOR, token, TOPIC, topicOf, UINT256_MAX, units, WTMR, ZERO_ADDRESS} from '../../../../../mock/fixtures/evm.js'
import {expectAddressForm, expectFits, expectTimesFit} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import EvmTxPage from './page'
import {txPage, alice, bob, call, callTransfer, swap, wrap, payout, swapLogs} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Transaction/Overview', ...pageMeta(EvmTxPage)}

export const CallSucceeded = txPage(call, {logs: [callTransfer.log], transfers: [callTransfer.transfer]})

export const Reverted = txPage(
    evmTx(HEAD - 10, 1, {from: alice, to: WTMR.id, input: calldata(SELECTOR.transfer, bob, units(9_999_999, WTMR.decimals)), gasLimit: '65000', gasUsed: '24871', nonce: 42, ...exit(EXIT.reverted)})
)

export const OutOfGas = txPage(
    evmTx(HEAD - 20, 0, {from: bob, to: token(0).id, input: calldata(SELECTOR.approve, alice, UINT256_MAX), gasLimit: '30000', gasUsed: '30000', txType: 'EIP2930', ...exit(EXIT.outOfGas)})
)

export const FatalError = txPage(evmTx(HEAD - 30, 0, {from: bob, to: alice, value: units(1, 18), txType: 'EIP7702', ...exit(EXIT.notSupported)}))

export const InputShorterThanSelector: StoryObj = {
    ...txPage(evmTx(HEAD - 35, 0, {from: bob, to: alice, input: '0x01', gasLimit: '25000', gasUsed: '21016'})),
    play: async ({canvas}) => expect(canvas.getByRole('button', {name: '0x · 1 byte'})).toBeVisible(),
}

const dust = token(9)
const creation = evmTx(HEAD - 40, 0, {from: alice, to: null, contractAddress: dust.id, input: bytecode(4_321), nonce: 12_345, gasLimit: '3000000', gasUsed: '2456789', txType: 'Legacy', ...exit(EXIT.returned)})
const mint = erc20Transfer(creation, 1, dust, ZERO_ADDRESS, alice, dust.totalSupply)
const ownership = evmLog(creation, 0, {topics: [TOPIC.ownershipTransferred, topicOf(ZERO_ADDRESS), topicOf(alice)]})

// a create names the contract it made where a call names its recipient, and its input is the init code
export const ContractCreation: StoryObj = {
    ...txPage(creation, {logs: [ownership, mint.log], transfers: [mint.transfer]}),
    play: async ({canvas}) => {
        await expect(within(canvas.getByText('Contract created').nextElementSibling as HTMLElement).getByRole('link')).toHaveAttribute('href', `/address/${dust.id}`)
        await expect(canvas.queryByText('To')).toBeNull()
        await expect(canvas.getByRole('button', {name: '0x60806040 · 4,321 bytes'})).toBeVisible()
    },
}

export const ContractCreationInputOpen: StoryObj = {
    ...txPage(creation, {logs: [ownership, mint.log], transfers: [mint.transfer]}),
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByText(/bytes$/))
    },
}

export const ExtremeNumbers: StoryObj = {
    ...txPage(evmTx(HEAD - 70, 0, {value: UINT256_MAX, gasLimit: '30000000', gasUsed: '29999999', gasPrice: (10n ** 18n).toString(), nonce: 2_147_483_647, txType: 'Legacy'})),
    play: async ({canvas}) => expect(canvas.getByText('Legacy · nonce 2,147,483,647')).toBeVisible(),
}

// from and to keep their full form and wrap inside their rows, the timestamp
// breaks after its age inside its own
export const AddressesAndTimeFit: StoryObj = {
    ...txPage(swap, {logs: swapLogs, transfers: [wrap.transfer, payout.transfer]}),
    play: async ({canvasElement}) => {
        const card = canvasElement.querySelector('[data-slot=card]')!
        expectAddressForm(card)
        expectFits(...[...card.querySelectorAll('a[href^="/address/"]')].map(link => link.closest('[data-slot=card] > *')!))
        expectTimesFit(card)
    },
}
