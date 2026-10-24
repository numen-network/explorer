import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {expectTimesFit} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {expectActivityFit, far, firstBlock, genesisOnly, home, listCard, listRows, many} from './page.stories.helpers'

export default {title: 'Pages/Home/Transfers', ...pageMeta(Home)}

export const Empty: StoryObj = {
    ...pageStory(home(genesisOnly)),
    play: async ({canvasElement}) => expect(within(listCard(canvasElement, 'Activity')).getByText('No transfers yet.')).toBeVisible(),
}

export const One: StoryObj = {
    ...pageStory(home(firstBlock)),
    play: async ({canvasElement}) => expect(listRows(canvasElement, 'Activity').map(row => within(row).getByText(/ NUMN$/).textContent)).toEqual(['17 NUMN']),
}

export const Many: StoryObj = {
    ...pageStory(home(many)),
    play: async ({canvasElement}) => {
        expect(listRows(canvasElement, 'Activity')).toHaveLength(5)
        expectActivityFit(canvasElement)
        expectTimesFit(listCard(canvasElement, 'Activity'))
    },
}

// the largest amounts a row carries, between the accounts with the longest names
export const Extremes: StoryObj = {...pageStory(home(far)), play: async ({canvasElement}) => expectActivityFit(canvasElement)}
