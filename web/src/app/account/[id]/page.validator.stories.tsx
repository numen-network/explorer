import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {JJFU_OFFLINE, MADE_UP_EQUIVOCATION, validatorRow} from '../../../../../mock/fixtures/accounts.js'
import {HEAD} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import {fmtInt} from '@/lib/format'
import AccountPage from './page'
import {wellKnown, story, staked, figure, offenceCounts} from './page.stories.helpers'

export default {title: 'Pages/Account/Validator | Offences', ...pageMeta(AccountPage), decorators: [wellKnown]}

// an active validator that has never missed a heartbeat or signed twice
export const ActiveNoOffences: StoryObj = {
    ...story({account: staked(), validator: validatorRow()}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await expect(figure(canvasElement, 'Status')).toBe('Active')
        await expect(figure(canvasElement, 'Lock expiry')).toBe('Auto-renews')
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

export const Released: StoryObj = {
    ...story({validator: validatorRow({active: false, status: 'Released', lockedAmount: '0', lockExpiry: null, lastActiveSession: 15_210})}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await expect(figure(canvasElement, 'Status')).toBe('Released')
        await expect(figure(canvasElement, 'Lock expiry')).toBe('—')
        await expect(figure(canvasElement, 'Rejoin after')).toBe('—')
    },
}

// still serving out the cooldown the kick set
export const KickedOffline: StoryObj = {
    ...story({account: staked(), validator: validatorRow({active: false, status: 'Kicked', kicked: {__kind: 'Offline'}, rejoinCooldown: HEAD + 7_200}), offences: JJFU_OFFLINE}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await expect(figure(canvasElement, 'Status')).toBe('Kicked · Offline')
        await expect(figure(canvasElement, 'Lock expiry')).toBe(`#${fmtInt(HEAD + 120_960)}`)
        await expect(figure(canvasElement, 'Rejoin after')).toBe(`#${fmtInt(HEAD + 7_200)}`)
    },
}
