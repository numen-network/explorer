export interface WellKnown {
    emoji: string
    label: string
}

// a sovereign account has no key to register an identity with, so the name it
// goes by is the explorer's to give
export const TREASURY: WellKnown = {emoji: '\u{1F3DB}\u{FE0F}', label: 'Treasury'}
