import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {PEOPLE, acct, identity, paged} from '../../../../mock/fixtures.js'
import {type Play} from '../../../.storybook/fit'
import {pageStory} from '../../../.storybook/page'

interface Token {
    id: string
    name: string | null
    symbol: string | null
}

export const hits = (accounts: object[], tokens: Token[]) => ({
    accounts: paged(accounts),
    accountsConnection: {totalCount: accounts.length},
    tokens: paged(tokens),
    tokensConnection: {totalCount: tokens.length},
})

export const results = (q: string, accounts: object[], tokens: Token[], searchParams = {}) => pageStory(hits(accounts, tokens), {searchParams: {q, ...searchParams}})

export const tokenAt = (n: number, name: string | null, symbol: string | null): Token => ({id: '0x' + n.toString(16).padStart(40, '0'), name, symbol})

export const WTMR: Token = {id: '0xa1795b3c6f74866c7def1df390f9e2e403dca2e9', name: 'Wrapped WTMR', symbol: 'wWTMR'}
export const NOVA = tokenAt(0x0a7a, 'Nova Points', 'NOVA')

export const named = (n: number, display: string) => acct(100 + n, identity(display))

export const GUILDS = [PEOPLE[0], named(1, 'Guild of Scanners'), named(2, 'guildhall')]
export const WTMRS = [WTMR, tokenAt(0x5c4a, 'WTMR Liquidity Share', 'WTMR-LP')]

// more of each kind than one page holds, and a different number of pages each
export const SCANNERS = Array.from({length: 45}, (_, i) => named(10 + i, `Scanner ${String(i + 1).padStart(2, '0')}`))
export const SCAN_TOKENS = Array.from({length: 65}, (_, i) => tokenAt(0x1000 + i, `Scan Token ${i + 1}`, `SCN${i + 1}`))

export const opens = (tab: RegExp): StoryObj['play'] => async ({canvas}) => expect(canvas.getByRole('tab', {selected: true})).toHaveAccessibleName(tab)

// every link on the pager keeps the query and the tab it pages
export const pagesTab = (tab: string, pages: number): Play => async ({canvas, canvasElement}) => {
    const links = [...canvasElement.querySelectorAll<HTMLAnchorElement>('[data-slot=pagination] a[href]')]
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) expect(Object.fromEntries(new URL(link.href).searchParams)).toMatchObject({q: 'scan', tab})
    expect(canvas.getByRole('link', {name: `last page, page ${pages}`})).toBeVisible()
}

export const long = (searchParams = {}) =>
    results(
        'display',
        [{...PEOPLE[7], username: 'longestdisplayusernamehere.numen'}, named(4, 'thirtytwobytedisplaywithnospaces'), acct(205, {username: 'displaythirtytwobyteusername.nmn'})],
        [tokenAt(0x10, 'A token name long enough to push the address off the row on a phone', 'LONGSYMBOLTOKEN')],
        searchParams
    )
