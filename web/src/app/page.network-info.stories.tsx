import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {V2, home, many, mixedProtocols} from './page.stories.helpers'

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
