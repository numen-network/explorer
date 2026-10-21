import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {JJFU_OFFLINE, MADE_UP_EQUIVOCATION, validatorRow} from '../../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, staked, offenceCounts, validatorTabs, tileAboveTabs} from './page.stories.helpers'

export default {title: 'Pages/Account/Validator | Offences', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const Active: StoryObj = {
    ...story({account: staked(), validator: validatorRow()}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await offenceCounts(canvasElement, '0', '0')
        await expect(within(canvasElement).getByText('No offences yet.')).toBeVisible()
        await expect(within(canvasElement).getByRole('navigation', {name: 'pagination'})).toBeVisible()
        await expect(validatorTabs(canvasElement)).toEqual(['validator'])
        await expect(within(within(canvasElement).getByRole('navigation', {name: 'Validator'})).getByRole('link')).toHaveAccessibleName(/^Offences/)
        await expect(tileAboveTabs(canvasElement)).toBe(true)
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

export const Inactive = story({validator: validatorRow({active: false, lockedAmount: '0', lockExpiry: null, lastActiveSession: 15_210})}, {tab: 'validator'})

export const Kicked = story({account: staked(), validator: validatorRow({active: false, kicked: {__kind: 'Offline'}}), offences: JJFU_OFFLINE}, {tab: 'validator'})
