import {useState} from 'react'
import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, waitFor} from 'storybook/test'
import Dropdown, {type DropdownOption} from './Dropdown'

const meta = {title: 'Components/Dropdown'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

function Demo<V extends string>({options, initial, fit}: {options: DropdownOption<V>[]; initial: V; fit?: string[]}) {
    const [value, setValue] = useState(initial)
    return <Dropdown label="Pick" value={value} options={options} onChange={setValue} fit={fit} />
}

const ACTIONS = [
    {value: 'all', label: 'All actions'},
    {value: 'vote', label: 'Vote'},
    {value: 'remove', label: 'Remove vote'},
    {value: 'delegate', label: 'Delegate'},
    {value: 'undelegate', label: 'Undelegate'},
]

export const Plain: Story = {
    render: () => <Demo options={ACTIONS} initial="all" />,
}

export const WithCounts: Story = {
    render: () => (
        <Demo
            options={[
                {value: '', label: 'All', count: 152_131},
                {value: 'Balances', label: 'Balances', count: 599},
                {value: 'Identity', label: 'Identity', count: 0},
                {value: 'Timestamp', label: 'Timestamp', count: 137_749},
            ]}
            initial=""
        />
    ),
}

export const SingleOption: Story = {
    render: () => <Demo options={[{value: '20', label: '20 / page'}]} initial="20" />,
}

// the open list sits over the trigger with the picked option on top of it,
// given room above for the options before it
export const Open: Story = {
    render: () => (
        <div className="pt-40">
            <Demo options={ACTIONS} initial="delegate" />
        </div>
    ),
    play: async ({canvas, userEvent}) => {
        const trigger = canvas.getByRole('combobox', {name: 'Pick'})
        const top = trigger.getBoundingClientRect().top
        await userEvent.click(trigger)
        const picked = await screen.findByRole('option', {name: 'Delegate', selected: true})
        await waitFor(() => expect(Math.abs(picked.getBoundingClientRect().top - top)).toBeLessThan(8))
    },
}

// picking a value keeps the trigger at the width of the longest label
export const SteadyWidth: Story = {
    render: () => <Demo options={ACTIONS} initial="vote" />,
    play: async ({canvas, userEvent}) => {
        const trigger = canvas.getByRole('combobox', {name: 'Pick'})
        const width = trigger.getBoundingClientRect().width
        await userEvent.click(trigger)
        await userEvent.click(await screen.findByRole('option', {name: 'Remove vote'}))
        await expect(trigger.getBoundingClientRect().width).toBe(width)
    },
}

const TOKENS = [
    {value: 'native', label: 'NUMN'},
    {value: '0xa1795b3c6f74866c7def1df390f9e2e403dca2e9', label: 'WTMR', note: '0xa1795…a2e9'},
    {value: '0xe3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3', label: 'LONGNAME', note: '0xe3e3e…e3e3'},
]

// the picked option's note rides after its label, and the trigger holds the
// width of the longest label with its note whichever is picked
export const WithNotes: Story = {
    render: () => <Demo options={TOKENS} initial="0xa1795b3c6f74866c7def1df390f9e2e403dca2e9" />,
    play: async ({canvas, userEvent}) => {
        const trigger = canvas.getByRole('combobox', {name: 'Pick'})
        await expect(trigger).toHaveTextContent(/^WTMR0xa1795…a2e9$/)
        const width = trigger.getBoundingClientRect().width
        await userEvent.click(trigger)
        await userEvent.click(await screen.findByRole('option', {name: /^NUMN/}))
        await expect(trigger).toHaveTextContent(/^NUMN$/)
        await expect(trigger.getBoundingClientRect().width).toBe(width)
        await userEvent.click(trigger)
        await userEvent.click(await screen.findByRole('option', {name: /^LONGNAME/}))
        await expect(trigger).toHaveTextContent(/^LONGNAME0xe3e3e…e3e3$/)
        await expect(trigger.getBoundingClientRect().width).toBe(width)
    },
}
