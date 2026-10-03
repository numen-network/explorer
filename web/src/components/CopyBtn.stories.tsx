import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, spyOn, waitFor} from 'storybook/test'
import CopyBtn from './CopyBtn'

const HASH = '0x568b1433558b12a0588b1759578b15c65a8b1a7f598b18ec5c8b1da55b8b1c12'

const meta = {
    title: 'Components/CopyBtn',
    component: CopyBtn,
    args: {text: HASH},
    decorators: [
        Story => (
            <div className="font-mono text-sm break-all">
                {HASH}
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof CopyBtn>
export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const Copied: Story = {
    beforeEach: () => {
        const write = spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
        return () => write.mockRestore()
    },
    play: async ({args, canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'copy'}))
        await expect(navigator.clipboard.writeText).toHaveBeenCalledWith(args.text)
        await waitFor(() => expect(canvas.getByRole('button', {name: 'copy'}).querySelector('.lucide-check')).not.toBeNull())
    },
}
