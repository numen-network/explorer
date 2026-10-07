import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {account, acct, chainInfo, HEAD, identity, numn, paged, person} from '../../../../mock/fixtures.js'
import {columnTexts, DESKTOP, expectAddressForm, expectFits, PHONE} from '../../../.storybook/fit'
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
    kicked: null,
    firstSeenBlock: n * 12_000,
    lastActiveSession: SESSION,
    ...traits,
})

const exempt = {lockedAmount: '0', lockExpiry: null, firstSeenBlock: 0}
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

// the last one locked thirty blocks ago and has yet to sit in an active set
export const ValidatorsEveryStatus: StoryObj = {
    ...validators([
        validator(1),
        validator(2, exempt),
        validator(5, {...kicked('Offline', 1), offlineSessions: 1}),
        validator(6, {...kicked('Equivocation', 3), equivocations: 1}),
        validator(3, inactive(40)),
        validator(4, {...inactive(9_000), lockedAmount: '0', lockExpiry: null}),
        validator(7, {active: false, lastActiveSession: null, firstSeenBlock: HEAD - 30}),
    ]),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Last session').at(-1)).toBe('—'),
}

export const ValidatorsEveryStatusOnPhone: StoryObj = {...ValidatorsEveryStatus, globals: PHONE, play: async ({canvasElement}) => expectAddressForm(canvasElement, 'short')}

// a full address breaks onto a second line so every column stays in view
export const ValidatorsEveryStatusOnDesktop: StoryObj = {
    ...ValidatorsEveryStatus,
    globals: DESKTOP,
    play: async ({canvasElement}) => {
        expectFits(canvasElement.querySelector('[data-slot=table-container]')!)
        expectAddressForm(canvasElement, 'full')
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
            firstSeenBlock: INT_MAX,
            lastActiveSession: INT_MAX,
        }),
        validator(10, {...exempt, active: false, lastActiveSession: 0}),
    ]),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Last session')).toEqual(['#2,147,483,647', '#0']),
}

const many = Array.from({length: 46}, (_, i) => {
    const n = i + 1
    if (i < 30) return validator(n, i % 7 === 6 ? exempt : {})
    if (i < 33) return validator(n, {...kicked('Offline', i - 29), offlineSessions: 1})
    if (i < 35) return validator(n, {...kicked('Equivocation', i - 28), equivocations: 1 + (i % 2)})
    return validator(n, inactive(i * 50))
})

export const ValidatorsMany = validators(many)

export const ValidatorsPage2 = validators(many, '2')

export const ValidatorsLastPage = validators(many, lastPage(many.length))
