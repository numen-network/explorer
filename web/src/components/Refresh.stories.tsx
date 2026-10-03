import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {getRouter} from '@storybook/nextjs-vite/navigation.mock'
import {useEffect, useState} from 'react'
import {expect, waitFor} from 'storybook/test'
import Refresh from './Refresh'

const meta = {title: 'Components/Refresh'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

// Refresh draws nothing, so the story counts the router refreshes it asks for
function Refreshes() {
    const [count, setCount] = useState(0)
    useEffect(() => {
        const t = setInterval(() => setCount(getRouter().refresh.mock.calls.length), 200)
        return () => clearInterval(t)
    }, [])
    return (
        <p className="text-sm">
            router.refresh calls <span className="font-mono">{count}</span>
        </p>
    )
}

export const EverySecond: Story = {
    render: () => (
        <>
            <Refresh ms={1000} />
            <Refreshes />
        </>
    ),
    play: async () => {
        await waitFor(() => expect(getRouter().refresh).toHaveBeenCalled(), {timeout: 3000})
    },
}
