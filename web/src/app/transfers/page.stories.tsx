import type {Decorator} from '@storybook/nextjs-vite'
import {WellKnownProvider} from '@/components/wellKnown'
import {ss58Encode} from '@/lib/ss58'
import {PRIME_KEY, transferCases} from '../../../../mock/fixtures/accounts.js'
import {chainInfo, HEAD, rows, transfer} from '../../../../mock/fixtures.js'
import {pageMeta, pageStory} from '../../../.storybook/page'
import TransfersPage from './page'

const wellKnown: Decorator = Story => (
    <WellKnownProvider treasury={ss58Encode(chainInfo.treasuryAccount, chainInfo.ss58)} prime={ss58Encode(PRIME_KEY.id, chainInfo.ss58)} evmChainId={chainInfo.evmChainId}>
        <Story />
    </WellKnownProvider>
)

export default {title: 'Pages/Transfers', ...pageMeta(TransfersPage), decorators: [wellKnown]}

const list = (transfers: object[], total = transfers.length) => pageStory({transfers, transfersConnection: {totalCount: total}})

export const Empty = list([])

export const One = list([transfer(HEAD, 0)])

export const Many = list(rows(20, transfer), 48_213)

export const EdgeCases = list(transferCases())
