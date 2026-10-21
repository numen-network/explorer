import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {JJFU_OFFLINE, MADE_UP_EQUIVOCATION, validatorRow} from '../../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, staked, figure, offenceCounts} from './page.stories.helpers'

export default {title: 'Pages/Account/Validator | Offences', ...pageMeta(AccountPage), decorators: [wellKnown]}

// an active validator that has never missed a heartbeat or signed twice
export const ActiveNoOffences: StoryObj = {
    ...story({account: staked(), validator: validatorRow()}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await expect(figure(canvasElement, 'Status')).toBe('Active')
        await offenceCounts(canvasElement, '0', '0')
        await expect(within(canvasElement).getByText('No offences yet.')).toBeVisible()
    },
}

// jJFU missed heartbeats at #292560 and #292620 on mainnet
export const OfflineInWindow: StoryObj = {
    ...story({account: staked(), validator: validatorRow(), offences: JJFU_OFFLINE}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await offenceCounts(canvasElement, '2', '0')
        await expect(columnTexts(canvasElement, 'Kind')).toEqual(['Offline', 'Offline'])
    },
}

// thirty days on, both misses are still listed but no longer counted
export const OfflineOutsideWindow: StoryObj = {
    ...story({account: staked(), validator: validatorRow(), offences: JJFU_OFFLINE, counts: {Offline: 0}}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await offenceCounts(canvasElement, '0', '0')
        await expect(columnTexts(canvasElement, 'Kind')).toEqual(['Offline', 'Offline'])
    },
}

export const OfflineAndEquivocation: StoryObj = {
    ...story({account: staked(), validator: validatorRow(), offences: [MADE_UP_EQUIVOCATION, ...JJFU_OFFLINE]}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await offenceCounts(canvasElement, '2', '1')
        await expect(columnTexts(canvasElement, 'Kind')).toEqual(['Equivocation', 'Offline', 'Offline'])
    },
}

export const Inactive: StoryObj = {
    ...story({validator: validatorRow({active: false, lockedAmount: '0', lockExpiry: null, lastActiveSession: 15_210})}, {tab: 'validator'}),
    play: async ({canvasElement}) => expect(figure(canvasElement, 'Status')).toBe('Inactive'),
}

export const KickedOffline: StoryObj = {
    ...story({account: staked(), validator: validatorRow({active: false, kicked: {__kind: 'Offline'}}), offences: JJFU_OFFLINE}, {tab: 'validator'}),
    play: async ({canvasElement}) => expect(figure(canvasElement, 'Status')).toBe('Kicked · Offline'),
}
