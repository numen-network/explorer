import {createLoader, createSerializer, parseAsString, parseAsStringLiteral} from 'nuqs/server'

export const ACTION_KINDS = ['vote', 'remove', 'delegate', 'undelegate'] as const
export const ACTION_MOVES = ['approval-up', 'approval-down', 'support-up', 'support-down'] as const

export type ActionKind = (typeof ACTION_KINDS)[number]
export type ActionMove = (typeof ACTION_MOVES)[number]

// the filters of a referendum's action list as the url carries them, read by
// the server the same way the list writes them
export const actionFilters = {
    q: parseAsString.withDefault(''),
    action: parseAsStringLiteral(ACTION_KINDS),
    impact: parseAsStringLiteral(ACTION_MOVES),
}

export const loadActionFilters = createLoader(actionFilters)

export const actionFiltersUrl = createSerializer(actionFilters)
