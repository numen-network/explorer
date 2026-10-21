import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {PEOPLE, acct, chainInfo, identity, subOf} from '../../../../mock/fixtures.js'
import {all, expectFits, expectPagersFit} from '../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../.storybook/page'
import SearchPage from './page'
import {results, NOVA, named, GUILDS, WTMRS, SCANNERS, SCAN_TOKENS, opens, pagesTab, long} from './page.stories.helpers'

export default {title: 'Pages/Search/Accounts', ...pageMeta(SearchPage)}

const accountRows = (root: Element) => [...root.querySelectorAll<HTMLElement>('a[href^="/account/"]')]

export const NoTokenHits: StoryObj = {...results('guild', GUILDS, []), play: opens(/^Accounts/)}

export const AccountAndToken: StoryObj = {...results('nova', [PEOPLE[5]], [NOVA]), play: opens(/^Accounts/)}

export const Empty: StoryObj = {...results('wtmr', [], WTMRS, {tab: 'accounts'}), play: async ({canvas}) => expect(canvas.getByText('None')).toBeVisible()}

export const Many = results('scan', SCANNERS, SCAN_TOKENS)

export const PageTwo: StoryObj = {
    ...results('scan', SCANNERS, SCAN_TOKENS, {page: '2'}),
    play: all(pagesTab('accounts', 3), async ({canvasElement}) => {
        expectPagersFit(canvasElement)
        expectFits(...accountRows(canvasElement))
    }),
}

export const LastPage: StoryObj = {
    ...results('scan', SCANNERS, SCAN_TOKENS, {page: lastPage(SCANNERS.length)}),
    play: async ({canvasElement}) => expect(accountRows(canvasElement).map(r => r.getAttribute('href'))).toEqual(SCANNERS.slice(40).map(a => `/account/${ss58Encode(a.id, chainInfo.ss58)}`)),
}

// an account found by its username shows it, after the identity name when there is one
export const MatchedByUsername: StoryObj = {
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
export const MatchedBySubName: StoryObj = {
    ...results('pay', [named(5, 'Payroll DAO'), acct(206, subOf(PEOPLE[1], 'payments')), PEOPLE[8]], []),
    play: async ({canvasElement}) =>
        expect(accountRows(canvasElement).map(r => r.firstElementChild!.textContent)).toEqual(['Payroll DAO', 'Orbit Labs/payments', 'Polaris Guild/payouts']),
}

export const LongNames: StoryObj = {...long(), play: async ({canvasElement}) => expectFits(...accountRows(canvasElement))}
