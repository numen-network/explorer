import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {account, acct, chainInfo, HEAD, identity, numn, paged, person} from '../../../../mock/fixtures.js'
import {columnTexts, expectAddressForm, expectFits} from '../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../.storybook/page'
import ValidatorsPage from './page'

export default {title: 'Pages/Validators', ...pageMeta(ValidatorsPage)}

const SESSION = Math.floor(HEAD / chainInfo.sessionLength)
const DAY = 86_400 / chainInfo.blockTime
const LOCK = numn(100_000_000)
const U128_MAX = (2n ** 128n - 1n).toString()
const INT_MAX = 2 ** 31 - 1

const validator = (n: number, traits: object = {}) => ({
    id: account(n),
    account: {...person(n), id: account(n)},
    active: true,
    lockedAmount: LOCK,
    lockExpiry: HEAD + (180 - n) * DAY,
    offlineSessions: 0,
    equivocations: 0,
    offences: [] as {kind: string}[],
    kicked: null,
    firstSeenBlock: n * 12_000,
    lastActiveSession: SESSION,
    ...traits,
})

const exempt = {lockedAmount: '0', lockExpiry: null, firstSeenBlock: 0}
const offences = (offline: number, equivocations = 0) => ({
    offences: [...Array(offline).fill({kind: 'Offline'}), ...Array(equivocations).fill({kind: 'Equivocation'})],
})

// the mainnet genesis set, which missed heartbeats at #292560, #292620, #298140,
// #298200 and #298440
const GENESIS = [
    {id: '0x0c75ace1a6f6b7857e03f08e170590ed34fbded0b415d37de2dda6c2fa2bf85d', offline: 1},
    {id: '0x0c75ace1f15ade9f7c63fbe5cf37982d9699a2667e14c789f37b5b720cba8e10', offline: 2},
    {id: '0x0c75ace1f34508360008ad6b21df5f69412786019ce84847c8609f239e4d6123', offline: 1},
    {id: '0x0c75ace277b402399cf8fb811b871169e5d675f9f7c5c9a72a72c4bb8044d917', offline: 2},
]
const genesis = (traits: (g: (typeof GENESIS)[number]) => object) =>
    GENESIS.map(g => validator(0, {...exempt, id: g.id, account: {id: g.id}, offlineSessions: g.offline, ...traits(g)}))
const inactive = (sessionsAgo: number) => ({active: false, lastActiveSession: SESSION - sessionsAgo})
const kicked = (reason: string, sessionsAgo: number) => ({...inactive(sessionsAgo), kicked: {__kind: reason}})

// the header counts every validator and the active ones, told apart by the filter
const validators = (rows: ReturnType<typeof validator>[], page = '1') =>
    pageStory(
        {validators: paged(rows), validatorsConnection: ({where}: {where?: {active_eq?: boolean}}) => ({totalCount: where?.active_eq ? rows.filter(v => v.active).length : rows.length})},
        {searchParams: {page}}
    )

export const ValidatorsEmpty = validators([])

export const ValidatorsOne = validators([validator(1)])

// the last one locked thirty blocks ago and has yet to sit in an active set.
// from xl up a full address breaks onto a second line so every column stays in
// view, narrower screens scroll the table
export const ValidatorsEveryStatus: StoryObj = {
    ...validators([
        validator(1),
        validator(2, exempt),
        validator(5, {...kicked('Offline', 1), offlineSessions: 1, ...offences(1)}),
        validator(6, {...kicked('Equivocation', 3), equivocations: 1, ...offences(0, 1)}),
        validator(3, inactive(40)),
        validator(4, {...inactive(9_000), lockedAmount: '0', lockExpiry: null}),
        validator(7, {active: false, lastActiveSession: null, firstSeenBlock: HEAD - 30}),
    ]),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Last session').at(-1)).toBe('—')
        if (matchMedia('(width >= 80rem)').matches) expectFits(canvasElement.querySelector('[data-slot=table-container]')!)
        expectAddressForm(canvasElement)
    },
}

export const ValidatorsOfflineInWindow: StoryObj = {
    ...validators(genesis(g => offences(g.offline))),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Offline (30d)')).toEqual(['1', '2', '1', '2'])
        await expect(columnTexts(canvasElement, 'Equivocations (30d)')).toEqual(['0', '0', '0', '0'])
    },
}

// thirty days on, the misses still count on each account page but have left the window
export const ValidatorsOfflineOutsideWindow: StoryObj = {
    ...validators(genesis(() => ({}))),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Offline (30d)')).toEqual(['0', '0', '0', '0']),
}

// mainnet has never reported an equivocation, so the last row's one is made up
export const ValidatorsOfflineAndEquivocation: StoryObj = {
    ...validators(genesis(g => offences(g.offline, g === GENESIS[2] ? 1 : 0))),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Offline (30d)')).toEqual(['1', '2', '1', '2'])
        await expect(columnTexts(canvasElement, 'Equivocations (30d)')).toEqual(['0', '0', '1', '0'])
    },
}

// the second sat in the genesis set, so session 0 is a session it was active in
export const ValidatorsExtremeNumbers: StoryObj = {
    ...validators([
        validator(1, {
            account: acct(1, identity('W'.repeat(32), {judgements: ['KnownGood']})),
            lockedAmount: U128_MAX,
            lockExpiry: INT_MAX,
            offlineSessions: INT_MAX,
            equivocations: INT_MAX,
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

const many = Array.from({length: 46}, (_, i) => {
    const n = i + 1
    if (i < 30) return validator(n, i % 7 === 6 ? exempt : {})
    if (i < 33) return validator(n, {...kicked('Offline', i - 29), offlineSessions: 1, ...offences(1)})
    if (i < 35) return validator(n, {...kicked('Equivocation', i - 28), equivocations: 1 + (i % 2), ...offences(0, 1 + (i % 2))})
    return validator(n, inactive(i * 50))
})

export const ValidatorsMany = validators(many)

export const ValidatorsPage2 = validators(many, '2')

export const ValidatorsLastPage = validators(many, lastPage(many.length))
