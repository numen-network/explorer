import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'

export const PHONE = {viewport: {value: 'mobile1', isRotated: false}}
export const DESKTOP = {viewport: {value: 'desktop', isRotated: false}}

// content that runs past a box widens its scroll width, even when the box clips it
export function expectFits(...boxes: Element[]) {
    expect(boxes.length).toBeGreaterThan(0)
    for (const box of boxes) expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
}

export const cardsFit: StoryObj['play'] = async ({canvasElement}) => expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))

// a middle dot shares its line with the item after it, so no line ends on one
export function expectNoHangingDots(root: Element) {
    const mid = (el: Element) => {
        const r = el.getBoundingClientRect()
        return r.top + r.height / 2
    }
    const dots = [...root.querySelectorAll('span')].filter(el => el.textContent === '·')
    expect(dots.length).toBeGreaterThan(0)
    for (const dot of dots) {
        const next = dot.nextElementSibling
        expect(next).not.toBeNull()
        expect(Math.abs(mid(dot) - mid(next!))).toBeLessThan(2)
    }
}

// a word broken across two lines leaves a rect on each of them
export function expectWholeWords(...boxes: Element[]) {
    expect(boxes.length).toBeGreaterThan(0)
    for (const box of boxes) {
        const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT)
        for (let node = walk.nextNode(); node; node = walk.nextNode()) {
            for (const {0: word, index} of node.textContent!.matchAll(/\S+/g)) {
                const range = document.createRange()
                range.setStart(node, index)
                range.setEnd(node, index + word.length)
                const lines = new Set([...range.getClientRects()].map(r => Math.round(r.top))).size
                expect({word, lines}).toEqual({word, lines: 1})
            }
        }
    }
}
