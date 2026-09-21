export interface WellKnown {
    emoji: string
    label: string
}

// a sovereign account has no key to register an identity with, so the name it
// goes by is the explorer's to give
export const TREASURY: WellKnown = {emoji: '\u{1F3DB}\u{FE0F}', label: 'Treasury'}

export const PRIME: WellKnown = {emoji: '\u{1F511}', label: 'Prime'}

// an ERC20 carries no logo on chain, so the one it shows is the explorer's to
// give. keyed by EVM chain id since the same address can hold a different
// contract on another chain
export const TOKEN_ICONS: Record<number, Record<string, string>> = {}
