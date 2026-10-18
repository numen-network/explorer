import {createLoader, createSerializer, parseAsString, parseAsStringLiteral} from 'nuqs/server'

export const ACTION_KINDS = ['vote', 'remove', 'delegate', 'undelegate'] as const
export const ACTION_MOVES = ['approval-up', 'approval-down', 'support-up', 'support-down'] as const

export type ActionKind = (typeof ACTION_KINDS)[number]
export type ActionMove = (typeof ACTION_MOVES)[number]

// the text of a search box, read by the server the same way the box writes it
export const searchFilter = {q: parseAsString.withDefault('')}

export const loadSearch = createLoader(searchFilter)

// the filters of a referendum's action list as the url carries them, read by
// the server the same way the list writes them
export const actionFilters = {
    ...searchFilter,
    action: parseAsStringLiteral(ACTION_KINDS),
    impact: parseAsStringLiteral(ACTION_MOVES),
}

export const loadActionFilters = createLoader(actionFilters)

export const actionFiltersUrl = createSerializer(actionFilters)

export const DELEGATION_SORTS = ['conviction', 'capital', 'votes', 'since'] as const
export type DelegationSortBy = (typeof DELEGATION_SORTS)[number]
export interface DelegationSort {
    by: DelegationSortBy
    dir: 'asc' | 'desc'
}

// how the delegator list is sorted, capital biggest first unless the url says otherwise
export const delegationSortFilter = {
    sort: parseAsStringLiteral(DELEGATION_SORTS).withDefault('capital'),
    order: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('desc'),
}

export const loadDelegationSort = createLoader(delegationSortFilter)
