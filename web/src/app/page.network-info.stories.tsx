import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
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
    play: async ({canvasElement}) => expectHalving(canvasElement, /^16 NUMN$/, /^#12,500,000·in 3y 7mo$/),
}

export const HalvingNextBlock: StoryObj = {
    ...pageStory(home({head: HALVING - 1, days: []})),
    play: async ({canvasElement}) => expectHalving(canvasElement, /^16 NUMN$/, /^#12,500,000·in 10s$/),
}

export const SecondEra: StoryObj = {
    ...pageStory(home({head: HALVING, days: []})),
    play: async ({canvasElement}) => expectHalving(canvasElement, /^8 NUMN$/, /^#25,000,000·in 3y 11mo$/),
}

// the 64th halving shifts all of InitialReward out
export const RewardRunOut: StoryObj = {
    ...pageStory(home({head: 64 * HALVING, days: []})),
    play: async ({canvasElement}) => expectHalving(canvasElement, /^0 NUMN$/, /^—$/),
}
