import {balanceConstant, blocksConstant} from '@/lib/runtime'

export interface Halving {
    reward: bigint
    // null once the reward has halved down to nothing
    next: {height: number; blocksLeft: number} | null
}

// the reward pallet halves InitialReward once per elapsed HalvingInterval, truncating each time
export function halvingAt(height: number, specVersion: number): Halving {
    const initial = balanceConstant(specVersion, 'BlockReward.InitialReward')
    const interval = blocksConstant(specVersion, 'BlockReward.HalvingInterval')
    const halvings = Math.floor(height / interval)
    const reward = initial >> BigInt(halvings)
    const next = (halvings + 1) * interval
    return {reward, next: reward > 0n ? {height: next, blocksLeft: next - height} : null}
}
