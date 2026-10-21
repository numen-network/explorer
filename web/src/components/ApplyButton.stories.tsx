import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Input} from '@/components/ui/input'
import ApplyButton from './ApplyButton'
import DateRange from './DateRange'
import Dropdown from './Dropdown'

const meta = {title: 'Components/ApplyButton'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {
    render: () => (
        <form>
            <ApplyButton />
        </form>
    ),
}

// in a filter row Apply stands as tall as the dropdown, the date picker and the text box beside it
export const MatchesFilterControlHeight: Story = {
    render: () => (
        <form className="flex flex-wrap items-center gap-2 text-xs">
            <Dropdown label="Result" value="" options={[{value: '', label: 'All'}, {value: 'ok', label: 'Success'}]} onChange={() => {}} />
            <DateRange after="" before="" lastDay="2026-10-01" />
            <Input placeholder="ss58 or hex account" className="w-[34ch] max-w-full rounded-lg bg-card px-3 font-mono text-sm" />
            <ApplyButton />
        </form>
    ),
    play: async ({canvas, canvasElement}) => {
        const controls = [...canvasElement.querySelectorAll('button, input:not([type=hidden])')]
        await expect(controls).toHaveLength(4)
        const height = (el: Element) => el.getBoundingClientRect().height
        const apply = height(canvas.getByRole('button', {name: 'Apply'}))
        await expect(controls.map(height)).toEqual(controls.map(() => apply))
    },
}
