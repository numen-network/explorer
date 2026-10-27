import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {acct, HEAD, identity} from '../../../../mock/fixtures.js'
import {columnTexts, expectAddressForm, expectFits} from '../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../.storybook/page'
import {fmtInt} from '@/lib/format'
import ValidatorsPage from './page'
import {DAY, exempt, genesis, GENESIS, INT_MAX, kicked, inactive, many, offences, released, U128_MAX, validator, validators} from './page.stories.helpers'

export default {title: 'Pages/Validators/List', ...pageMeta(ValidatorsPage)}

export const Empty = validators([])

export const One = validators([validator(1)])

// the pending one locked thirty blocks ago and has yet to sit in an active set,
// the equivocator's cooldown is over though its lock still runs. the longest
// display a chain can hold can make the table scroll even at xl
export const EveryStatus: StoryObj = {
    ...validators([
        validator(1),
        validator(2, exempt),
        validator(5, {...kicked('Offline', 1), ...offences(1)}),
        validator(6, {...kicked('Equivocation', 3, HEAD - 1), ...offences(0, 1)}),
        validator(3, inactive('ExitRequested', 40)),
        validator(4, released(9_000)),
        validator(7, {active: false, lastActiveSession: null, firstSeenBlock: HEAD - 30}),
    ]),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Status')).toEqual([
            'Active',
            'Active',
            'Kicked · Offline',
            'Kicked · Equivocation',
            'Exit requested',
            'Released',
            'Pending',
        ])
        await expect(columnTexts(canvasElement, 'Lock expiry')).toEqual(['Auto-renews', 'Auto-renews', `#${fmtInt(HEAD + 175 * DAY)}`, `#${fmtInt(HEAD + 174 * DAY)}`, `#${fmtInt(HEAD + 177 * DAY)}`, '—', 'Auto-renews'])
        await expect(columnTexts(canvasElement, 'Rejoin after')).toEqual(['—', '—', `#${fmtInt(HEAD + DAY)}`, '—', '—', '—', '—'])
        await expect(columnTexts(canvasElement, 'Last session').at(-1)).toBe('—')
        expectAddressForm(canvasElement)
    },
}

// from xl up a full address breaks onto a second line so every column stays in
// view, narrower screens scroll the table
export const OfflineInWindow: StoryObj = {
    ...validators(genesis(g => offences(g.offline))),
    play: async ({canvasElement}) => {
        if (matchMedia('(width >= 80rem)').matches) expectFits(canvasElement.querySelector('[data-slot=table-container]')!)
        await expect(columnTexts(canvasElement, 'Offline (30d)')).toEqual(['1', '2', '1', '2'])
        await expect(columnTexts(canvasElement, 'Equivocations (30d)')).toEqual(['0', '0', '0', '0'])
    },
}

// thirty days on, the misses have left the window and only each account page still lists them
export const OfflineOutsideWindow: StoryObj = {
    ...validators(genesis(() => ({}))),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Offline (30d)')).toEqual(['0', '0', '0', '0']),
}

// mainnet has never reported an equivocation, so the last row's one is made up
export const OfflineAndEquivocation: StoryObj = {
    ...validators(genesis(g => offences(g.offline, g === GENESIS[2] ? 1 : 0))),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Offline (30d)')).toEqual(['1', '2', '1', '2'])
        await expect(columnTexts(canvasElement, 'Equivocations (30d)')).toEqual(['0', '0', '1', '0'])
    },
}

// the second sat in the genesis set, so session 0 is a session it was active in
export const ExtremeNumbers: StoryObj = {
    ...validators([
        validator(1, {
            account: acct(1, identity('W'.repeat(32), {judgements: ['KnownGood']})),
            lockedAmount: U128_MAX,
            lockExpiry: INT_MAX,
            ...offences(4_000, 4_000),
            firstSeenBlock: INT_MAX,
            lastActiveSession: INT_MAX,
        }),
        validator(10, {...exempt, active: false, lastActiveSession: 0}),
    ]),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Last session')).toEqual(['#2,147,483,647', '#0'])
        await expect(columnTexts(canvasElement, 'Offline (30d)')).toEqual(['4,000', '0'])
    },
}

export const Many = validators(many)

export const Page2 = validators(many, '2')

export const LastPage = validators(many, lastPage(many.length))
