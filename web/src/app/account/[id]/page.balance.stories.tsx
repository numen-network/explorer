import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {accountTransferCases, accountTransfers, delegatedOnTracks, funds, MAX_U128, subject, SUBJECT, TRACKS, TREASURY} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, HEAD, issuance, numn, PEOPLE, rows, transfer} from '../../../../../mock/fixtures.js'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, build, story, rowValue, lock} from './page.stories.helpers'

export default {title: 'Pages/Account/Balance', ...pageMeta(AccountPage), decorators: [wellKnown]}

// the bar's colours in order, a grey track when there is nothing to split
const barParts = (root: HTMLElement) =>
    [...root.querySelector('[data-slot=balance-bar]')!.children].map(c => ['bg-good', 'bg-dim', 'bg-border'].find(bg => c.classList.contains(bg)))

const shares = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=share]')].map(e => e.textContent)

// every amount ends at the same x, which is what lines the decimal points up
const expectAligned = (root: HTMLElement) => {
    const rights = [...root.querySelectorAll('[data-slot=amount-label] + div > span:first-child')].map(e => Math.round(e.getBoundingClientRect().right))
    expect(rights.length).toBe(8)
    expect(new Set(rights).size).toBe(1)
    const nonce = within(root).getByText('Nonce', {selector: 'div'}).getBoundingClientRect()
    for (const label of root.querySelectorAll('[data-slot=amount-label]')) {
        expect(Math.round(label.getBoundingClientRect().left)).toBe(Math.round(nonce.left))
        expect(label.firstElementChild!.getClientRects()).toHaveLength(1)
    }
}

const expectSplit = (root: HTMLElement, balance: string, transferable: string, locked: string) =>
    expect([rowValue(root, 'Balance'), rowValue(root, 'Transferable *'), rowValue(root, 'Locked *')]).toEqual([balance, transferable, locked].map(v => `${v} NUMN`))

export const Zero: StoryObj = {
    ...story({account: subject({...funds('0'), nonce: 4}), transfers: accountTransfers(4)}),
    play: ({canvasElement}) => {
        expect(barParts(canvasElement)).toEqual(['bg-border'])
        expect(shares(canvasElement)).toEqual([])
        expectAligned(canvasElement)
    },
}

export const AllTransferable: StoryObj = {
    ...story({account: subject(funds(numn(1250.5))), transfers: accountTransfers(3)}),
    play: ({canvasElement}) => {
        expect(barParts(canvasElement)).toEqual(['bg-good'])
        expect(shares(canvasElement)).toEqual(['100.00%', '0.00%'])
    },
}

export const Extremes: StoryObj = {
    ...story({
        account: subject({
            ...funds(MAX_U128, numn(0.000001), MAX_U128),
            nonce: 2_147_483_647,
            firstSeenBlock: 0,
            firstSeenTimestamp: null,
            lastActiveBlock: HEAD,
            locksJson: [lock('democrac', MAX_U128)],
        }),
        transfers: accountTransferCases(HEAD - 3),
    }),
    play: ({canvasElement}) => {
        expect(barParts(canvasElement)).toEqual(['bg-good', 'bg-dim'])
        expectAligned(canvasElement)
    },
}

export const ReserveOverLocks: StoryObj = {
    ...story({account: subject(funds('98512014386512943379', '5870000000000000000')), transfers: accountTransfers(3)}),
    play: ({canvasElement}) => {
        expectSplit(canvasElement, '104.382014386512943379', '98.512014386512943379', '5.870000000000000000')
        expect(barParts(canvasElement)).toEqual(['bg-good', 'bg-dim'])
        expect(shares(canvasElement)).toEqual(['94.37%', '5.62%'])
        expectAligned(canvasElement)
    },
}

// the transferable slice is a hundred-millionth of the bar and still shows
export const LocksOverReserve: StoryObj = {
    ...story({
        account: subject({
            ...funds('2122000258102383578190096', numn(2000), numn(2_124_000)),
            locksJson: [lock('vesting', '2068174533895410780646470'), lock('pyconvot', numn(2_124_000))],
        }),
        transfers: accountTransfers(3),
    }),
    play: ({canvasElement}) => {
        expectSplit(canvasElement, '2,124,000.258102383578190096', '0.258102383578190096', '2,124,000.000000000000000000')
        expect(shares(canvasElement)).toEqual(['<0.01%', '99.99%'])
        const sliver = canvasElement.querySelector('[data-slot=balance-bar] > .bg-good')!
        expect(sliver.getBoundingClientRect().width).toBeGreaterThanOrEqual(4)
        expectAligned(canvasElement)
    },
}

// 1,250.5 at 6x plus the 4,500 votes Root carries, the larger of its two tracks
export const VotesPower: StoryObj = {
    ...story({
        delegationsIn: [...delegatedOnTracks(PEOPLE[1], TRACKS.slice(0, 2), numn(1_000)), ...delegatedOnTracks(PEOPLE[2], TRACKS.slice(0, 1), numn(500))],
        transfers: accountTransfers(3),
    }),
    play: async ({canvasElement}) => {
        expect(rowValue(canvasElement, 'Votes power **')).toBe('12,003.000000000000000000 NUMN')
        expect(rowValue(canvasElement, 'Max delegations')).toBe('4,500.000000000000000000 NUMN')
    },
}

// born at genesis, which the config dates, and never active since
export const Treasury: StoryObj = {
    ...story({
        account: subject({id: TREASURY.id, ...funds(issuance.treasuryPot), nonce: 0, firstSeenBlock: 0, firstSeenTimestamp: null, lastActiveBlock: null}),
        transfers: rows(8, (h: number, i: number) => (i % 2 === 0 ? transfer(h, i, {from: TREASURY, extrinsic: null, call: null, amount: numn(5_000 * (i + 1))}) : transfer(h, i, {to: TREASURY}))),
        counts: {transfers: 312},
    }),
    play: async ({canvas, canvasElement}) => {
        expect(rowValue(canvasElement, 'First seen')).toContain('| 2026-09-14 01:00:00 (UTC)')
        expect(canvas.queryByText('Last active')).toBeNull()
    },
}

const BORN_AT_GENESIS = subject({firstSeenBlock: 0, firstSeenTimestamp: null})
const firstSeen = (root: HTMLElement) => within(root).getByText('First seen').nextElementSibling!.textContent

// an account genesis endowed is dated by the network's genesis time from the config
export const FirstSeenAtGenesis: StoryObj = {
    ...story({account: BORN_AT_GENESIS, transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => {
        expect(firstSeen(canvasElement)).toMatch(/^#0/)
        expect(firstSeen(canvasElement)).toContain('| 2026-09-14 01:00:00 (UTC)')
    },
}

// a network the config has no genesis time for, like the testnet, leaves the empty mark
export const FirstSeenAtGenesisUnconfigured: StoryObj = {
    ...pageStory({...build({account: BORN_AT_GENESIS, transfers: accountTransfers(3)}), chainInfos: [{...chainInfo, evmChainId: 320261}]}, {params: {id: SUBJECT}}),
    play: async ({canvasElement}) => expect(firstSeen(canvasElement)).toBe('#0—'),
}
