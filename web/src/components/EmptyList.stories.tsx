import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import EmptyList from './EmptyList'
import {Card} from './ui/card'

const meta = {
    title: 'Components/EmptyList',
    component: EmptyList,
    args: {what: 'transfers'},
    decorators: [
        Story => (
            <Card size="flush">
                <Story />
            </Card>
        ),
    ],
} satisfies Meta<typeof EmptyList>
export default meta
type Story = StoryObj<typeof meta>

export const NoneYet: Story = {
    play: async ({canvas}) => expect(canvas.getByText('No transfers yet.')).toBeInTheDocument(),
}

export const NoneMatching: Story = {
    args: {filtered: true},
    play: async ({canvas}) => expect(canvas.getByText('No matching transfers.')).toBeInTheDocument(),
}
