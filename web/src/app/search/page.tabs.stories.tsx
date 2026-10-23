import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {PEOPLE} from '../../../../mock/fixtures.js'
import {pageMeta} from '../../../.storybook/page'
import SearchPage from './page'
import {results, NOVA, WTMRS} from './page.stories.helpers'

export default {title: 'Pages/Search/Tabs', ...pageMeta(SearchPage)}

const opens = (tab: RegExp): StoryObj['play'] => async ({canvas}) => expect(within(canvas.getByRole('navigation', {name: 'Search'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(tab)

// with hits on both tabs the page opens on the accounts it found
export const OpensOnAccounts: StoryObj = {...results('nova', [PEOPLE[5]], [NOVA]), play: opens(/^Accounts/)}

// with no account to show the page opens on the tokens it found
export const OpensOnTokens: StoryObj = {...results('wtmr', [], WTMRS), play: opens(/^Tokens/)}
