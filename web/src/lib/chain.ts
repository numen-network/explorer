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
}

interface InfoRow extends Omit<ChainProps, 'chain'> {
    name: string
    head: number
    finalizedHead: number
}

async function chainInfo(): Promise<InfoRow> {
    const {chainInfos} = await gql<{chainInfos: InfoRow[]}>(
        `query { chainInfos(limit: 1) { name symbol decimals ss58 blockTime existentialDeposit evmChainId nativeErc20 sessionLength sessionOffset voteLockingPeriod submissionDeposit head finalizedHead } }`
    )
    if (!chainInfos[0]) throw new Error('chain info row is missing, the indexer has not written it yet')
    return chainInfos[0]
}

let cached: ChainProps | undefined

export async function chainProps(): Promise<ChainProps> {
    if (cached) return cached
    const {name, head, finalizedHead, ...props} = await chainInfo()
    return (cached = {chain: name, ...props})
}

export async function chainHeads(): Promise<{best: number; finalized: number}> {
    const row = await chainInfo()
    return {best: row.head, finalized: row.finalizedHead}
}
