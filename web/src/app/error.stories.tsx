import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, fn} from 'storybook/test'
import ErrorPage from './error'

const meta = {
    title: 'Pages/Error',
    component: ErrorPage,
    args: {error: new Error('graphql http 502'), reset: fn()},
} satisfies Meta<typeof ErrorPage>
export default meta
type Story = StoryObj<typeof meta>

export const WithoutDigest: Story = {}

export const WithDigest: Story = {args: {error: Object.assign(new Error('graphql http 502'), {digest: '2718281828'})}}

export const RetryClicked: Story = {
    play: async ({args, canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'Retry'}))
        await expect(args.reset).toHaveBeenCalledOnce()
    },
}
