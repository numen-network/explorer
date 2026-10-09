import VoteStats from '@/components/VoteStats'
import type {ChainProps} from '@/lib/chain'
import {referendumBallots} from '@/lib/gql'

export async function statsPanel({index, chain}: {index: number; chain: ChainProps}) {
    const {votes, delegations} = await referendumBallots(index)
    return <VoteStats votes={votes} delegations={delegations} decimals={chain.decimals} symbol={chain.symbol} />
}
