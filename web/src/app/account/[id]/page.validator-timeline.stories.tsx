import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {GENESIS_BARE, JJFU_OFFLINE, JJFU_STEPS, validatorEveryStep, validatorLifecycle, validatorRounds, validatorRow} from '../../../../../mock/fixtures/accounts.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, staked} from './page.stories.helpers'

export default {title: 'Pages/Account/Validator | Timeline', ...pageMeta(AccountPage), decorators: [wellKnown]}

const stepTitles = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=card] > ol > li')].map(li => li.querySelector('.font-medium')!.textContent)
const stepRow = (root: HTMLElement, label: string) => within(root).getByText(label, {selector: 'dt'}).nextElementSibling!.textContent

// an exemption, a lock renewed day after day, a kick for going offline and the exemption taken back
export const Lifecycle: StoryObj = {
    ...story({account: staked(), validator: validatorRow({active: false, kicked: {__kind: 'Offline'}}), offences: JJFU_OFFLINE, steps: validatorLifecycle()}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) => {
        await expect(stepTitles(canvasElement)).toEqual(['Exemption revoked', 'Kicked', 'Renewed', 'Locked', 'Exemption granted'])
        await expect(stepRow(canvasElement, 'Renewals')).toBe('29')
        await expect(stepRow(canvasElement, 'Reason')).toBe('Offline')
    },
}

// jJFU joined at genesis, which wrote its lock and exemption without an event
export const Genesis: StoryObj = {
    ...story({account: staked(), validator: validatorRow({lockExpiry: 1_805_760}), steps: JJFU_STEPS}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) => {
        await expect(stepTitles(canvasElement)).toEqual(['Renewed', 'Genesis'])
        const genesis = canvasElement.querySelector<HTMLElement>('[data-slot=card] > ol > li:last-child')!
        await expect(stepRow(genesis, 'Amount')).toBe('0 NUMN')
        await expect(stepRow(genesis, 'Lock expiry')).toBe('1,555,200')
        await expect(stepRow(genesis, 'Stake exempt')).toBe('Yes')
        await expect(within(genesis).getAllByRole('link').map(a => a.textContent)).toEqual(['#0'])
        await expect(stepRow(canvasElement, 'Renewals')).toBe('29')
    },
}

export const GenesisBare: StoryObj = {
    ...story({account: staked(), validator: validatorRow(), steps: GENESIS_BARE}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) => {
        await expect(stepTitles(canvasElement)).toEqual(['Genesis'])
        await expect([...canvasElement.querySelectorAll('dt')].map(d => d.textContent)).toEqual(['Stake exempt'])
        await expect(stepRow(canvasElement, 'Stake exempt')).toBe('No')
    },
}

export const EveryStep: StoryObj = {
    ...story({account: staked(), validator: validatorRow({active: false}), steps: validatorEveryStep()}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) =>
        expect(stepTitles(canvasElement)).toEqual([
            'Exit requested',
            'Exemption granted',
            'Dropped',
            'Locked',
            'Lock released',
            'Kicked',
            'Equivocation reported',
            'Renewed',
            'Locked',
            'Exemption revoked',
            'Genesis',
        ]),
}

export const Many = story({account: staked(), validator: validatorRow(), steps: validatorRounds(7), counts: {validatorSteps: 45}}, {tab: 'validator-timeline'})

// an exemption alone leaves no Validator row, so no tile heads the timeline
export const ExemptOnly: StoryObj = {
    ...story({steps: validatorLifecycle().slice(-1)}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) => {
        await expect(within(canvasElement).queryByText('Offline (30d)')).toBeNull()
        await expect(stepTitles(canvasElement)).toEqual(['Exemption granted'])
    },
}
