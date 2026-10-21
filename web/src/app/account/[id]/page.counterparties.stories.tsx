import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {accountTransfers, counterpartyPage, counterpartyRow, HOLDING, holdingRows, ME, tokenTransferRows} from '../../../../../mock/fixtures/accounts.js'
import {HEAD, numn, person} from '../../../../../mock/fixtures.js'
import {expectPagersFit, columnTexts, filterOptions} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, Spec, story, mapped} from './page.stories.helpers'

export default {title: 'Pages/Account/Transfers | Counterparties', ...pageMeta(AccountPage), decorators: [wellKnown]}

// eleven accounts the subject moved NUMN with, by what it received from them,
// itself among them through a transfer to its own address
const NATIVE_PAIRS = counterpartyPage([
    counterpartyRow(person(0), {amountIn: numn(48_210.5), countIn: 214, amountOut: numn(1_250), countOut: 3, firstBlock: HEAD - 52_000}),
    counterpartyRow(person(1), {amountIn: numn(12_000), countIn: 6}),
    counterpartyRow(ME, {amountIn: numn(5_000), countIn: 1, amountOut: numn(5_000), countOut: 1, firstBlock: HEAD - 300, lastBlock: HEAD - 300}),
    counterpartyRow(person(3), {amountIn: numn(2_400.125), countIn: 9, amountOut: numn(310), countOut: 2}),
    counterpartyRow(person(4), {amountIn: numn(1_000), countIn: 1}),
    counterpartyRow(person(5), {amountIn: numn(18.75), countIn: 2}),
    counterpartyRow(person(6), {amountIn: numn(0.25), countIn: 1}),
    counterpartyRow(person(2), {amountOut: numn(9_999), countOut: 41}),
    counterpartyRow(person(7), {amountOut: numn(640), countOut: 5}),
    counterpartyRow(person(8), {amountOut: numn(12.5), countOut: 1}),
    counterpartyRow(person(9), {amountOut: numn(0.001), countOut: 1}),
])
const counterparties = (spec: Spec, searchParams: Record<string, string> = {}) => story({transfers: accountTransfers(3), ...spec}, {tab: 'counterparties', ...searchParams})
const ring = (root: HTMLElement, title: string) =>
    within(within(root).getByRole('list', {name: title}))
        .getAllByRole('listitem')
        .map(li => [...li.children].slice(1).map(c => c.textContent))
const shareSum = (lines: (string | null)[][]) => lines.reduce((n, l) => n + Math.round(parseFloat(l[2]!) * 100), 0)
// where each sortable heading leads, and whether its arrow marks it the column the list runs down
const counterpartySorts = (root: HTMLElement) =>
    within(root)
        .getAllByRole('columnheader')
        .flatMap(h => [...h.querySelectorAll('a')])
        .map(a => [a.textContent, new URL(a.getAttribute('href')!, 'http://x').searchParams.get('sort'), a.querySelector('.lucide-arrow-down') != null])
const transferTabs = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Transfers'})).getAllByRole('link').map(a => a.firstChild!.lastChild!.textContent)

// no transfer either way leaves the tab out
export const None: StoryObj = {
    ...story({}),
    play: async ({canvasElement}) => {
        await within(canvasElement).findByRole('navigation', {name: 'Account'})
        expect(transferTabs(canvasElement)).toEqual(['Native'])
    },
}

// one account sent to the subject and it sent nothing back
export const One: StoryObj = {
    ...counterparties({counterparties: counterpartyPage([counterpartyRow(person(1), {amountIn: numn(12_000), countIn: 6})])}),
    play: async ({canvas, canvasElement}) => {
        expect(transferTabs(canvasElement)).toEqual(['Native', 'Counterparties'])
        expect(ring(canvasElement, 'NUMN Transfer-in Accounts')).toEqual([['Orbit Labs', '12K NUMN', '100.00%']])
        expect(canvas.queryByRole('list', {name: 'NUMN Transfer-out Accounts'})).toBeNull()
        expect(canvas.getByText('No transfers yet.')).toBeInTheDocument()
        expect(columnTexts(canvasElement, 'Transfer-out Volume')).toEqual(['0 NUMN'])
    },
}

// past five a side the smallest pool into Others, and the shares still add up to the whole
export const Many: StoryObj = {
    ...counterparties({counterparties: NATIVE_PAIRS, counts: {pairs: 46}}),
    play: async ({canvasElement}) => {
        const inside = ring(canvasElement, 'NUMN Transfer-in Accounts')
        expect(inside.map(l => l[0])).toEqual(['Polaris Guild', 'Orbit Labs', 'self', 'Redshift', 'Others (3)'])
        expect(inside[4][1]).toBe('1,019 NUMN')
        expect(shareSum(inside)).toBe(10_000)
        const outside = ring(canvasElement, 'NUMN Transfer-out Accounts')
        expect(outside).toHaveLength(5)
        expect(shareSum(outside)).toBe(10_000)
        expect(columnTexts(canvasElement, '#')).toEqual(Array.from({length: 11}, (_, i) => String(i + 1)))
        expect(columnTexts(canvasElement, 'Account')[2]).toBe('self')
        expect(columnTexts(canvasElement, 'First')[2]).toBe(`#${(HEAD - 300).toLocaleString('en-US')}`)
        expect(counterpartySorts(canvasElement)).toEqual([
            ['Transfer-in Volume', null, true],
            ['Transfer-in Count', 'in-count', false],
            ['Transfer-out Volume', 'out-volume', false],
            ['Transfer-out Count', 'out-count', false],
        ])
        expectPagersFit(canvasElement)
    },
}

// five a side all get a slice of their own
export const Five: StoryObj = {
    ...counterparties({counterparties: counterpartyPage(NATIVE_PAIRS.rows.slice(0, 5))}),
    play: async ({canvasElement}) => {
        const inside = ring(canvasElement, 'NUMN Transfer-in Accounts')
        expect(inside.map(l => l[0])).toEqual(['Polaris Guild', 'Orbit Labs', 'self', 'Redshift', 'Spamlord'])
        expect(shareSum(inside)).toBe(10_000)
    },
}

// a second page counts on from where the first left off
export const SecondPage: StoryObj = {
    ...counterparties({counterparties: NATIVE_PAIRS, counts: {pairs: 46}}, {page: '2', size: '20'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, '#')[0]).toBe('21'),
}

export const ByOutCount: StoryObj = {
    ...counterparties({counterparties: NATIVE_PAIRS}, {sort: 'out-count'}),
    play: async ({canvasElement}) =>
        expect(counterpartySorts(canvasElement).map(h => [h[0], h[2]])).toEqual([
            ['Transfer-in Volume', false],
            ['Transfer-in Count', false],
            ['Transfer-out Volume', false],
            ['Transfer-out Count', true],
        ]),
}

const WTMR_ID = HOLDING.token.id
const ZERO = '0x0000000000000000000000000000000000000000'
const TOKEN_PAIRS = counterpartyPage([
    counterpartyRow(ZERO, {amountIn: numn(255_016.4), countIn: 12, amountOut: numn(2), countOut: 2}),
    counterpartyRow('0xacc96782e7336a38d066687f2bb6247fe854adad', {amountOut: numn(1), countOut: 1}),
])

// a contract token's counterparties are EVM addresses, the mint and burn side included
export const Token: StoryObj = {
    ...counterparties({account: mapped(), holdings: holdingRows(4), counterparties: TOKEN_PAIRS}, {token: WTMR_ID}),
    play: async ({canvasElement}) => {
        // listed in the order the holder rows come back in, each contract by its address too, which a nameless one already shows
        expect(await filterOptions(canvasElement, 'Token')).toEqual(['NUMN', 'LONGNAME 0xe3e3…e3e3', 'ORB 0xe1e1…e1e1', '[WTMR 0xa179…a2e9]', '0xe2e2…e2e2'])
        // the native token wears the chain logo, a listed token its own, the rest an empty square
        const trigger = within(canvasElement).getByRole('combobox', {name: 'Token'})
        expect(trigger).toHaveTextContent(/^WTMR0xa179…a2e9$/)
        expect(trigger.querySelector('img')).not.toBeNull()
        await userEvent.click(trigger)
        const list = await within(document.body).findByRole('listbox')
        expect(within(list).getAllByRole('option').map(o => o.querySelector('img') != null)).toEqual([true, false, false, true, false])
        await userEvent.keyboard('{Escape}')
        expect(ring(canvasElement, 'WTMR Transfer-in Accounts')).toEqual([['0x0000…0000', '≈255.01K WTMR', '100.00%']])
        expect(columnTexts(canvasElement, 'Account')).toEqual(['0x0000…0000', '0xacc9…adad'])
        expect(columnTexts(canvasElement, 'Transfer-in Volume')).toEqual(['≈255.01K WTMR', '0 WTMR'])
    },
}

// an account that never moved NUMN opens on its first token, and NUMN is no pick
export const TokenOnly: StoryObj = {
    ...counterparties({account: mapped(), transfers: [], tokenTransfers: tokenTransferRows(2), holdings: [HOLDING], counterparties: TOKEN_PAIRS}),
    play: async ({canvasElement}) => {
        expect(await filterOptions(canvasElement, 'Token')).toEqual(['[WTMR 0xa179…a2e9]'])
        expect(within(canvasElement).getByRole('combobox', {name: 'Token'})).toHaveTextContent(/^WTMR0xa179…a2e9$/)
        expect(within(canvasElement).getByRole('list', {name: 'WTMR Transfer-in Accounts'})).toBeInTheDocument()
    },
}
