import type {ChainProps} from '@/lib/chain'
import VoteRecord from './VoteRecord'
import VotingTile, {type Voting} from './VotingTile'

export default async function VotingHead({hex, chain, voting}: {hex: string; chain: ChainProps; voting: Voting}) {
    return (
        <>
            <VotingTile hex={hex} chain={chain} voting={voting} />
            <VoteRecord hex={hex} chain={chain} />
        </>
    )
}
