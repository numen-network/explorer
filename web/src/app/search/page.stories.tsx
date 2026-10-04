import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {PEOPLE, acct, identity, subOf} from '../../../../mock/fixtures.js'
import {expectFits, PHONE} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import SearchPage from './page'

export default {title: 'Pages/Search', ...pageMeta(SearchPage)}

interface Token {
    id: string
    name: string | null
    symbol: string | null
}

const results = (q: string, accounts: object[], tokens: Token[]) => pageStory({accounts, tokens}, {searchParams: {q}})

const tokenAt = (n: number, name: string | null, symbol: string | null): Token => ({id: '0x' + n.toString(16).padStart(40, '0'), name, symbol})

const WTMR: Token = {id: '0xa1795b3c6f74866c7def1df390f9e2e403dca2e9', name: 'Wrapped WTMR', symbol: 'wWTMR'}

const named = (n: number, display: string) => acct(100 + n, identity(display))

const accountRows = (root: Element) => [...root.querySelectorAll<HTMLElement>('a[href^="/account/"]')]

export const NoQuery = pageStory({})

export const NothingFound = results('zzz', [], [])

export const AccountsOnly = results('guild', [PEOPLE[0], named(1, 'Guild of Scanners'), named(2, 'guildhall')], [])

export const TokensOnly = results('wtmr', [], [WTMR, tokenAt(0x5c4a, 'WTMR Liquidity Share', 'WTMR-LP')])

export const AccountAndToken = results('nova', [PEOPLE[5]], [tokenAt(0x0a7a, 'Nova Points', 'NOVA')])

export const TokensWithMissingMetadata = results('token', [], [tokenAt(0xbeef, null, null), tokenAt(0xcafe, 'Token Without Symbol', null), tokenAt(0xf00d, null, 'NOSYM')])

// an account found by its username shows it, after the identity name when there is one
export const AccountsMatchedByUsername: StoryObj = {
    ...results(
        'satoshi',
        [
            acct(202, identity('Nakamoto Labs'), {username: 'satoshin.numen'}),
            named(3, 'Satoshi Fan Club'),
            acct(201, {username: 'satoshi.numen'}),
            acct(204, subOf(PEOPLE[0], 'vault'), {username: 'satoshivault.numen'}),
        ],
        []
    ),
    play: async ({canvasElement}) => {
        const rows = accountRows(canvasElement)
        expect(rows.map(r => [...r.children].slice(0, -1).map(c => c.textContent))).toEqual([
            ['Nakamoto Labs', 'satoshin.numen'],
            ['Satoshi Fan Club'],
            ['satoshi.numen'],
            ['Polaris Guild/vault', 'satoshivault.numen'],
        ])
        expect(rows.map(r => r.querySelector('svg') != null)).toEqual([true, true, false, true])
    },
}

export const LongNames = results(
    'display',
    [{...PEOPLE[7], username: 'longestdisplayusernamehere.numen'}, named(4, 'thirtytwobytedisplaywithnospaces'), acct(205, {username: 'displaythirtytwobyteusername.nmn'})],
    [tokenAt(0x10, 'A token name long enough to push the address off the row on a phone', 'LONGSYMBOLTOKEN')]
)

export const LongNamesOnPhone: StoryObj = {...LongNames, globals: PHONE, play: async ({canvasElement}) => expectFits(...accountRows(canvasElement))}

export const ManyResults = results(
    'a',
    Array.from({length: 20}, (_, i) => named(10 + i, `Account ${String.fromCharCode(65 + i)} of the many`)),
    Array.from({length: 20}, (_, i) => tokenAt(0x1000 + i, `Asset ${String.fromCharCode(65 + i)}`, `A${String.fromCharCode(65 + i)}`))
)
