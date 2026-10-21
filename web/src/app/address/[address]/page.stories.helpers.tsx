import type {RequestHandler} from 'msw'
import {paged} from '../../../../../mock/fixtures.js'
import {bytecode, calldata, evmAddress, evmTx, exit, EXIT, SELECTOR, token, UINT256_MAX, units, WTMR} from '../../../../../mock/fixtures/evm.js'
import {pageStory} from '../../../../.storybook/page'

interface AddressData {
    txs?: object[]
    holdings?: object[]
    notHeld?: object[]
    created?: object[]
    asToken?: object | null
}

type HolderArgs = {where: {balance_gt?: number}; limit: number; offset: number}

// the page asks evmTransactions twice, for the address's own list and for the tx that created it.
// the index keeps rows for tokens the address doesn't hold, only a query asking for a balance above zero leaves them out
export const addressPage = (address: string, {txs = [], holdings = [], notHeld = [], created = [], asToken = null}: AddressData = {}, searchParams = {}, msw: RequestHandler[] = []) => {
    const holderRows = ({where}: HolderArgs) => (where.balance_gt === 0 ? holdings : [...holdings, ...notHeld])
    return pageStory(
        {
            evmTransactions: (args: {where: {OR?: unknown}; limit: number; offset: number}) => (args.where.OR ? paged(txs)(args) : created),
            evmTransactionsConnection: {totalCount: txs.length},
            tokenHolders: (args: HolderArgs) => paged(holderRows(args))(args),
            tokenHoldersConnection: (args: HolderArgs) => ({totalCount: holderRows(args).length}),
            tokenById: asToken,
        },
        {params: {address}, searchParams, msw}
    )
}

export const alice = evmAddress(0)
export const bob = evmAddress(1)

export const everyTx = [
    {from: alice, to: bob, value: units(12.5, 18), txType: 'Legacy'},
    {from: bob, to: alice, value: units(0.000001, 18)},
    {from: alice, to: WTMR.id, input: calldata(SELECTOR.transfer, bob, units(10, 1)), gasLimit: '65000', gasUsed: '51234', txType: 'EIP2930', ...exit(EXIT.returned)},
    {from: alice, to: null, contractAddress: evmAddress(40), input: bytecode(2_048), gasLimit: '3000000', gasUsed: '1800000', ...exit(EXIT.returned)},
    {from: alice, to: WTMR.id, input: calldata(SELECTOR.transfer, bob, units(9_999_999, 1)), gasLimit: '65000', gasUsed: '24871', ...exit(EXIT.reverted)},
    {from: alice, to: token(0).id, input: calldata(SELECTOR.approve, bob, UINT256_MAX), gasLimit: '30000', gasUsed: '30000', ...exit(EXIT.outOfGas)},
    {from: alice, to: bob, value: units(1, 18), txType: 'EIP7702', ...exit(EXIT.notSupported)},
    {from: alice, to: alice, value: units(3, 18)},
    {from: bob, to: alice, value: UINT256_MAX},
]

export const contract = evmAddress(40)
export const deploy = evmTx(900_000, 0, {from: alice, to: null, contractAddress: contract, input: bytecode(2_048), gasLimit: '3000000', gasUsed: '1800000', ...exit(EXIT.returned)})

export const factoryBuilt = token(3, {name: null, symbol: null, deployTx: null})
