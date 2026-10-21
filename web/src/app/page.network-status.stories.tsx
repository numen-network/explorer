import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {DAILY, chainDays} from '../../../mock/fixtures/home.js'
import {expectFits} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {far, genesisOnly, home, minedUpTo, many} from './page.stories.helpers'

export default {title: 'Pages/Home/Network status', ...pageMeta(Home)}

const card = (root: HTMLElement) => within(root).getByRole('heading', {name: 'Network status'}).closest<HTMLElement>('[data-slot=card]')!
const row = (root: HTMLElement, label: string) => within(card(root)).getByText(label, {selector: 'dt'}).nextElementSibling!

// only genesis is indexed, with no timestamp and no validator row
export const GenesisOnly: StoryObj = {
    ...pageStory(home(genesisOnly)),
    play: async ({canvasElement}) => {
        await expect(row(canvasElement, 'Latest block')).toHaveTextContent(/^0$/)
        await expect(row(canvasElement, 'Avg block time')).toHaveTextContent(/^—$/)
        await expect(row(canvasElement, 'Session')).toHaveTextContent(/^—$/)
    },
}

// mainnet rebuilding from genesis, indexed to #30,979 while the chain stood at
// #220,176, the catch up names both and every other figure counts from #30,979
export const Indexing: StoryObj = {
    ...pageStory(home({head: 30_979, best: 220_176, finalized: 220_174, days: chainDays(30_979), objects: minedUpTo(30_979, 5, 220_174)})),
    play: async ({canvasElement}) => {
        const status = within(card(canvasElement))
        await expect(status.getByText('Indexing')).toBeVisible()
        await expect(status.getByText('Catching up').nextElementSibling).toHaveTextContent(/^30,979 \/ 220,176$/)
        await expect(row(canvasElement, 'Latest block')).toHaveTextContent(/^30,979$/)
        await expect(row(canvasElement, 'Latest block').querySelector('a')).toHaveAttribute('href', '/block/30979')
        await expect(row(canvasElement, 'Finalized')).toHaveTextContent(/^30,979$/)
        await expect(row(canvasElement, 'Session')).toHaveTextContent(/^#516$/)
        await expect(status.getByText('Block 20 / 60')).toBeVisible()
    },
}

// the day's thousand and one blocks came 9.96s apart, which reads cut at the tenth
const pacedDays = [...DAILY.slice(0, -1), {...DAILY.at(-1)!, blocks: 1_001, tsLast: new Date(Date.parse(DAILY.at(-1)!.tsFirst) + 9_960_000).toISOString()}]

export const BlockTimeTruncated: StoryObj = {
    ...pageStory(home({...many, days: pacedDays})),
    play: async ({canvasElement}) => expect(row(canvasElement, 'Avg block time')).toHaveTextContent(/^9\.9s$/),
}

// the widest figures the card takes, a nine digit head, a thousand validators and a session of 14,400 blocks
export const Extremes: StoryObj = {
    ...pageStory(home(far)),
    play: async ({canvasElement}) => {
        expectFits(card(canvasElement), ...card(canvasElement).querySelectorAll('dl > div'))
        await expect(row(canvasElement, 'Latest block')).toHaveTextContent(/^987,654,321$/)
        await expect(row(canvasElement, 'Validators')).toHaveTextContent(/^1,000$/)
        await expect(within(card(canvasElement)).getByText('Block 1,522 / 14,400')).toBeVisible()
    },
}
