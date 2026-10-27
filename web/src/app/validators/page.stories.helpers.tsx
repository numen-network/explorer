import {account, acct, chainInfo, HEAD, identity, numn, paged, person} from '../../../../mock/fixtures.js'
import {pageStory} from '../../../.storybook/page'

const SESSION = Math.floor(HEAD / chainInfo.sessionLength)
export const DAY = 86_400 / chainInfo.blockTime
const LOCK = numn(100_000_000)
export const U128_MAX = (2n ** 128n - 1n).toString()
export const INT_MAX = 2 ** 31 - 1

export const validator = (n: number, traits: object = {}) => ({
    id: account(n),
    account: {...person(n), id: account(n)},
    active: true,
    status: 'Active',
    lockedAmount: LOCK,
    lockExpiry: HEAD + (180 - n) * DAY,
    offences: [] as {kind: string}[],
    kicked: null,
    rejoinCooldown: null as number | null,
    firstSeenBlock: n * 12_000,
    lastActiveSession: SESSION,
    ...traits,
})

export const exempt = {lockedAmount: '0', lockExpiry: null, firstSeenBlock: 0}
export const offences = (offline: number, equivocations = 0) => ({
    offences: [...Array(offline).fill({kind: 'Offline'}), ...Array(equivocations).fill({kind: 'Equivocation'})],
})

// the mainnet genesis set, which missed heartbeats at #292560, #292620, #298140,
// #298200 and #298440
export const GENESIS = [
    {id: '0x0c75ace1a6f6b7857e03f08e170590ed34fbded0b415d37de2dda6c2fa2bf85d', offline: 1},
    {id: '0x0c75ace1f15ade9f7c63fbe5cf37982d9699a2667e14c789f37b5b720cba8e10', offline: 2},
    {id: '0x0c75ace1f34508360008ad6b21df5f69412786019ce84847c8609f239e4d6123', offline: 1},
    {id: '0x0c75ace277b402399cf8fb811b871169e5d675f9f7c5c9a72a72c4bb8044d917', offline: 2},
]
export const genesis = (traits: (g: (typeof GENESIS)[number]) => object) =>
    GENESIS.map(g => validator(0, {...exempt, id: g.id, account: {id: g.id}, ...traits(g)}))
export const inactive = (status: string, sessionsAgo: number) => ({active: false, status, lastActiveSession: SESSION - sessionsAgo})
export const kicked = (reason: string, sessionsAgo: number, rejoinCooldown = HEAD + DAY) => ({...inactive('Kicked', sessionsAgo), kicked: {__kind: reason}, rejoinCooldown})
export const released = (sessionsAgo: number) => ({...inactive('Released', sessionsAgo), lockedAmount: '0', lockExpiry: null})

type Row = ReturnType<typeof validator>

// the tiles count every validator, the active ones and the pending ones, told
// apart by the filter
export const validators = (rows: Row[], page = '1') =>
    pageStory(
        {
            validators: paged(rows),
            validatorStepsConnection: {totalCount: 0},
            validatorsConnection: ({where = {}}: {where?: {active_eq?: boolean; status_eq?: string}}) => ({
                totalCount: rows.filter(v => (where.active_eq == null || v.active === where.active_eq) && (where.status_eq == null || v.status === where.status_eq)).length,
            }),
        },
        {searchParams: {page}}
    )

export const many = Array.from({length: 46}, (_, i) => {
    const n = i + 1
    if (i < 30) return validator(n, i % 7 === 6 ? exempt : {})
    if (i < 33) return validator(n, {...kicked('Offline', i - 29), ...offences(1)})
    if (i < 35) return validator(n, {...kicked('Equivocation', i - 28), ...offences(0, 1 + (i % 2))})
    return validator(n, released(i * 50))
})


// a step as the history reads it, with the validator it belongs to
export const withAccount = (n: number, step: object) => ({...step, account: {...person(n), id: account(n)}})

export const history = (steps: object[], searchParams: Record<string, string> = {}) =>
    pageStory(
        {
            validators: [],
            validatorsConnection: {totalCount: 0},
            validatorSteps: paged(steps),
            validatorStepsConnection: {totalCount: steps.length},
        },
        {searchParams: {tab: 'history', ...searchParams}}
    )
