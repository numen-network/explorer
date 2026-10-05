export interface Deposit {
    who: string
    amount: bigint
}

/**
 * A paying extrinsic settles its fee last. The payer first gets back what it
 * was charged over the fee and the tip, then the fee splits between the miner
 * and the treasury and the tip goes to the miner. The shares are therefore the
 * first two of the three deposits that close the extrinsic, whoever the payer
 * is and whatever its call deposited before them.
 */
export function feeShares(extrinsicId: string, tip: bigint, deposits: Deposit[], author: string | undefined, treasury: string): {miner: bigint; treasury: bigint} {
    const [miner, pot, tipped] = deposits.slice(-3)
    if (deposits.length < 3 || miner.who !== author || pot.who !== treasury || tipped.who !== author || tipped.amount !== tip) {
        throw new Error(`extrinsic ${extrinsicId} does not close with the miner share, the treasury share and its tip of ${tip}`)
    }
    return {miner: miner.amount, treasury: pot.amount}
}
