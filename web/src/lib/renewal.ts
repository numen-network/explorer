import type {ChainProps, DbHead} from '@/lib/chain'
import {fmtSpan} from '@/lib/format'
import {blocksConstant} from '@/lib/runtime'

// how often on_initialize pushes an Active lock's expiry out again
export const renewEvery = (head: DbHead, chain: ChainProps) => fmtSpan(blocksConstant(head.specVersion, 'Validator.RenewInterval') * chain.blockTime)
