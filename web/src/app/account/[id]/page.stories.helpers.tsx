import type {Decorator} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {WellKnownProvider} from '@/components/wellKnown'
import {ss58Encode} from '@/lib/ss58'
import {accountPage, delegationActionsOf, funds, PRIME_KEY, subject, SUBJECT, SUBJECT_EVM} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, identity, numn} from '../../../../../mock/fixtures.js'
import {pageStory} from '../../../../.storybook/page'

export const wellKnown: Decorator = Story => (
    <WellKnownProvider treasury={ss58Encode(chainInfo.treasuryAccount, chainInfo.ss58)} prime={ss58Encode(PRIME_KEY.id, chainInfo.ss58)} evmChainId={chainInfo.evmChainId}>
        <Story />
    </WellKnownProvider>
)

export interface Spec {
    account?: {id: string}
    [field: string]: unknown
}

export const build = accountPage as (spec: Spec) => Record<string, unknown>

export const story = (spec: Spec, searchParams: Record<string, string> = {}) => pageStory(build(spec), {params: {id: spec.account?.id ?? SUBJECT}, searchParams})

export const rowValue = (root: HTMLElement, label: string) => {
    const text = within(root).getByText(label, {selector: '[data-slot=amount-label] > span:first-child, div:not([data-slot=amount-label])'})
    return (text.closest('[data-slot=amount-label]') ?? text).nextElementSibling!.textContent
}

export const IDENTITY_DEPOSIT = numn(5.41)
export const FEE_PAID = numn(2.5)
export const AURORA = {judgements: ['Reasonable'], web: 'aurora.example', x: '@aurora_labs', discord: 'auroralabs'}

export const named = (traits = {}) => subject({...identity('Aurora Labs', AURORA), ...funds(numn(48_210.75), IDENTITY_DEPOSIT), ...traits})
export const mapped = (traits = {}) => subject({evmAddress: SUBJECT_EVM, ...traits})
export const lock = (id: string, amount: string) => ({id, amount, reasons: id === 'validatr' ? 'All' : 'Misc'})
export const schedule = (locked: number, perBlock: number, startingBlock: number) => ({locked: numn(locked), perBlock: numn(perBlock), startingBlock})

export const heading = (root: HTMLElement) => within(root).getByRole('heading', {level: 1}).textContent
export const addressLine = (root: HTMLElement) => within(root).getByRole('heading', {level: 1}).parentElement!.nextElementSibling!.textContent
// the tab slugs of a group's strip, in the order they show
export const subTabs = (root: HTMLElement, group: string) =>
    within(within(root).getByRole('navigation', {name: group}))
        .getAllByRole('link')
        .map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab'))

// a badge behind a Tip wears the trigger's data-slot, its variant stays its own
export const badges = (root: HTMLElement) => [...within(root).getByRole('heading', {level: 1}).parentElement!.querySelectorAll<HTMLElement>('span[data-variant]')]
export const roles = (root: HTMLElement) => badges(root).map(b => b.textContent)

export const PARTIAL = schedule(1_000_000, 1, 400_000)

export const staked = () => subject({...funds(numn(100_012_000), '0', numn(100_000_000)), locksJson: [lock('validatr', numn(100_000_000))]})

const figure = (root: HTMLElement, label: string) => [...root.querySelectorAll('[data-slot=card-description]')].find(d => d.textContent === label)!.nextElementSibling!.textContent
export const offenceCounts = async (root: HTMLElement, offline: string, equivocations: string) => {
    await expect(figure(root, 'Offline (30d)')).toBe(offline)
    await expect(figure(root, 'Equivocations (30d)')).toBe(equivocations)
}

export const validatorTabs = (root: HTMLElement) => subTabs(root, 'Validator')
// the tile belongs to the whole group, so it sits above the sub-tab strip
export const tileAboveTabs = (root: HTMLElement) =>
    Boolean(figureLabel(root, 'Status').compareDocumentPosition(within(root).getByRole('navigation', {name: 'Validator'})) & Node.DOCUMENT_POSITION_FOLLOWING)
const figureLabel = (root: HTMLElement, label: string) => [...root.querySelectorAll('[data-slot=card-description]')].find(d => d.textContent === label)!

export const voting = (amount: string) => subject({...funds(numn(1250.5), '0', amount), locksJson: [lock('pyconvot', amount)]})

export const governanceTabs = (root: HTMLElement) =>
    Object.fromEntries(
        within(within(root).getByRole('navigation', {name: 'Governance'}))
            .getAllByRole('link')
            .map(a => [new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab')!, a.getAttribute('aria-current') === 'page'])
    )

// each summary tile above a list, its figures by label
export const summaries = (root: HTMLElement) =>
    [...root.querySelectorAll('[data-slot=card-header]')]
        .filter(h => h.querySelector('[data-slot=card-description]'))
        .map(h => Object.fromEntries([...h.querySelectorAll('[data-slot=card-description]')].map(d => [d.textContent, d.nextElementSibling!.textContent])))

// each link of a tab strip as its tab or mtab, its count and whether it is open
export const strip = (root: HTMLElement, name: string, param: string) =>
    within(within(root).getByRole('navigation', {name}))
        .getAllByRole('link')
        .map(a => [new URL(a.getAttribute('href')!, 'http://x').searchParams.get(param), a.querySelector('[data-slot=badge]')!.textContent, a.getAttribute('aria-current')])

export const bothSides = [...delegationActionsOf(12, 'out'), ...delegationActionsOf(30, 'in')]
