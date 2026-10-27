import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {HEAD} from '../../../mock/fixtures.js'
import {fmtInt} from '@/lib/format'
import {LockExpiry, RejoinAfter, ValidatorStatus} from './ValidatorStatus'

const meta = {title: 'Components/ValidatorStatus'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const EXPIRY = HEAD + 1_000

type Case = [label: string, v: Parameters<typeof ValidatorStatus>[0]['v'], status: string, expiry: string, rejoin: string]

const base = {active: true, status: 'Active', kicked: null, rejoinCooldown: null, lockExpiry: EXPIRY}

// the cooldown deadline is the last block that refuses a lock, so the block
// after the head is free once the deadline reaches the head
const CASES: Case[] = [
    ['active', base, 'Active', 'Auto-renews', '—'],
    ['pending', {...base, active: false}, 'Pending', 'Auto-renews', '—'],
    ['exit requested', {...base, status: 'ExitRequested'}, 'Exit requested', `#${fmtInt(EXPIRY)}`, '—'],
    ['kicked, cooling down', {...base, status: 'Kicked', kicked: {__kind: 'Offline'}, rejoinCooldown: HEAD + 1}, 'Kicked · Offline', `#${fmtInt(EXPIRY)}`, `#${fmtInt(HEAD + 1)}`],
    ['kicked, cooldown over', {...base, active: false, status: 'Kicked', kicked: {__kind: 'Equivocation'}, rejoinCooldown: HEAD}, 'Kicked · Equivocation', `#${fmtInt(EXPIRY)}`, '—'],
    ['released', {...base, active: false, status: 'Released', lockExpiry: null}, 'Released', '—', '—'],
    ['released, cooling down', {...base, active: false, status: 'Released', kicked: {__kind: 'Offline'}, rejoinCooldown: HEAD + 10, lockExpiry: null}, 'Released', '—', `#${fmtInt(HEAD + 10)}`],
    ['unknown status', {...base, status: 'SomeNewStatus'}, 'Some new status', `#${fmtInt(EXPIRY)}`, '—'],
]

export const EveryStatus: Story = {
    render: () => (
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-start gap-x-4 gap-y-3 text-sm">
            {CASES.map(([label, v]) => (
                <div key={label} className="contents">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span data-status={label}>
                        <ValidatorStatus v={v} />
                    </span>
                    <span data-expiry={label} className="whitespace-nowrap">
                        <LockExpiry v={v} renewEvery="1d" />
                    </span>
                    <span data-rejoin={label} className="whitespace-nowrap">
                        <RejoinAfter v={v} head={HEAD} />
                    </span>
                </div>
            ))}
        </div>
    ),
    play: async ({canvasElement}) => {
        for (const [label, , status, expiry, rejoin] of CASES) {
            const read = (attr: string) => canvasElement.querySelector(`[data-${attr}="${label}"]`)!.textContent
            await expect({label, status: read('status'), expiry: read('expiry'), rejoin: read('rejoin')}).toEqual({label, status, expiry, rejoin})
        }
    },
}
