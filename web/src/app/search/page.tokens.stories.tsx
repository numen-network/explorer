import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {PEOPLE, chainInfo} from '../../../../mock/fixtures.js'
import {all, expectFits} from '../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../.storybook/page'
import SearchPage from './page'
import {results, tokenAt, WTMR, NOVA, named, WTMRS, SCANNERS, SCAN_TOKENS, pagesTab, long} from './page.stories.helpers'

export default {title: 'Pages/Search/Tokens', ...pageMeta(SearchPage)}

const POOL = {...tokenAt(0x5c4b, 'NumenDEX LP Token', 'NDEX-LP'), token0: chainInfo.nativeErc20, token1: WTMR.id, token0Symbol: 'NUMN', token1Symbol: 'wWTMR'}

const tokenRows = (root: Element) => [...root.querySelectorAll<HTMLElement>('a[href^="/token/"]')]

const hrefs = (tokens: {id: string}[]) => tokens.map(t => `/token/${t.id}`)

export const One: StoryObj = {
    ...results('nova', [PEOPLE[5]], [NOVA], {tab: 'tokens'}),
    play: async ({canvasElement}) => expect(tokenRows(canvasElement).map(r => r.getAttribute('href'))).toEqual(hrefs([NOVA])),
}

const GUILDS = [PEOPLE[0], named(1, 'Guild of Scanners'), named(2, 'guildhall')]

export const Empty: StoryObj = {...results('guild', GUILDS, [], {tab: 'tokens'}), play: async ({canvas}) => expect(canvas.getByText('None')).toBeVisible()}

export const Many = results('scan', SCANNERS, SCAN_TOKENS, {tab: 'tokens'})

// a share token that only calls itself LP shows no badge, a pair's shows the two tokens it pools
export const Pairs: StoryObj = {
    ...results('lp', [], [WTMRS[1], POOL]),
    play: async ({canvasElement}) => expect(tokenRows(canvasElement).map(row => row.querySelector('[data-variant]')?.textContent ?? null)).toEqual([null, 'LP NUMN/wWTMR']),
}

export const PageTwo: StoryObj = {
    ...results('scan', SCANNERS, SCAN_TOKENS, {tab: 'tokens', page: '2'}),
    play: all(pagesTab('tokens', 4), async ({canvasElement}) => expect(tokenRows(canvasElement).map(r => r.getAttribute('href'))).toEqual(hrefs(SCAN_TOKENS.slice(20, 40)))),
}

export const LastPage: StoryObj = {
    ...results('scan', SCANNERS, SCAN_TOKENS, {tab: 'tokens', page: lastPage(SCAN_TOKENS.length)}),
    play: async ({canvasElement}) => expect(tokenRows(canvasElement).map(r => r.getAttribute('href'))).toEqual(hrefs(SCAN_TOKENS.slice(60))),
}

export const WithMissingMetadata = results('token', [], [tokenAt(0xbeef, null, null), tokenAt(0xcafe, 'Token Without Symbol', null), tokenAt(0xf00d, null, 'NOSYM')])

export const LongName: StoryObj = {...long({tab: 'tokens'}), play: async ({canvasElement}) => expectFits(...tokenRows(canvasElement))}
