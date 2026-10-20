const sat = (v: bigint) => (v > 0n ? v : 0n)
const bigMax = (a: bigint, b: bigint) => (a > b ? a : b)

// polkadot.js formula. frozen is a floor on the total rather than a bucket of
// its own, so reserved counts towards it, and an account that reserves or
// freezes anything has a reference keeping it alive and must retain the ED
export function transferableOf(free: bigint, reserved: bigint, frozen: bigint, existentialDeposit: bigint): bigint {
    const ed = frozen === 0n && reserved === 0n ? 0n : existentialDeposit
    return sat(free - bigMax(ed, frozen - reserved))
}
