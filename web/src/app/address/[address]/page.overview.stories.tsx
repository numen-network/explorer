import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {account, chainInfo, rows} from '../../../../../mock/fixtures.js'
import {bytecode, calldata, evmAddress, evmTx, exit, EXIT, NUMN, pair, REVIVE_SPEC, SELECTOR, units, WTMR} from '../../../../../mock/fixtures/evm.js'
import {pageMeta} from '../../../../.storybook/page'
import {ss58Encode} from '@/lib/ss58'
import EvmAddressPage from './page'
import {addressPage, alice, bob, contract, deploy, factoryBuilt} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Address/Overview', ...pageMeta(EvmAddressPage)}

export const ContractDeployed = addressPage(contract, {
    txs: [...rows(4, (h: number, i: number) => evmTx(h, i, {from: evmAddress(i), to: contract, input: calldata(SELECTOR.withdraw), gasLimit: '50000', gasUsed: '29870', ...exit(i === 2 ? EXIT.reverted : EXIT.returned)})), deploy],
    created: [deploy],
})

const wtmrDeploy = evmTx(WTMR.deployTx.block.height, 0, {from: alice, to: null, contractAddress: WTMR.id, input: bytecode(3_072), gasLimit: '3000000', gasUsed: '2100000', ...exit(EXIT.returned)})

export const TokenContract: StoryObj = {
    ...addressPage(WTMR.id, {
        txs: [...rows(3, (h: number, i: number) => evmTx(h, i, {from: evmAddress(i), to: WTMR.id, input: calldata(SELECTOR.transfer, bob, units(i + 1, 1)), gasLimit: '65000', gasUsed: '51234', ...exit(EXIT.returned)})), wtmrDeploy],
        created: [wtmrDeploy],
        asToken: WTMR,
    }),
    play: async ({canvas}) => expect(canvas.queryByText(/^LP /)).toBeNull(),
}

const pool = pair(10, NUMN, {address: WTMR.id, symbol: 'wWTMR', decimals: WTMR.decimals})

// a pair names the two tokens it pools beside its token link
export const PairContract: StoryObj = {
    ...addressPage(pool.id, {txs: rows(2, (h: number, i: number) => evmTx(h, i, {from: evmAddress(i), to: pool.id, input: calldata(SELECTOR.transfer, bob, units(1, 18)), gasLimit: '65000', gasUsed: '48000', ...exit(EXIT.returned)})), asToken: pool}),
    play: async ({canvas}) => expect(canvas.getByText('LP NUMN/wWTMR')).toBeVisible(),
}

export const TokenContractNoMetadata = addressPage(factoryBuilt.id, {
    txs: rows(2, (h: number, i: number) => evmTx(h, i, {from: evmAddress(i), to: factoryBuilt.id, input: calldata(SELECTOR.transfer, bob, units(5, 12)), gasLimit: '65000', gasUsed: '48000', ...exit(EXIT.returned)})),
    asToken: factoryBuilt,
})

const mapping = (root: HTMLElement) => within(root).getByText('Mapped substrate account').parentElement!.textContent

// Frontier hashes the H160 into an account nothing leads back from
export const MappedOneWay: StoryObj = {
    ...addressPage(alice),
    play: async ({canvasElement}) => expect(mapping(canvasElement)).toContain('one way, balances live there'),
}

// under revive an SS58 account whose H160 this is takes the place of the padded account
const SS58_OWNER = account(3)
export const MappedToAnAccountUnderRevive: StoryObj = {
    ...addressPage(alice, {mapped: [{id: SS58_OWNER}], specVersion: REVIVE_SPEC}),
    play: async ({canvasElement}) => expect(mapping(canvasElement)).toBe(`Mapped substrate account${ss58Encode(SS58_OWNER, chainInfo.ss58)}both ways, balances live there`),
}

// an H160 no SS58 account owns maps to itself padded with 0xEE
export const PaddedUnderRevive: StoryObj = {
    ...addressPage(alice, {specVersion: REVIVE_SPEC}),
    play: async ({canvasElement}) => expect(mapping(canvasElement)).toBe(`Mapped substrate account${ss58Encode(alice + 'ee'.repeat(12), chainInfo.ss58)}both ways, balances live there`),
}
