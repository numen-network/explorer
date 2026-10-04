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

// every address a link shows reads in one whole form, the full address or its
// 7…4 split, and no box inside the link cuts it off
export function expectAddressForm(root: Element, form: 'full' | 'short') {
    const links = [...root.querySelectorAll<HTMLElement>('a[href^="/account/"], a[href^="/address/"]')].filter(a => /^(nu|0x)[\w…]+$/.test(a.innerText.trim()))
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
        expect(link.innerText.trim()).toMatch(form === 'full' ? /^\w{42,}$/ : /^\w{7}…\w{4}$/)
        expectFits(link, ...link.querySelectorAll('span'))
    }
}

// a full address in a table column too narrow for it breaks between its two halves and nowhere else
export function expectHalves(full: Element) {
    const lines = (node: Node) => {
        const range = document.createRange()
        range.selectNodeContents(node)
        return [...new Set([...range.getClientRects()].map(r => Math.round(r.top)))]
    }
    const [head, , tail] = full.childNodes
    const [top, bottom] = [lines(head), lines(tail)]
    expect(top).toHaveLength(1)
    expect(bottom).toHaveLength(1)
    expect(top[0]).toBeLessThan(bottom[0])
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
