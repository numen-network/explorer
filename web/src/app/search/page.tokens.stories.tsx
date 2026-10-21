import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {PEOPLE, chainInfo} from '../../../../mock/fixtures.js'
import {expectFits} from '../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../.storybook/page'
import SearchPage from './page'
import {results, tokenAt, WTMR, NOVA, GUILDS, WTMRS, SCANNERS, SCAN_TOKENS, opens, pagesTab, long} from './page.stories.helpers'

export default {title: 'Pages/Search/Tokens', ...pageMeta(SearchPage)}

const POOL = {...tokenAt(0x5c4b, 'NumenDEX LP Token', 'NDEX-LP'), token0: chainInfo.nativeErc20, token1: WTMR.id, token0Symbol: 'NUMN', token1Symbol: 'wWTMR'}

const tokenRows = (root: Element) => [...root.querySelectorAll<HTMLElement>('a[href^="/token/"]')]

// with no account to show the page opens on the tokens it found
export const NoAccountHits: StoryObj = {...results('wtmr', [], WTMRS), play: opens(/^Tokens/)}

export const AccountAndToken = results('nova', [PEOPLE[5]], [NOVA], {tab: 'tokens'})

export const Empty: StoryObj = {...results('guild', GUILDS, [], {tab: 'tokens'}), play: async ({canvas}) => expect(canvas.getByText('None')).toBeVisible()}

export const Many = results('scan', SCANNERS, SCAN_TOKENS, {tab: 'tokens'})

// a share token that only calls itself LP shows no badge, a pair's shows the two tokens it pools
export const Pairs: StoryObj = {
    ...results('lp', [], [WTMRS[1], POOL]),
    play: async ({canvasElement}) => expect(tokenRows(canvasElement).map(row => row.querySelector('[data-variant]')?.textContent ?? null)).toEqual([null, 'LP NUMN/wWTMR']),
}

export const PageTwo: StoryObj = {...results('scan', SCANNERS, SCAN_TOKENS, {tab: 'tokens', page: '2'}), play: pagesTab('tokens', 4)}

export const LastPage: StoryObj = {
    ...results('scan', SCANNERS, SCAN_TOKENS, {tab: 'tokens', page: lastPage(SCAN_TOKENS.length)}),
    play: async ({canvasElement}) => expect(tokenRows(canvasElement).map(r => r.getAttribute('href'))).toEqual(SCAN_TOKENS.slice(60).map(t => `/token/${t.id}`)),
}

export const WithMissingMetadata = results('token', [], [tokenAt(0xbeef, null, null), tokenAt(0xcafe, 'Token Without Symbol', null), tokenAt(0xf00d, null, 'NOSYM')])

export const LongName: StoryObj = {...long({tab: 'tokens'}), play: async ({canvasElement}) => expectFits(...tokenRows(canvasElement))}
