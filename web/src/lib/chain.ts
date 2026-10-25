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

export interface Heads {
    best: number
    finalized: number
    indexed: number
}

export interface DbHead {
    height: number
    timestamp: string | null
}

const chainInfo = cache(async (): Promise<{info: InfoRow; dbHead: DbHead}> => {
    const {chainInfos, dbHead} = await gql<{chainInfos: InfoRow[]; dbHead: DbHead[]}>(
        `query {
            chainInfos(limit: 1) { name symbol decimals ss58 blockTime existentialDeposit evmChainId nativeErc20 sessionLength sessionOffset voteLockingPeriod submissionDeposit treasuryAccount head finalizedHead }
            dbHead: blocks(orderBy: height_DESC, limit: 1) { height timestamp }
        }`
    )
    if (!chainInfos[0]) throw new Error('chain info row is missing, the indexer has not written it yet')
    if (!dbHead[0]) throw new Error('the block table is empty, the indexer has not written it yet')
    return {info: chainInfos[0], dbHead: dbHead[0]}
})

export async function chainProps(): Promise<ChainProps> {
    const {name, head, finalizedHead, ...props} = (await chainInfo()).info
    return {chain: name, ...props}
}

export async function chainHeads(): Promise<Heads> {
    const {info, dbHead} = await chainInfo()
    return {best: info.head, finalized: info.finalizedHead, indexed: dbHead.height}
}

export async function chainDbHead(): Promise<DbHead> {
    return (await chainInfo()).dbHead
}

// where a window of this many days opens, run back from the newest indexed
// block so a lagging indexer still spans real days. genesis has no timestamp
// to run back from, and a window with a null start matches no row
export const windowStart = (head: DbHead, days: number) => (head.timestamp == null ? null : new Date(Date.parse(head.timestamp) - days * 86400000).toISOString())
