import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, screen} from 'storybook/test'
import HelpTip from './HelpTip'

const meta = {title: 'Components/HelpTip'} satisfies Meta
export default meta

const TEXT = 'Active plus pending, capped by MaxValidators'

export const Hovered: StoryObj = {
    render: () => (
        <div className="pt-16 text-xs text-muted-foreground">
            Validators
            <HelpTip text={TEXT} />
        </div>
    ),
    play: async ({canvas, userEvent}) => {
        await userEvent.hover(canvas.getByLabelText(TEXT))
        await expect(await screen.findByRole('tooltip')).toHaveTextContent(TEXT)
    },
}
