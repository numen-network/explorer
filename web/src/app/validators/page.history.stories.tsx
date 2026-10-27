import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {validatorEveryStep} from '../../../../mock/fixtures/accounts.js'
import {filterOptions} from '../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../.storybook/page'
import ValidatorsPage from './page'
import {GENESIS, history, withAccount} from './page.stories.helpers'

export default {title: 'Pages/Validators/History', ...pageMeta(ValidatorsPage)}

const titles = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=card] > ol > li')].map(li => li.querySelector('.font-medium')!.textContent)
const labels = (root: HTMLElement) => titles(root).map(t => t!.split(' · ').at(-1))

const at = (id: string, method: string, args: object, timestamp: string, extrinsic: string | null) => {
    const event = {id, indexInBlock: Number(id.split('-')[2]), method, phase: extrinsic == null ? 'Initialization' : 'ApplyExtrinsic', args, extrinsic: extrinsic && {id: extrinsic}, block: {height: Number(id.split('-')[0]), timestamp}}
    return {id, renewals: 0, event, lastEvent: event, genesisLock: null, genesisExempt: null}
}
const [a, b, c, d] = GENESIS.map(g => g.id)
const by = (id: string, step: object) => ({...step, account: {id}})

// mainnet through #307438, the genesis set, four kicks for missed heartbeats
// and four relocks, daily renewals left out
const MAINNET = [
    by(d, at('0000307438-7ae66-000016', 'ValidatorLocked', {who: d, amount: '0', expiryBlock: 1_862_638}, '2026-10-19T11:20:01.158Z', '0000307438-7ae66-000003')),
    by(b, at('0000307438-7ae66-000009', 'ValidatorLocked', {who: b, amount: '0', expiryBlock: 1_862_638}, '2026-10-19T11:20:01.158Z', '0000307438-7ae66-000002')),
    by(c, at('0000307438-7ae66-000002', 'ValidatorLocked', {who: c, amount: '0', expiryBlock: 1_862_638}, '2026-10-19T11:20:01.158Z', '0000307438-7ae66-000001')),
    by(a, at('0000307299-1c428-000002', 'ValidatorLocked', {who: a, amount: '0', expiryBlock: 1_862_499}, '2026-10-19T10:58:43.505Z', '0000307299-1c428-000001')),
    by(c, at('0000298440-46647-000001', 'ValidatorKicked', {who: c, reason: {__kind: 'Offline'}}, '2026-10-18T10:13:11.650Z', null)),
    by(b, at('0000298140-f05ab-000001', 'ValidatorKicked', {who: b, reason: {__kind: 'Offline'}}, '2026-10-18T09:30:11.089Z', null)),
    by(a, at('0000292620-ffde7-000001', 'ValidatorKicked', {who: a, reason: {__kind: 'Offline'}}, '2026-10-17T18:11:11.650Z', null)),
    by(d, at('0000292560-1f5ec-000001', 'ValidatorKicked', {who: d, reason: {__kind: 'Offline'}}, '2026-10-17T18:01:32.081Z', null)),
    ...[d, c, b, a].map(id => by(id, {id: `0000000000-${id}`, renewals: 0, event: null, lastEvent: null, genesisLock: {amount: '0', expiryBlock: 1_555_200}, genesisExempt: true})),
]

const everyStep = validatorEveryStep()
    .filter(s => s.renewals === 0)
    .map((s, i) => withAccount(i + 1, s))

const many = Array.from({length: 45}, (_, i) => everyStep[i % everyStep.length])

export const Empty: StoryObj = {
    ...history([]),
    play: async ({canvas}) => expect(canvas.getByText('None')).toBeVisible(),
}

export const One: StoryObj = {
    ...history([MAINNET[4]]),
    play: async ({canvasElement}) => expect(labels(canvasElement)).toEqual(['Kicked']),
}

export const Mainnet: StoryObj = {
    ...history(MAINNET),
    play: async ({canvasElement}) => {
        await expect(labels(canvasElement)).toEqual(['Locked', 'Locked', 'Locked', 'Locked', 'Kicked', 'Kicked', 'Kicked', 'Kicked', 'Genesis', 'Genesis', 'Genesis', 'Genesis'])
        const first = canvasElement.querySelector<HTMLElement>('[data-slot=card] > ol > li')!
        await expect(within(first).getAllByRole('link')[0]).toHaveAttribute('href', expect.stringMatching(/^\/account\/nu/))
    },
}

// every Validator event and genesis, each on its own validator
export const EveryStep: StoryObj = {
    ...history(everyStep),
    play: async ({canvasElement}) =>
        expect(labels(canvasElement)).toEqual([
            'Exit requested',
            'Exemption granted',
            'Dropped',
            'Locked',
            'Lock released',
            'Kicked',
            'Equivocation reported',
            'Locked',
            'Exemption revoked',
            'Genesis',
        ]),
}

// the options are the events the runtime's metadata declares for the pallet
export const EventFilter: StoryObj = {
    ...history(MAINNET.slice(4, 8), {event: 'ValidatorKicked'}),
    play: async ({canvasElement}) => {
        await expect(within(canvasElement).getByRole('combobox', {name: 'Event'})).toHaveTextContent('ValidatorKicked')
        await expect(await filterOptions(canvasElement, 'Event')).toEqual([
            'All',
            'ValidatorLocked',
            'ValidatorExitRequested',
            '[ValidatorKicked]',
            'LockReleased',
            'EquivocationReported',
            'PendingValidatorDropped',
            'StakeExemptSet',
        ])
    },
}

export const Search: StoryObj = {
    ...history(MAINNET.filter(s => s.account.id === a), {q: 'nu2vadtr'}),
    play: async ({canvas}) => expect(canvas.getByPlaceholderText('Search address or identity')).toHaveValue('nu2vadtr'),
}

export const Many = history(many)

export const LastPage = history(many, {page: lastPage(many.length)})
