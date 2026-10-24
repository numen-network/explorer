import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {spend} from '../../../mock/fixtures/governance.js'
import {fmtInt} from '@/lib/format'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {home, many} from './page.stories.helpers'

export default {title: 'Pages/Home/Tabs', ...pageMeta(Home)}

const scene = home({...many, spends: [spend(0, 'Paid'), spend(1, 'Awarded')], windows: {...many.windows, evm: [3_629, 71, 1_448]}})
const strip = (root: HTMLElement, name = 'Governance') => within(within(root).getByRole('navigation', {name}))
const viewAll = (root: HTMLElement, name = 'Governance') => within(within(root).getByRole('navigation', {name}).parentElement!).getByRole('link', {name: /View all/})

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

// Transfers opens first, each tab counting every row the index holds
export const ActivityCounts: StoryObj = {
    ...pageStory(scene),
    play: async ({canvasElement}) => {
        const tabs = strip(canvasElement, 'Activity')
        expect(tabs.getAllByRole('link').map(a => a.textContent)).toEqual([`Transfers${fmtInt(many.days.at(-1)!.cumTransfers)}`, 'EVM txs3,629'])
        expect(tabs.getByRole('link', {name: /^Transfers/})).toHaveAttribute('aria-current', 'page')
        expect(tabs.getByRole('link', {name: /^EVM txs/})).toHaveAttribute('href', '/?activity=evm')
        expect(viewAll(canvasElement, 'Activity')).toHaveAttribute('href', '/transfers')
    },
}

export const EvmOpen: StoryObj = {
    ...pageStory(scene, {searchParams: {activity: 'evm'}}),
    play: async ({canvasElement}) => {
        const tabs = strip(canvasElement, 'Activity')
        expect(tabs.getByRole('link', {name: /^EVM txs/})).toHaveAttribute('aria-current', 'page')
        expect(tabs.getByRole('link', {name: /^Transfers/})).toHaveAttribute('href', '/')
        expect(viewAll(canvasElement, 'Activity')).toHaveAttribute('href', '/extrinsics?pallet=Ethereum&method=transact')
    },
}

// switching one strip keeps the tab the other strip has open
export const BothOpen: StoryObj = {
    ...pageStory(scene, {searchParams: {tab: 'spends', activity: 'evm'}}),
    play: async ({canvasElement}) => {
        expect(strip(canvasElement).getByRole('link', {name: /^Referenda/})).toHaveAttribute('href', '/?activity=evm')
        expect(strip(canvasElement, 'Activity').getByRole('link', {name: /^Transfers/})).toHaveAttribute('href', '/?tab=spends')
    },
}
