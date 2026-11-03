import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {PEOPLE} from '../../../../mock/fixtures.js'
import {pageMeta} from '../../../.storybook/page'
import SearchPage from './page'
import {results, NOVA, SCANNERS, SCAN_TOKENS, WTMRS} from './page.stories.helpers'

export default {title: 'Pages/Search/Tabs', ...pageMeta(SearchPage)}

const nav = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Search'}))

// each tab counts every hit of its kind
export const EveryTab: StoryObj = {
    ...results('scan', SCANNERS, SCAN_TOKENS),
    play: async ({canvasElement}) =>
        expect(nav(canvasElement).getAllByRole('link').map(a => [new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab'), a.querySelector('[data-slot=badge]')!.textContent])).toEqual([
            ['accounts', '45'],
            ['tokens', '65'],
        ]),
}

const opens = (tab: RegExp): StoryObj['play'] => async ({canvasElement}) => expect(nav(canvasElement).getByRole('link', {current: 'page'})).toHaveAccessibleName(tab)

// with hits on both tabs the page opens on the accounts it found
export const OpensOnAccounts: StoryObj = {...results('nova', [PEOPLE[5]], [NOVA]), play: opens(/^Accounts/)}

// with no account to show the page opens on the tokens it found
export const OpensOnTokens: StoryObj = {...results('wtmr', [], WTMRS), play: opens(/^Tokens/)}
