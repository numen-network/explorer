// how far the index may trail the chain head before the explorer calls it behind
const BEHIND_BLOCKS = 10

export const isBehind = (heads: {best: number; indexed: number}) => heads.best - heads.indexed > BEHIND_BLOCKS
