import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {PEOPLE, acct, base, chainInfo, identity, paged, subOf} from '../../../../mock/fixtures.js'
import {all, expectFits, expectPagersFit, type Play} from '../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../.storybook/page'
import SearchPage from './page'

export default {title: 'Pages/Search', ...pageMeta(SearchPage)}

interface Token {
    id: string
    name: string | null
    symbol: string | null
}

const hits = (accounts: object[], tokens: Token[]) => ({
    accounts: paged(accounts),
    accountsConnection: {totalCount: accounts.length},
    tokens: paged(tokens),
    tokensConnection: {totalCount: tokens.length},
})

const results = (q: string, accounts: object[], tokens: Token[], searchParams = {}) => pageStory(hits(accounts, tokens), {searchParams: {q, ...searchParams}})

const tokenAt = (n: number, name: string | null, symbol: string | null): Token => ({id: '0x' + n.toString(16).padStart(40, '0'), name, symbol})

const WTMR: Token = {id: '0xa1795b3c6f74866c7def1df390f9e2e403dca2e9', name: 'Wrapped WTMR', symbol: 'wWTMR'}
const NOVA = tokenAt(0x0a7a, 'Nova Points', 'NOVA')
const POOL = {...tokenAt(0x5c4b, 'NumenDEX LP Token', 'NDEX-LP'), token0: chainInfo.nativeErc20, token1: WTMR.id, token0Symbol: 'NUMN', token1Symbol: 'wWTMR'}

const named = (n: number, display: string) => acct(100 + n, identity(display))

const accountRows = (root: Element) => [...root.querySelectorAll<HTMLElement>('a[href^="/account/"]')]
const tokenRows = (root: Element) => [...root.querySelectorAll<HTMLElement>('a[href^="/token/"]')]

const GUILDS = [PEOPLE[0], named(1, 'Guild of Scanners'), named(2, 'guildhall')]
const WTMRS = [WTMR, tokenAt(0x5c4a, 'WTMR Liquidity Share', 'WTMR-LP')]

// more of each kind than one page holds, and a different number of pages each
const SCANNERS = Array.from({length: 45}, (_, i) => named(10 + i, `Scanner ${String(i + 1).padStart(2, '0')}`))
const SCAN_TOKENS = Array.from({length: 65}, (_, i) => tokenAt(0x1000 + i, `Scan Token ${i + 1}`, `SCN${i + 1}`))

const opens = (tab: RegExp): StoryObj['play'] => async ({canvas}) => expect(canvas.getByRole('tab', {selected: true})).toHaveAccessibleName(tab)

// every link on the pager keeps the query and the tab it pages
const pagesTab = (tab: string, pages: number): Play => async ({canvas, canvasElement}) => {
    const links = [...canvasElement.querySelectorAll<HTMLAnchorElement>('[data-slot=pagination] a[href]')]
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) expect(Object.fromEntries(new URL(link.href).searchParams)).toMatchObject({q: 'scan', tab})
    expect(canvas.getByRole('link', {name: `last page, page ${pages}`})).toBeVisible()
}

export const NoQuery = pageStory({})

export const NothingFound = results('zzz', [], [])

export const AccountsOnly: StoryObj = {...results('guild', GUILDS, []), play: opens(/^Accounts/)}

// with no account to show the page opens on the tokens it found
export const TokensOnly: StoryObj = {...results('wtmr', [], WTMRS), play: opens(/^Tokens/)}

export const AccountAndToken: StoryObj = {...results('nova', [PEOPLE[5]], [NOVA]), play: opens(/^Accounts/)}

export const AccountAndTokenOnTokens = results('nova', [PEOPLE[5]], [NOVA], {tab: 'tokens'})

export const AccountsEmpty: StoryObj = {...results('wtmr', [], WTMRS, {tab: 'accounts'}), play: async ({canvas}) => expect(canvas.getByText('None')).toBeVisible()}

export const TokensEmpty: StoryObj = {...results('guild', GUILDS, [], {tab: 'tokens'}), play: async ({canvas}) => expect(canvas.getByText('None')).toBeVisible()}

export const AccountsMany = results('scan', SCANNERS, SCAN_TOKENS)

export const AccountsPageTwo: StoryObj = {
    ...results('scan', SCANNERS, SCAN_TOKENS, {page: '2'}),
    play: all(pagesTab('accounts', 3), async ({canvasElement}) => {
        expectPagersFit(canvasElement)
        expectFits(...accountRows(canvasElement))
    }),
}

export const AccountsLastPage: StoryObj = {
    ...results('scan', SCANNERS, SCAN_TOKENS, {page: lastPage(SCANNERS.length)}),
    play: async ({canvasElement}) => expect(accountRows(canvasElement).map(r => r.getAttribute('href'))).toEqual(SCANNERS.slice(40).map(a => `/account/${ss58Encode(a.id, chainInfo.ss58)}`)),
}

export const TokensMany = results('scan', SCANNERS, SCAN_TOKENS, {tab: 'tokens'})

// a share token that only calls itself LP shows no badge, a pair's shows the two tokens it pools
export const TokenPairs: StoryObj = {
    ...results('lp', [], [WTMRS[1], POOL]),
    play: async ({canvasElement}) => expect(tokenRows(canvasElement).map(row => row.querySelector('[data-slot=badge]')?.textContent ?? null)).toEqual([null, 'LP NUMN/wWTMR']),
}

export const TokensPageTwo: StoryObj = {...results('scan', SCANNERS, SCAN_TOKENS, {tab: 'tokens', page: '2'}), play: pagesTab('tokens', 4)}

export const TokensLastPage: StoryObj = {
    ...results('scan', SCANNERS, SCAN_TOKENS, {tab: 'tokens', page: lastPage(SCAN_TOKENS.length)}),
    play: async ({canvasElement}) => expect(tokenRows(canvasElement).map(r => r.getAttribute('href'))).toEqual(SCAN_TOKENS.slice(60).map(t => `/token/${t.id}`)),
}

// a query that matches one thing anywhere opens it
export const OneAccountRedirects = pageStory(hits([PEOPLE[5]], []), {searchParams: {q: 'nova fund'}, redirect: `/account/${ss58Encode(PEOPLE[5].id, chainInfo.ss58)}`})

export const OneTokenRedirects = pageStory(hits([], [NOVA]), {searchParams: {q: 'nova points'}, redirect: `/token/${NOVA.id}`})

const HASH = '0x' + 'ab'.repeat(32)
const lookups = (account: object | null) => ({blocks: ({where}: {where?: object}) => (where ? [] : base.blocks()), extrinsics: [], evmTransactions: [], accountById: account, ...hits([], [])})

// a 32 byte hex that is no block, extrinsic or transaction opens the account it names
export const HashOfAnAccountRedirects = pageStory(lookups({id: HASH}), {searchParams: {q: HASH}, redirect: `/account/${ss58Encode(HASH, chainInfo.ss58)}`})

export const HashNothingFound: StoryObj = {
    ...pageStory(lookups(null), {searchParams: {q: HASH}}),
    play: async ({canvas}) => {
        expect(canvas.getByText(/^Nothing found/)).toBeVisible()
        expectFits(canvas.getByRole('heading', {level: 1}))
    },
}

export const TokensWithMissingMetadata = results('token', [], [tokenAt(0xbeef, null, null), tokenAt(0xcafe, 'Token Without Symbol', null), tokenAt(0xf00d, null, 'NOSYM')])

// an account found by its username shows it, after the identity name when there is one
export const AccountsMatchedByUsername: StoryObj = {
    ...results(
        'satoshi',
        [
            acct(202, identity('Nakamoto Labs'), {username: 'satoshin.numen'}),
            named(3, 'Satoshi Fan Club'),
            acct(204, subOf(PEOPLE[0], 'vault'), {username: 'satoshivault.numen'}),
            acct(203, identity(null, {judgements: ['KnownGood']}), {username: 'satoshi.anon'}),
            acct(201, {username: 'satoshi.numen'}),
        ],
        []
    ),
    play: async ({canvasElement}) => {
        const rows = accountRows(canvasElement)
        expect(rows.map(r => [...r.children].slice(0, -1).map(c => c.textContent))).toEqual([
            ['Nakamoto Labs', 'satoshin.numen'],
            ['Satoshi Fan Club'],
            ['Polaris Guild/vault', 'satoshivault.numen'],
            ['satoshi.anon'],
            ['satoshi.numen'],
        ])
        expect(rows.map(r => r.querySelector('svg') != null)).toEqual([true, true, true, true, false])
    },
}

// a sub identity is found by the name its super gave it, and shows under the super's name
export const AccountsMatchedBySubName: StoryObj = {
    ...results('pay', [named(5, 'Payroll DAO'), acct(206, subOf(PEOPLE[1], 'payments')), PEOPLE[8]], []),
    play: async ({canvasElement}) =>
        expect(accountRows(canvasElement).map(r => r.firstElementChild!.textContent)).toEqual(['Payroll DAO', 'Orbit Labs/payments', 'Polaris Guild/payouts']),
}

const long = (searchParams = {}) =>
    results(
        'display',
        [{...PEOPLE[7], username: 'longestdisplayusernamehere.numen'}, named(4, 'thirtytwobytedisplaywithnospaces'), acct(205, {username: 'displaythirtytwobyteusername.nmn'})],
        [tokenAt(0x10, 'A token name long enough to push the address off the row on a phone', 'LONGSYMBOLTOKEN')],
        searchParams
    )

export const LongNames: StoryObj = {...long(), play: async ({canvasElement}) => expectFits(...accountRows(canvasElement))}

export const LongTokenName: StoryObj = {...long({tab: 'tokens'}), play: async ({canvasElement}) => expectFits(...tokenRows(canvasElement))}
