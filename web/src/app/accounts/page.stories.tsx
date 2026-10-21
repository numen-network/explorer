import type {Decorator, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {WellKnownProvider} from '@/components/wellKnown'
import {ss58Encode} from '@/lib/ss58'
import {MAX_U128, PLANCK, PRIME_KEY, TREASURY} from '../../../../mock/fixtures/accounts.js'
import {acct, chainInfo, HEAD, identity, issuance, numn, PEOPLE} from '../../../../mock/fixtures.js'
import {columnTexts, expectAddressForm, expectFits} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import AccountsPage from './page'

const wellKnown: Decorator = Story => (
    <WellKnownProvider treasury={ss58Encode(chainInfo.treasuryAccount, chainInfo.ss58)} prime={ss58Encode(PRIME_KEY.id, chainInfo.ss58)} evmChainId={chainInfo.evmChainId}>
        <Story />
    </WellKnownProvider>
)

export default {title: 'Pages/Accounts/List', ...pageMeta(AccountsPage), decorators: [wellKnown]}

const row = (who: object, balance: string, i: number) => ({...who, balance, nonce: (i * 37) % 900, firstSeenBlock: 1_000 + i * 41_000, lastActiveBlock: HEAD - i * 1_300})

const list = (rows: object[], {total = rows.length, since = 412_345} = {}) =>
    pageStory({
        accounts: rows,
        accountsConnection: {totalCount: total},
        dailyStats: [{issuanceTotal: issuance.issuanceTotal}],
        primeStates: [{since, account: PRIME_KEY}],
    })

export const Empty = pageStory({})

export const One = list([row(PEOPLE[0], numn(2_400_000), 0)])

const DUST = acct(16, identity('Dust Collector', {judgements: []}))

// rows down through every emoji tier of the issuance share, then dust below the last tier and an emptied account
const TIERS: [object, string][] = [
    [TREASURY, issuance.treasuryPot],
    [PRIME_KEY, numn(12_500_000)],
    [PEOPLE[0], numn(2_400_000)],
    [PEOPLE[1], numn(750_000)],
    [PEOPLE[2], numn(310_000)],
    [PEOPLE[3], numn(88_000)],
    [PEOPLE[4], numn(41_000)],
    [PEOPLE[5], numn(12_345.678)],
    [PEOPLE[6], numn(6_100)],
    [PEOPLE[7], numn(4_200)],
    [PEOPLE[8], numn(950.5)],
    [PEOPLE[9], numn(610)],
    [acct(11), numn(420)],
    [acct(12), numn(75.25)],
    [acct(13), numn(61)],
    [acct(14), numn(45)],
    [acct(15), numn(6.5)],
    [DUST, numn(2.75)],
    [acct(17), numn(0.000001)],
    [acct(18), '0'],
]

export const EveryTier: StoryObj = {
    ...list(TIERS.map(([who, balance], i) => row(who, balance, i))),
    play: async ({canvasElement}) => {
        const marks = columnTexts(canvasElement, 'Balance').map(text => /^\p{Extended_Pictographic}/u.exec(text!)?.[0] ?? '')
        expect([...new Set(marks)]).toEqual(['\u{1F40B}', '\u{1F988}', '\u{1F42C}', '\u{1F41F}', '\u{1F980}', '\u{1F990}', ''])
    },
}

// holders without an identity read as their address
const HOLDERS = Array.from({length: 20}, (_, i) => row(i % 2 ? acct(30 + i) : PEOPLE[i / 2], numn(900_000 / (i + 1)), i))

// the treasury and prime cards wrap their full addresses, the table keeps
// 7…4 on a phone
export const Many: StoryObj = {
    ...list(HOLDERS, {total: 1_284, since: 0}),
    play: async ({canvasElement}) => {
        const [cards, table] = canvasElement.querySelectorAll('[data-slot=card]')
        expectFits(cards, table)
        expectAddressForm(cards)
        expectAddressForm(table)
    },
}

// a balance shortens by cutting, never rounding, and a share too small to show reads <0.01%
export const BalancesAndShares: StoryObj = {
    ...list([row(PEOPLE[0], numn(2_400_000), 0), row(PEOPLE[5], numn(12_345.678), 1), row(DUST, numn(2.75), 2), row(acct(18), '0', 3)]),
    play: async ({canvas, canvasElement}) => {
        const named = (name: string) => canvas.getByText(name).closest('tr')!
        expect(holding(canvasElement, named('Polaris Guild'))).toEqual(['2.4M NUMN', '0.39%'])
        expect(holding(canvasElement, named('Nova Fund'))).toEqual(['≈12.34K NUMN', '<0.01%'])
        expect(holding(canvasElement, named('Dust Collector'))).toEqual(['2.75 NUMN', '<0.01%'])
        expect(holding(canvasElement, canvas.getAllByRole('row').at(-1)!)).toEqual(['0 NUMN', '0.00%'])
    },
}

// the balance and share a row reads, its tier mark left out
function holding(root: HTMLElement, row: HTMLElement) {
    const at = within(root).getAllByRole('row').indexOf(row) - 1
    return [columnTexts(root, 'Balance')[at]!.replace(/^\p{Extended_Pictographic}/u, ''), columnTexts(root, 'Share')[at]]
}

export const ExtremeNumbers: StoryObj = {
    ...list([
        {...row(PEOPLE[7], MAX_U128, 0), nonce: 2_147_483_647, firstSeenBlock: 0, lastActiveBlock: HEAD},
        row(PEOPLE[8], numn(0.000001), 1),
        {...row(acct(19), PLANCK, 2), nonce: 0},
        {...row(acct(20), '0', 3), nonce: 0, firstSeenBlock: HEAD, lastActiveBlock: null},
    ]),
    play: async ({canvas}) => expect(canvas.getByRole('cell', {name: '2,147,483,647'})).toBeVisible(),
}

// an account that never signed has no last active block, so the cell stays empty
export const NeverActive: StoryObj = {
    ...list([{...row(acct(21), numn(5), 0), nonce: 0, lastActiveBlock: null}]),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Last active')).toEqual(['']),
}
