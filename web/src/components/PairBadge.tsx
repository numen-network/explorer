import {cn} from 'cn'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import {shortHash} from '@/lib/format'
import type {TokenPair} from '@/lib/gql'

const RECEIPT_TIP = 'This is a receipt token, which is minted when the user adds liquidity'

// a pair's share token names the two tokens it pools, any other token shows nothing
export default function PairBadge({token, className}: {token: TokenPair; className?: string}) {
    if (token.token0 == null || token.token1 == null) return null
    return (
        <Tip text={RECEIPT_TIP}>
            <Badge variant="idle" className={cn('font-normal', className)}>
                LP {token.token0Symbol ?? shortHash(token.token0)}/{token.token1Symbol ?? shortHash(token.token1)}
            </Badge>
        </Tip>
    )
}
