import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {token, WTMR} from '../../../../mock/fixtures/evm.js'
import {pageMeta} from '../../../.storybook/page'
import TokensPage from './page'
import {list} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Tokens/Tabs', ...pageMeta(TokensPage)}

const counts =
    (plain: string, pairs: string): StoryObj['play'] =>
    async ({canvas}) => {
        await expect(within(canvas.getByRole('navigation', {name: 'Tokens'})).getByRole('link', {name: new RegExp(`^Tokens\\s*${plain}$`)})).toBeVisible()
        await expect(within(canvas.getByRole('navigation', {name: 'Tokens'})).getByRole('link', {name: new RegExp(`^LP\\s*${pairs}$`)})).toBeVisible()
    }

// each tab counts its own kind, digits grouped
export const Counts: StoryObj = {...list([WTMR, ...Array.from({length: 19}, (_, n) => token(n))], 1_234_567, 42), play: counts('1,234,567', '42')}

// with no pair indexed the LP tab still shows, counting none
export const NoPairs: StoryObj = {...list([WTMR], 1, 0), play: counts('1', '0')}
