import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {getRouter} from '@storybook/nextjs-vite/navigation.mock'
import {expect} from 'storybook/test'
import SearchBar from './SearchBar'

const meta = {title: 'Components/SearchBar', component: SearchBar} satisfies Meta<typeof SearchBar>
export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Submitted: Story = {
    play: async ({canvas, userEvent}) => {
        await userEvent.type(canvas.getByRole('textbox'), '  Polaris Guild  ')
        await userEvent.click(canvas.getByRole('button', {name: 'Search'}))
        await expect(getRouter().push).toHaveBeenCalledWith('/search?q=Polaris%20Guild')
    },
}

export const BlankNotSubmitted: Story = {
    play: async ({canvas, userEvent}) => {
        await userEvent.type(canvas.getByRole('textbox'), '   ')
        await userEvent.click(canvas.getByRole('button', {name: 'Search'}))
        await expect(getRouter().push).not.toHaveBeenCalled()
    },
}
