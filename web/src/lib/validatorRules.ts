import type {ChainProps, DbHead} from '@/lib/chain'
import {fmtSpan} from '@/lib/format'
import {blocksConstant} from '@/lib/runtime'

// the Validator pallet's constants as the indexed head's runtime declares them
export function validatorRules(head: DbHead, chain: ChainProps) {
    const value = (name: string) => blocksConstant(head.specVersion, `Validator.${name}`)
    const span = (name: string) => fmtSpan(value(name) * chain.blockTime, 'd')
    return {
        maxValidators: value('MaxValidators'),
        lockDuration: span('LockDuration'),
        renewEvery: span('RenewInterval'),
        offlineThreshold: value('OfflineThreshold'),
        rejoinCooldown: span('RejoinCooldownPeriod'),
    }
}

export type ValidatorRules = ReturnType<typeof validatorRules>
