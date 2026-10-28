import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {acct, HEAD, identity} from '../../../../mock/fixtures.js'
import {columnTexts, expectAddressForm, expectFits, filterOptions} from '../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../.storybook/page'
import {fmtInt} from '@/lib/format'
import ValidatorsPage from './page'
import {DAY, exempt, genesis, GENESIS, INT_MAX, kicked, inactive, many, offences, released, U128_MAX, validator, validators} from './page.stories.helpers'

export default {title: 'Pages/Validators/Validators', ...pageMeta(ValidatorsPage)}

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

export const Page2 = validators(many, {page: '2'})

export const LastPage = validators(many, {page: lastPage(many.length)})

const everyStatus = [
    validator(1),
    validator(2, exempt),
    validator(5, kicked('Offline', 1)),
    validator(6, kicked('Equivocation', 3)),
    validator(3, inactive('ExitRequested', 40)),
    validator(4, released(9_000)),
    validator(7, {active: false, lastActiveSession: null}),
]

// every option stays listed with its count, Pending being an Active lock
// outside the session set
export const StatusFilter: StoryObj = {
    ...validators(everyStatus.filter(v => v.status === 'Kicked'), {status: 'Kicked'}, everyStatus),
    play: async ({canvasElement}) => {
        await expect(within(canvasElement).getByRole('combobox', {name: 'Status'})).toHaveTextContent('Kicked')
        await expect(await filterOptions(canvasElement, 'Status')).toEqual(['All 7', 'Active 2', 'Pending 1', 'Exit requested 1', '[Kicked 2]', 'Released 1'])
        await expect(columnTexts(canvasElement, 'Status')).toEqual(['Kicked · Offline', 'Kicked · Equivocation'])
    },
}

export const Search: StoryObj = {
    ...validators([validator(1)], {q: 'Orbit'}),
    play: async ({canvas}) => expect(canvas.getByPlaceholderText('Search identity, address')).toHaveValue('Orbit'),
}

export const NoMatch: StoryObj = {
    ...validators([], {status: 'Released', q: 'Orbit'}),
    play: async ({canvas}) => expect(canvas.getByText('No matching validators.')).toBeInTheDocument(),
}

// where the Locked heading leads, keeping the status and search, and which way
// its arrow points
const lockedHead = (root: HTMLElement) => {
    const a = within(within(root).getAllByRole('row')[0]).getByRole('link', {name: 'Locked'})
    const q = new URL(a.getAttribute('href')!, 'http://x').searchParams
    return [q.get('status'), q.get('q'), q.get('sort'), q.get('order'), a.querySelector('.lucide-arrow-down') ? 'down' : a.querySelector('.lucide-arrow-up') ? 'up' : null]
}

// the list runs by last session until the heading is picked, which starts it
// biggest first
export const DefaultOrder: StoryObj = {
    ...validators(everyStatus, {status: 'Active', q: 'nu'}),
    play: async ({canvasElement}) => expect(lockedHead(canvasElement)).toEqual(['Active', 'nu', 'locked', 'desc', null]),
}

// the mock ignores the order, so the rows are laid out the way it runs
export const SortedByLocked: StoryObj = {
    ...validators([validator(1), validator(5, kicked('Offline', 1)), validator(2, exempt), validator(4, released(9_000))], {sort: 'locked', order: 'desc'}),
    play: async ({canvasElement}) => {
        await expect(lockedHead(canvasElement)).toEqual([null, null, 'locked', 'asc', 'down'])
        await expect(columnTexts(canvasElement, 'Locked')).toEqual(['100,000,000 NUMN', '100,000,000 NUMN', '0 NUMN', '0 NUMN'])
    },
}

export const SortedByLockedAscending: StoryObj = {
    ...validators([validator(2, exempt), validator(4, released(9_000)), validator(1)], {sort: 'locked', order: 'asc'}),
    play: async ({canvasElement}) => {
        await expect(lockedHead(canvasElement)).toEqual([null, null, 'locked', 'desc', 'up'])
        await expect(columnTexts(canvasElement, 'Locked')).toEqual(['0 NUMN', '0 NUMN', '100,000,000 NUMN'])
    },
}
