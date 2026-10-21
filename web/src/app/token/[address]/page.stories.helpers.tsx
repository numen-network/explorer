import type {RequestHandler} from 'msw'
import type {EvmActivity, TokenRow} from '@/lib/gql'
import {activity, token} from '../../../../../mock/fixtures/evm.js'
import {pageStory} from '../../../../.storybook/page'

// the index answers the activity lookup in an order of its own, so the tallies
// go in reversed and the page has to match them up by address
export const tokenPage = (
    tok: TokenRow,
    {
        holders = [],
        transfers = [],
        tallies = holders.map((h, i) => activity(h.address, i)),
        created = [],
        msw = [],
    }: {holders?: {address: string}[]; transfers?: object[]; tallies?: EvmActivity[]; created?: object[]; msw?: RequestHandler[]} = {},
    searchParams = {}
) => pageStory({tokenById: tok, tokenHolders: holders, evmAddresses: [...tallies].reverse(), tokenTransfers: transfers, evmTransactions: created}, {params: {address: tok.id}, searchParams, msw})

export const orbit = token(0)
export const solo = token(2, {holderCount: 1, transferCount: 1})
export const bare = token(1, {name: null, symbol: null, decimals: null})
