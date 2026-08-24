import {gql} from './gql'

export interface ChainProps {
    chain: string
    symbol: string
    decimals: number
    ss58: number
    blockTime: number
    existentialDeposit: string
    evmChainId: number
    sessionLength: number
    sessionOffset: number
}

interface InfoRow {
    name: string
    symbol: string
    decimals: number
    ss58: number
    blockTime: number
    existentialDeposit: string
    evmChainId: number
    sessionLength: number
    sessionOffset: number
    head: number
    finalizedHead: number
}

async function chainInfo(): Promise<InfoRow> {
    const {chainInfos} = await gql<{chainInfos: InfoRow[]}>(
        `query { chainInfos(limit: 1) { name symbol decimals ss58 blockTime existentialDeposit evmChainId sessionLength sessionOffset head finalizedHead } }`
    )
    if (!chainInfos[0]) throw new Error('chain info row is missing, the indexer has not written it yet')
    return chainInfos[0]
}

let cached: ChainProps | undefined

export async function chainProps(): Promise<ChainProps> {
    if (cached) return cached
    const row = await chainInfo()
    cached = {
        chain: row.name,
        symbol: row.symbol,
        decimals: row.decimals,
        ss58: row.ss58,
        blockTime: row.blockTime,
        existentialDeposit: row.existentialDeposit,
        evmChainId: row.evmChainId,
        sessionLength: row.sessionLength,
        sessionOffset: row.sessionOffset,
    }
    return cached
}

export async function chainHeads(): Promise<{best: number; finalized: number}> {
    const row = await chainInfo()
    return {best: row.head, finalized: row.finalizedHead}
}
