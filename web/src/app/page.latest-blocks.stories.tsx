import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {all, type Play, drawnCanvases, drawnFaces, expectInContentBox, expectOneLine, expectShortHashes} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {PROTOCOL, V1, V2, expectBlockCardsFit, far, firstBlock, genesisOnly, home, many, mixedProtocols, railOf} from './page.stories.helpers'

export default {title: 'Pages/Home/Latest blocks', ...pageMeta(Home)}

const cardsIn = (root: HTMLElement) => [...railOf(root).querySelectorAll<HTMLElement>('[data-slot=card]')]

// each block card keeps its object clear of the padding and its protocol on one line
const railObjectsFit: Play = async ({canvasElement}) => {
    const rail = railOf(canvasElement)
    for (const object of await drawnCanvases(rail, 5)) expectInContentBox(object.closest('[data-slot=card]')!, object)
    expectOneLine(...within(rail).getAllByText(PROTOCOL))
}

// each block card shortens its own hash and its object's the same way
const railHashes: Play = async ({canvasElement}) => {
    const rail = railOf(canvasElement)
    expectShortHashes(...[...rail.querySelectorAll('[data-slot=badge]'), ...within(rail).getAllByText(/^OBJ /)].map(el => el.textContent!))
}

// phones scroll the cards sideways in one row, sm up lays them out in a grid
const railScrolls: Play = async ({canvasElement}) => {
    const cards = cardsIn(canvasElement)
    const strip = cards[0].parentElement!
    const phone = !matchMedia('(width >= 40rem)').matches
    await expect(new Set(cards.map(card => card.getBoundingClientRect().top)).size === 1 && strip.scrollWidth > strip.clientWidth).toBe(phone)
}

export const Empty: StoryObj = {
    ...pageStory(home(genesisOnly)),
    play: async ({canvasElement}) => expect(within(railOf(canvasElement)).getByText('No mined blocks yet.')).toBeVisible(),
}

export const One: StoryObj = {
    ...pageStory(home(firstBlock)),
    play: async ({canvasElement}) => expect(cardsIn(canvasElement).map(card => within(card).getByRole('link', {name: /^#/}).textContent)).toEqual(['#1']),
}

export const Many: StoryObj = {
    ...pageStory(home(many)),
    play: all(async ({canvasElement}) => expectBlockCardsFit(canvasElement), railObjectsFit, railHashes, railScrolls),
}

export const MixedProtocols: StoryObj = {
    ...pageStory(mixedProtocols),
    play: async ({canvasElement}) => expect(await drawnFaces(railOf(canvasElement), 5)).toEqual([V2, V2, V1, V1, V1].map(t => t.faceCount)),
}

// the widest figures a block card holds, nine digit heights and counts up to five digits
export const Extremes: StoryObj = {
    ...pageStory(home(far)),
    play: async ({canvas, canvasElement}) => {
        expectBlockCardsFit(canvasElement)
        for (const count of ['Extrinsics 1,234', 'Events 98,765']) await expect(canvas.getAllByText(count)).toHaveLength(5)
    },
}
