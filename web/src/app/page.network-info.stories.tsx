import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {expectFits} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {V2, home, many, mixedProtocols} from './page.stories.helpers'

const HALVING = 12_500_000

export default {title: 'Pages/Home/Network info', ...pageMeta(Home)}

const cell = (root: HTMLElement, label: string) => within(root).getByText(label, {selector: 'dt'}).nextElementSibling!

// the rail mixes both protocols and the newest block's names the chain's
export const NewestProtocol: StoryObj = {
    ...pageStory(mixedProtocols),
    play: async ({canvasElement}) => expect(cell(canvasElement, 'PoScan protocol')).toHaveTextContent(V2.id),
}

export const LongSession: StoryObj = {
    ...pageStory(home({...many, sessionLength: 14_400})),
    play: async ({canvasElement}) => expect(cell(canvasElement, 'Session length')).toHaveTextContent(/^14,400 blocks$/),
}

const expectHalving = (root: HTMLElement, reward: RegExp, next: RegExp) => {
    expect(cell(root, 'Block reward')).toHaveTextContent(reward)
    expect(cell(root, 'Next halving')).toHaveTextContent(next)
}

export const FirstEra: StoryObj = {
    ...pageStory(home(many)),
    play: async ({canvasElement}) => expectHalving(canvasElement, /^16 NUMN$/, /^·#12,500,000·in 3y 7mo$/),
}

export const HalvingNextBlock: StoryObj = {
    ...pageStory(home({head: HALVING - 1, days: []})),
    play: async ({canvasElement}) => expectHalving(canvasElement, /^16 NUMN$/, /^·#12,500,000·in 10s$/),
}

export const SecondEra: StoryObj = {
    ...pageStory(home({head: HALVING, days: []})),
    play: async ({canvasElement}) => expectHalving(canvasElement, /^8 NUMN$/, /^·#25,000,000·in 3y 11mo$/),
}

// the 64th halving shifts all of InitialReward out
export const RewardRunOut: StoryObj = {
    ...pageStory(home({head: 64 * HALVING, days: []})),
    play: async ({canvasElement}) => expectHalving(canvasElement, /^0 NUMN$/, /^—$/),
}

const infoCard = (root: HTMLElement) => within(root).getByRole('heading', {name: 'Network info'}).closest('section')!.querySelector('[data-slot=card]') as HTMLElement

export const ExternalContracts: StoryObj = {
    ...pageStory(home(many)),
    play: async ({canvasElement}) => {
        const card = infoCard(canvasElement)
        const expected = [
            ['Base NUMN', '0xC947c4c1AA52D1651CeE45d63C7f08aAa140aDF3', 'https://basescan.org/token/0xC947c4c1AA52D1651CeE45d63C7f08aAa140aDF3'],
            ['Base Uniswap v3', '0x5602e17D192CD9ec52B839C1f8A32f29f55Ee4b1', 'https://app.uniswap.org/explore/pools/base/0x5602e17D192CD9ec52B839C1f8A32f29f55Ee4b1'],
        ] as const
        for (const [label, address, href] of expected) {
            const row = within(card).getByText(label).parentElement!
            const link = within(row).getByRole('link')
            expect(link).toHaveAttribute('href', href)
            expect(link).toHaveAttribute('target', '_blank')
            expect(link.innerText.trim()).toBe(address)
            expect(within(row).getByRole('button', {name: 'copy'})).toBeVisible()
            expectFits(row)
        }
        expectFits(card)
    },
}

export const NoExternalContracts: StoryObj = {
    ...pageStory(home({...many, evmChainId: 320261})),
    play: async ({canvasElement}) => {
        const card = infoCard(canvasElement)
        expect(within(card).queryByText('Base NUMN')).toBeNull()
        expect(within(card).queryByText('Base Uniswap v3')).toBeNull()
        expect(within(card).getByText('Genesis hash')).toBeVisible()
    },
}
