import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {acct, chainInfo, PEOPLE} from '../../../mock/fixtures.js'
import {shortAddr} from '@/components/AddressText'
import {ss58Encode} from '@/lib/ss58'
import RegistrarSeat from './RegistrarSeat'

const meta = {title: 'Components/RegistrarSeat'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const NAMELESS = acct(201, {identityDisplay: null, identityJson: null})

const center = (e: Element) => {
    const r = e.getBoundingClientRect()
    return r.top + r.height / 2
}

// a seat with a named holder, one with a bare address, a retired one and one the index never saw
export const EveryCase: Story = {
    render: () => (
        <div className="flex flex-col gap-3">
            <RegistrarSeat index={0} account={PEOPLE[0]} ss58={chainInfo.ss58} />
            <RegistrarSeat index={1} account={NAMELESS} ss58={chainInfo.ss58} />
            <RegistrarSeat index={3} account={null} ss58={chainInfo.ss58} />
            <RegistrarSeat index={9} account={undefined} ss58={chainInfo.ss58} />
        </div>
    ),
    play: async ({canvasElement}) => {
        const seats = [...canvasElement.querySelectorAll('.flex-col > span')]
        await expect(seats.map(s => s.textContent)).toEqual(['#0Polaris Guild', `#1${shortAddr(ss58Encode(NAMELESS.id, chainInfo.ss58))}`, '#3Retired', '#9'])
        for (const s of seats) await expect(s.firstElementChild).toHaveClass('text-muted-foreground')
        for (const s of seats.slice(0, 3)) await expect(Math.abs(center(s.children[0]) - center(s.children[1]))).toBeLessThanOrEqual(0.5)
    },
}
