import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, waitFor} from 'storybook/test'
import {identity, PEOPLE} from '../../../mock/fixtures.js'
import {AVATAR_HOST, avatars} from '../../.storybook/avatar'
import AccountFace from './AccountFace'

const meta = {
    title: 'Components/AccountFace',
    component: AccountFace,
    parameters: {msw: [avatars]},
    args: {hex: PEOPLE[0].id, json: null, className: 'size-14'},
} satisfies Meta<typeof AccountFace>
export default meta
type Story = StoryObj<typeof meta>

const json = (avatar: string) => {
    const fields = {judgements: ['Reasonable'], avatar}
    return identity('Aurora Labs', fields).identityJson
}

const face = (root: HTMLElement) => root.querySelector('button > span:first-child > *') ?? root.querySelector('[aria-hidden]')
const kind = (el: Element | null) => (el?.tagName === 'IMG' ? 'avatar' : el?.querySelector('svg') ? 'identicon' : null)

// the avatar leads with the identicon in the badge, a click swaps them and a second swaps back
export const Avatar: Story = {
    args: {json: json(`${AVATAR_HOST}/aurora.png`)},
    play: async ({canvas, canvasElement}) => {
        const badge = () => kind(canvasElement.querySelector('button > span:last-child > *'))
        await waitFor(() => expect(canvasElement.querySelector<HTMLImageElement>('img')!.naturalWidth).toBeGreaterThan(0))
        expect([kind(face(canvasElement)), badge()]).toEqual(['avatar', 'identicon'])
        await userEvent.click(canvas.getByRole('button', {name: 'Show identicon'}))
        expect([kind(face(canvasElement)), badge()]).toEqual(['identicon', 'avatar'])
        await userEvent.click(canvas.getByRole('button', {name: 'Show avatar'}))
        expect([kind(face(canvasElement)), badge()]).toEqual(['avatar', 'identicon'])
    },
}

// one click turns every face on the page and stores the order
export const SharedOrder: Story = {
    args: {json: json(`${AVATAR_HOST}/aurora.png`)},
    render: args => (
        <div className="flex gap-4">
            <AccountFace {...args} />
            <AccountFace {...args} hex={PEOPLE[1].id} />
        </div>
    ),
    play: async ({canvas, canvasElement}) => {
        const faces = () => [...canvasElement.querySelectorAll('button > span:first-child > *')].map(kind)
        await waitFor(() => expect(faces()).toEqual(['avatar', 'avatar']))
        await userEvent.click(canvas.getAllByRole('button', {name: 'Show identicon'})[0])
        expect(faces()).toEqual(['identicon', 'identicon'])
        expect(JSON.parse(localStorage.getItem('faceOrder')!).state).toEqual({identicon: true})
    },
}

// a page opened after the swap starts on the identicon
export const StoredOrder: Story = {
    args: {json: json(`${AVATAR_HOST}/aurora.png`)},
    beforeEach: () => localStorage.setItem('faceOrder', JSON.stringify({state: {identicon: true}, version: 0})),
    play: async ({canvas, canvasElement}) => {
        await waitFor(() => expect(kind(face(canvasElement))).toBe('identicon'))
        expect(canvas.getByRole('button', {name: 'Show avatar'})).toBeInTheDocument()
    },
}

export const NoIdentity: Story = {
    play: async ({canvas, canvasElement}) => {
        expect(kind(face(canvasElement))).toBe('identicon')
        expect(canvas.queryByRole('button')).toBeNull()
    },
}

export const NoAvatar: Story = {
    args: {json: identity('Aurora Labs').identityJson},
    play: async ({canvas, canvasElement}) => {
        expect(kind(face(canvasElement))).toBe('identicon')
        expect(canvas.queryByRole('button')).toBeNull()
    },
}

export const DeadLink: Story = {
    args: {json: json(`${AVATAR_HOST}/missing.png`)},
    play: async ({canvas, canvasElement}) => {
        await waitFor(() => expect(canvas.queryByRole('button')).toBeNull())
        expect(kind(face(canvasElement))).toBe('identicon')
    },
}

export const PlainHttp: Story = {
    args: {json: json('http://avatar.example/plain.png')},
    play: async ({canvas, canvasElement}) => {
        expect(kind(face(canvasElement))).toBe('identicon')
        expect(canvas.queryByRole('button')).toBeNull()
    },
}

export const Ipfs: Story = {
    args: {json: json('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')},
    play: async ({canvas, canvasElement}) => {
        expect(kind(face(canvasElement))).toBe('identicon')
        expect(canvas.queryByRole('button')).toBeNull()
    },
}
