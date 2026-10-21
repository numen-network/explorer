import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {fmtSpan} from '@/lib/format'
import {funds, proxyDelegates, proxyDelays, proxyFor, subject} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, numn, person} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story} from './page.stories.helpers'

export default {title: 'Pages/Account/Proxies', ...pageMeta(AccountPage), decorators: [wellKnown]}

const proxied = (n: number) => subject({...funds(numn(1250.5), numn(1.75 * n)), depositsJson: [{id: 'proxy', amount: numn(1.75 * n)}]})

export const Out = story({account: proxied(1), proxiesOut: proxyDelegates(1)}, {tab: 'proxies'})

export const In = story({proxiesIn: proxyFor(2)}, {tab: 'proxies'})

// the same account as an Any proxy twice, told apart by the delay alone
export const SameDelegateTwoDelays: StoryObj = {
    ...story({account: proxied(2), proxiesOut: proxyDelays(person(1), 'Any', [0, 14_400])}, {tab: 'proxies'}),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Delegates to')).toEqual(['Orbit Labs', 'Orbit Labs'])
        await expect(columnTexts(canvasElement, 'Type')).toEqual(['Any', 'Any'])
        await expect(columnTexts(canvasElement, 'Delay')).toEqual(['—', `14,400 blocks ≈ ${fmtSpan(14_400 * chainInfo.blockTime)}`])
    },
}

export const Both = story({account: proxied(9), proxiesOut: proxyDelegates(9), proxiesIn: proxyFor(3)}, {tab: 'proxies'})

export const InMany = story({proxiesIn: proxyFor(45)}, {tab: 'proxies'})

export const InPage2 = story({proxiesIn: proxyFor(45)}, {tab: 'proxies', page: '2'})

export const InLastPage = story({proxiesIn: proxyFor(45)}, {tab: 'proxies', page: lastPage(45)})
