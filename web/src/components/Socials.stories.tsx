import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {identity} from '../../../mock/fixtures.js'
import Socials from './Socials'

const meta = {title: 'Components/Socials', component: Socials, args: {json: null}} satisfies Meta<typeof Socials>
export default meta
type Story = StoryObj<typeof meta>

// each mark as the name it reads out and the width it draws at
const marks = (root: Element) => [...root.querySelectorAll('[aria-label]:has(> svg)')].map(mark => [mark.getAttribute('aria-label'), mark.querySelector('svg')!.getBoundingClientRect().width])

const EVERY_CHANNEL = {judgements: ['Reasonable'], web: 'polaris.example', email: 'ops@polaris.example', github: 'polaris-guild', matrix: '@polaris:matrix.org', x: '@polaris_guild', telegram: '@polarisguild', discord: 'polarisguild'}

// the X mark runs corner to corner, so it draws a size down to weigh what the others do
export const EveryChannel: Story = {
    args: {json: identity('Polaris Guild', EVERY_CHANNEL).identityJson},
    play: async ({canvasElement}) =>
        expect(marks(canvasElement)).toEqual([
            ['Web', 18],
            ['Email', 18],
            ['GitHub', 18],
            ['Matrix', 18],
            ['X', 16],
            ['Telegram', 18],
            ['Discord', 18],
        ]),
}

const UNLINKABLE = {judgements: ['Reasonable'], web: 'javascript:alert(1)', email: 'not an email'}

// a web address that is no http link and an email that is no address keep their marks but link nowhere
export const Unlinkable: Story = {
    args: {json: identity('Unlinkable channels', UNLINKABLE).identityJson},
    play: async ({canvasElement}) => {
        expect(marks(canvasElement).map(([label]) => label)).toEqual(['Web', 'Email'])
        expect(canvasElement.querySelectorAll('a')).toHaveLength(0)
    },
}
