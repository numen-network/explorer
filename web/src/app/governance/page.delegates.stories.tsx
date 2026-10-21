import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import data, {referenda, referendaCount} from '../../../../mock/data.js'
import {acct, chainInfo, identity, numn, PEOPLE} from '../../../../mock/fixtures.js'
import {listed} from '../../../../mock/fixtures/governance.js'
import {columnTexts} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import {fmtBalance} from '@/lib/format'
import GovernancePage from './page'

export default {title: 'Pages/Governance/Delegates', ...pageMeta(GovernancePage)}

interface Delegate {
    id: string
    account: object
    delegators: number
    tracks: number
    delegated: string
    voted: number
}

const delegate = (account: {id: string}, traits: Partial<Delegate> = {}): Delegate => ({id: account.id, account, delegators: 1, tracks: 1, delegated: numn(100), voted: 0, ...traits})

const delegatesTab = (rows: Delegate[], refs = referenda): StoryObj =>
    pageStory(
        {
            ...data,
            referendumsConnection: referendaCount(refs),
            delegates: listed(rows),
            delegatesConnection: {totalCount: rows.length},
            votesConnection: ({where}: {where: {voter: {id_eq: string}}}) => ({totalCount: rows.find(d => d.id === where.voter.id_eq)!.voted}),
        },
        {searchParams: {tab: 'delegates'}}
    )

export const Empty: StoryObj = {
    ...delegatesTab([]),
    play: async ({canvas}) => expect(canvas.getByText('No delegates yet.')).toBeInTheDocument(),
}

export const One = delegatesTab([delegate(PEOPLE[0], {delegators: 4, tracks: 2, delegated: numn(12_500.75), voted: 3})])

// an account without an identity, nothing delegated, every track, the largest
// counts the columns hold and a delegate that voted on every referendum
const EVERY_CASE = [
    delegate(PEOPLE[0], {delegators: 2_147_483_647, tracks: 9, delegated: (2n ** 128n - 1n).toString(), voted: referenda.length}),
    delegate(PEOPLE[1], {delegators: 7, tracks: 9, delegated: numn(1_820_004.55), voted: 4}),
    delegate(PEOPLE[7], {delegators: 5, tracks: 1, delegated: numn(640_000), voted: 1}),
    delegate(PEOPLE[2], {delegators: 1, tracks: 3, delegated: '0', voted: 0}),
]

export const EveryCase: StoryObj = {
    ...delegatesTab(EVERY_CASE),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Delegators')).toEqual(['2,147,483,647', '7', '5', '1'])
        expect(columnTexts(canvasElement, 'Tracks')).toEqual(['9', '9', '1', '3'])
        expect(columnTexts(canvasElement, 'Delegated')).toEqual(EVERY_CASE.map(d => fmtBalance(d.delegated, chainInfo.decimals, chainInfo.symbol)))
        expect(columnTexts(canvasElement, 'Voted')).toEqual([referenda.length, 4, 1, 0].map(n => `${n} / ${referenda.length}`))
    },
}

export const Many = delegatesTab(Array.from({length: 40}, (_, i) => delegate(acct(100 + i, identity(`Delegate ${i}`)), {delegators: 40 - i, delegated: numn((40 - i) * 1000)})))
