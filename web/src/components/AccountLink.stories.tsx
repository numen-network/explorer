import type {Decorator, Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {expect} from 'storybook/test'
import type {IdentityRef} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {PRIME_KEY, TREASURY} from '../../../mock/fixtures/accounts.js'
import {acct, chainInfo, hashOf, identity, PEOPLE} from '../../../mock/fixtures.js'
import {expectFits} from '../../.storybook/fit'
import AccountLink from './AccountLink'
import {WellKnownProvider} from './wellKnown'

const wellKnown: Decorator = Story => (
    <WellKnownProvider treasury={ss58Encode(chainInfo.treasuryAccount, chainInfo.ss58)} prime={ss58Encode(PRIME_KEY.id, chainInfo.ss58)} evmChainId={chainInfo.evmChainId}>
        <Story />
    </WellKnownProvider>
)

const meta = {title: 'Components/AccountLink', decorators: [wellKnown]} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const addr = (acc: {id: string}) => ss58Encode(acc.id, chainInfo.ss58)

function Case({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="grid grid-cols-[220px_minmax(0,1fr)] items-center gap-4 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="min-w-0">{children}</div>
        </div>
    )
}

const [polaris, orbit, bare, redshift, spamlord, nova, muddy, longName, sub] = PEOPLE

const CASES: [string, IdentityRef & {id: string}][] = [
    ['KnownGood', polaris],
    ['Reasonable', orbit],
    ['OutOfDate', redshift],
    ['FeePaid', nova],
    ['no judgement yet', muddy],
    ['Unknown', acct(21, identity('Quiet Registry', {judgements: ['Unknown']}))],
    ['LowQuality', acct(22, identity('Lowball Ltd', {judgements: ['LowQuality']}))],
    ['Erroneous', spamlord],
    ['Erroneous beats KnownGood', acct(23, identity('Mixed Signals', {judgements: ['KnownGood', 'Erroneous']}))],
    ['sub of a judged super', sub],
    ['sub with its own registration', acct(24, identity('Polaris Payouts', {judgements: []}), {identitySubName: 'payouts', identitySuper: polaris})],
    ['sub filed under a hash', acct(25, {identitySubName: null, identitySubData: {__kind: 'BlakeTwo256', value: hashOf('sub', 1)}, identitySuper: polaris})],
    ['no identity', bare],
    ['label longer than its column', longName],
]

export const EveryIdentity: Story = {
    render: () => (
        <>
            {CASES.map(([label, acc]) => (
                <Case key={label} label={label}>
                    <AccountLink addr={addr(acc)} acc={acc} />
                </Case>
            ))}
        </>
    ),
}

export const WellKnown: Story = {
    render: () => (
        <>
            <Case label="treasury">
                <AccountLink addr={addr(TREASURY)} />
            </Case>
            <Case label="prime key over its identity">
                <AccountLink addr={addr(PRIME_KEY)} acc={PRIME_KEY} />
            </Case>
            <Case label="treasury, plain">
                <AccountLink plain full addr={addr(TREASURY)} />
            </Case>
        </>
    ),
}

export const AddressOnly: Story = {
    render: () => (
        <>
            <Case label="short">
                <AccountLink addr={addr(bare)} />
            </Case>
            <Case label="full">
                <AccountLink full addr={addr(bare)} />
            </Case>
            <Case label="plain hides the identity">
                <AccountLink plain addr={addr(polaris)} acc={polaris} />
            </Case>
        </>
    ),
}

// a label truncates in a column too narrow for it, a full address wraps
export const NarrowColumn: Story = {
    render: () => (
        <div className="grid w-40 gap-2 rounded-md border p-2">
            <AccountLink addr={addr(longName)} acc={longName} />
            <AccountLink addr={addr(sub)} acc={sub} />
            <AccountLink full addr={addr(bare)} />
        </div>
    ),
    play: async ({canvas, canvasElement}) => {
        const [long, , full] = canvas.getAllByRole('link')
        const label = long.lastElementChild!
        expect(label.scrollWidth).toBeGreaterThan(label.clientWidth)
        expect(full.innerText).toBe(addr(bare))
        expectFits(canvasElement.firstElementChild!, full, ...full.querySelectorAll('span'))
    },
}

// an account named in a line of text stays on that line, and one too long for
// what is left of it moves down and truncates
export const InText: Story = {
    render: () => (
        <div className="space-y-3 text-sm">
            <div>
                5 NUMN <span className="text-dim">·</span> <AccountLink addr={addr(polaris)} acc={polaris} />
            </div>
            <div className="w-56 rounded-md border p-2">
                200 NUMN <span className="text-dim">·</span> <AccountLink addr={addr(longName)} acc={longName} />
            </div>
        </div>
    ),
    play: async ({canvas}) => {
        const [inline, wrapped] = canvas.getAllByRole('link')
        const top = (el: Element) => el.getBoundingClientRect().top
        const line = (link: HTMLElement) => link.closest('.space-y-3 > div')!
        expect(top(inline)).toBeCloseTo(top(line(inline)), 0)
        expect(top(wrapped)).toBeGreaterThan(top(line(wrapped)) + 10)
        expectFits(line(wrapped))
    },
}

export const HoverCard: Story = {
    render: () => <AccountLink addr={addr(polaris)} acc={polaris} />,
    play: async ({canvas, userEvent}) => {
        await userEvent.hover(canvas.getByRole('link'))
    },
}
