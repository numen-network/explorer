import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Input} from '@/components/ui/input'
import ApplyButton from './ApplyButton'
import DateRange from './DateRange'
import Dropdown from './Dropdown'

const meta = {title: 'Components/ApplyButton'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
    render: () => (
        <form>
            <ApplyButton />
        </form>
    ),
}

// a filter row mixes dropdowns, a date picker, a text box and Apply, all one height
export const FilterRowHeights: Story = {
    render: () => (
        <form className="flex flex-wrap items-center gap-2 text-xs">
            <Dropdown label="Result" value="" options={[{value: '', label: 'All'}, {value: 'ok', label: 'Success'}]} onChange={() => {}} />
            <DateRange after="" before="" lastDay="2026-10-01" />
            <Input placeholder="ss58 or hex account" className="w-[34ch] max-w-full rounded-lg bg-card px-3 font-mono text-sm" />
            <ApplyButton />
        </form>
    ),
    play: async ({canvasElement}) => {
        const controls = [...canvasElement.querySelectorAll('button, input:not([type=hidden])')]
        await expect(controls).toHaveLength(4)
        await expect(new Set(controls.map(c => c.getBoundingClientRect().height))).toEqual(new Set([32]))
    },
}
