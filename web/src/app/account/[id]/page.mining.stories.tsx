import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {minedBlockRows, minedDays, minerWindow} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story} from './page.stories.helpers'

export default {title: 'Pages/Account/Mining', ...pageMeta(AccountPage), decorators: [wellKnown]}

// a figure on the mining tile, read off the label above it
const tileFigure = (root: HTMLElement, label: string) =>
    [...root.querySelectorAll('[data-slot=card-description]')].find(d => d.textContent.trim() === label)!.parentElement!.querySelector('[data-slot=card-title]')!.textContent

const ONE_BLOCK = [{...minedDays(1)[0], blocks: 1, rewards: numn(150)}]

export const OneBlock: StoryObj = {
    ...story({minerDays: ONE_BLOCK, minerWindow: minerWindow(ONE_BLOCK, [400, 20]), mined: minedBlockRows(1)}, {tab: 'mining'}),
    play: async ({canvasElement}) => {
        await expect(tileFigure(canvasElement, 'Blocks produced')).toBe('1')
        await expect(tileFigure(canvasElement, 'Cumulative rewards')).toBe('150 NUMN')
        await expect(tileFigure(canvasElement, '30-day ranking/share')).toBe('#3 / 0.23%')
        await expect(tileFigure(canvasElement, 'Latest block')).toBe(`#${minedBlockRows(1)[0].height.toLocaleString('en-US')}`)
    },
}

export const OneDay: StoryObj = {
    ...story({minerDays: minedDays(1), minerWindow: minerWindow(minedDays(1), [3_000]), mined: minedBlockRows(12)}, {tab: 'mining'}),
    play: async ({canvasElement}) => expect(tileFigure(canvasElement, '30-day ranking/share')).toBe('#2 / 0.39%'),
}

// fees of 0.0021 on every other day run the lifetime total past two decimals
export const Many: StoryObj = {
    ...story({minerDays: minedDays(60), minerWindow: minerWindow(minedDays(30), [900, 2_400, 40]), mined: minedBlockRows(20)}, {tab: 'mining'}),
    play: async ({canvasElement}) => {
        await expect(tileFigure(canvasElement, 'Cumulative rewards')).toMatch(/^≈/)
        await expect(tileFigure(canvasElement, '30-day ranking/share')).toMatch(/^#2 \/ /)
    },
}

// mined before the window opened, so the window has no rank for it
export const OutsideWindow: StoryObj = {
    ...story({minerDays: minedDays(60).slice(40), minerWindow: minerWindow([], [500]), mined: minedBlockRows(20)}, {tab: 'mining'}),
    play: async ({canvasElement}) => expect(tileFigure(canvasElement, '30-day ranking/share')).toBe('—'),
}

export const BeyondChart = story({minerDays: minedDays(60), mined: minedBlockRows(20), counts: {mined: 48_213}}, {tab: 'mining'})
