import {cache} from 'react'
import {gql} from './gql'

export interface ChainProps {
    chain: string
    symbol: string
    decimals: number
    ss58: number
    blockTime: number
    existentialDeposit: string
    evmChainId: number
    nativeErc20: string
    sessionLength: number
    sessionOffset: number
    voteLockingPeriod: number
    submissionDeposit: string
    treasuryAccount: string
}

interface InfoRow extends Omit<ChainProps, 'chain'> {
    name: string
    head: number
    finalizedHead: number
}

const chainInfo = cache(async (): Promise<InfoRow> => {
    const {chainInfos} = await gql<{chainInfos: InfoRow[]}>(
        `query { chainInfos(limit: 1) { name symbol decimals ss58 blockTime existentialDeposit evmChainId nativeErc20 sessionLength sessionOffset voteLockingPeriod submissionDeposit treasuryAccount head finalizedHead } }`
    )
    if (!chainInfos[0]) throw new Error('chain info row is missing, the indexer has not written it yet')
    return chainInfos[0]
})

export async function chainProps(): Promise<ChainProps> {
    const {name, head, finalizedHead, ...props} = await chainInfo()
    return {chain: name, ...props}
}

export async function chainHeads(): Promise<{best: number; finalized: number}> {
    const row = await chainInfo()
    return {best: row.head, finalized: row.finalizedHead}
}
