import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {spend} from '../../../mock/fixtures/governance.js'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {home, many} from './page.stories.helpers'

export default {title: 'Pages/Home/Tabs', ...pageMeta(Home)}

const scene = home({...many, spends: [spend(0, 'Paid'), spend(1, 'Awarded')]})
const strip = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Governance'}))
const viewAll = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Governance'}).parentElement!).getByRole('link', {name: /View all/})

// Referenda opens first, each tab counting every row the index holds
export const Counts: StoryObj = {
    ...pageStory(scene),
    play: async ({canvasElement}) => {
        const tabs = strip(canvasElement)
        expect(tabs.getAllByRole('link').map(a => a.textContent)).toEqual(['Referenda5', 'Spends2'])
        expect(tabs.getByRole('link', {name: /^Referenda/})).toHaveAttribute('aria-current', 'page')
        expect(tabs.getByRole('link', {name: /^Spends/})).toHaveAttribute('href', '/?tab=spends')
        expect(viewAll(canvasElement)).toHaveAttribute('href', '/governance')
    },
}

export const SpendsOpen: StoryObj = {
    ...pageStory(scene, {searchParams: {tab: 'spends'}}),
    play: async ({canvasElement}) => {
        const tabs = strip(canvasElement)
        expect(tabs.getByRole('link', {name: /^Spends/})).toHaveAttribute('aria-current', 'page')
        expect(tabs.getByRole('link', {name: /^Referenda/})).toHaveAttribute('href', '/')
        expect(viewAll(canvasElement)).toHaveAttribute('href', '/governance?tab=treasury')
    },
}
