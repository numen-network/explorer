import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import NotFound from './not-found'

const meta = {title: 'Pages/Not Found/Message', component: NotFound} satisfies Meta<typeof NotFound>
export default meta
type Story = StoryObj<typeof meta>

export const BackHomeLink: Story = {play: async ({canvas}) => expect(canvas.getByRole('link', {name: 'Back home'})).toHaveAttribute('href', '/')}
