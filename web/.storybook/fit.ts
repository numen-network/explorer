import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'

export const PHONE = {viewport: {value: 'mobile1', isRotated: false}}

// content that runs past a box widens its scroll width, even when the box clips it
export function expectFits(...boxes: Element[]) {
    expect(boxes.length).toBeGreaterThan(0)
    for (const box of boxes) expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
}

export const cardsFit: StoryObj['play'] = async ({canvasElement}) => expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
