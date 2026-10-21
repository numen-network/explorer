import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import data from '../../../../mock/data.js'
import {pageMeta, pageStory} from '../../../.storybook/page'
import GovernancePage from './page'

export default {title: 'Pages/Governance/Overview', ...pageMeta(GovernancePage)}

// each tile read as its label and its figure
const tiles = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=card-description]')].map(label => [label.textContent, label.nextElementSibling!.textContent])

// the referendum counts, and the treasury pot and active issuance of the newest daily stats
export const Totals: StoryObj = {
    ...pageStory(data),
    play: async ({canvasElement}) => {
        expect(tiles(canvasElement)).toEqual([
            ['Referenda', '12'],
            ['Ongoing', '5'],
            ['Treasury pot', '≈550M NUMN'],
            ['Active issuance', '≈52.51M NUMN'],
        ])
    },
}

// before the first daily stats there is no pot to read and no issuance to count
export const NoDailyStats: StoryObj = {
    ...pageStory({...data, dailyStats: []}),
    play: async ({canvasElement}) => {
        expect(tiles(canvasElement).slice(2)).toEqual([
            ['Treasury pot', '—'],
            ['Active issuance', '0 NUMN'],
        ])
    },
}
