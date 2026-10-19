/** What a proxy of each type may call, the way the runtime's ProxyType InstanceFilter lets it through. */
export interface ProxyScope {
    head: string
    calls: string[]
}

// mirrors InstanceFilter<RuntimeCall> for ProxyType in numen/runtime/src/configs/mod.rs,
// which no metadata carries, so a runtime that changes the filter changes this too
export const PROXY_SCOPE: Record<string, ProxyScope> = {
    Any: {head: 'Can call anything, transfers included', calls: []},
    NonTransfer: {head: 'Can call anything except', calls: ['Balances', 'EVM', 'Ethereum', 'Vesting.vested_transfer']},
    Governance: {head: 'Can only call', calls: ['Treasury', 'Bounties', 'ChildBounties', 'ConvictionVoting', 'Referenda', 'Utility']},
}
