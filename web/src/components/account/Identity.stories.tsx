import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {expectOneLine} from '../../../.storybook/fit'
import type {AccountRow} from '@/lib/gql'
import {CHAIN, FULL_FIELDS, RETIRED, subject, subUnder, VERDICTS} from '../../../../mock/fixtures/accounts.js'
import {hashOf, identity, PEOPLE} from '../../../../mock/fixtures.js'
import Identity from './Identity'

const meta = {title: 'Components/Account/Identity'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const card = (traits: object) => (
    <div className="max-w-2xl">
        <Identity a={subject(traits) as AccountRow} chain={CHAIN} retired={RETIRED} />
    </div>
)

const polarisSub = subUnder(PEOPLE[0], 'payouts')

const rowValue = (root: HTMLElement, label: string) => within(root).getByText(label, {selector: 'div'}).nextElementSibling!.textContent

export const Full: Story = {render: () => card(identity('Aurora Labs', FULL_FIELDS))}

export const DisplayOnly: Story = {render: () => card(identity('Aurora Labs'))}

export const Unjudged: Story = {render: () => card(identity('Aurora Labs', {judgements: []}))}

// registrar 3 is retired and the fee paid to it stays reserved. each judgement
// takes a line, the verdicts share one column and the registrars the next
export const EveryVerdict: Story = {
    render: () => card(identity('Aurora Labs', {judgements: VERDICTS})),
    play: async ({canvasElement}) => {
        const list = within(within(canvasElement).getByText('Judgements', {selector: 'div'}).nextElementSibling as HTMLElement)
        const verdicts = VERDICTS.map(kind => list.getByText(kind))
        const registrars = VERDICTS.map((_, i) => list.getByText(`registrar #${i}`))
        const lefts = (els: HTMLElement[]) => new Set(els.map(el => Math.round(el.getBoundingClientRect().left))).size
        expect({verdicts: lefts(verdicts), registrars: lefts(registrars)}).toEqual({verdicts: 1, registrars: 1})
        expectOneLine(...registrars)
    },
}

export const SubOnly: Story = {render: () => card(polarisSub)}

export const SubWithOwnRegistration: Story = {render: () => card({...identity('Aurora Payouts'), ...polarisSub})}

export const WithUsername: Story = {
    render: () => card({...identity('Aurora Labs'), username: 'aurora.numen'}),
    play: async ({canvasElement}) => expect([rowValue(canvasElement, 'Display'), rowValue(canvasElement, 'Username')]).toEqual(['Aurora Labs', 'aurora.numen']),
}

export const UsernameOnly: Story = {
    render: () => card({username: 'aurora.numen'}),
    play: async ({canvas, canvasElement}) => {
        expect(rowValue(canvasElement, 'Username')).toBe('aurora.numen')
        expect(canvas.queryByText('Judgements')).toBeNull()
    },
}

export const WithoutDisplay: Story = {
    render: () => card({...identity(null, FULL_FIELDS), username: 'aurora.numen'}),
    play: async ({canvasElement}) => expect([rowValue(canvasElement, 'Display'), rowValue(canvasElement, 'Username')]).toEqual(['—', 'aurora.numen']),
}

export const SubFiledUnderAHash: Story = {
    render: () => card({...polarisSub, identitySubName: null, identitySubData: {__kind: 'BlakeTwo256', value: hashOf('sub', 1)}}),
    play: async ({canvasElement}) => expect(rowValue(canvasElement, 'Display')).toBe(`Polaris Guild/BlakeTwo256 ${hashOf('sub', 1)}`),
}

export const SubWithoutAName: Story = {render: () => card({...polarisSub, identitySubName: null, identitySubData: {__kind: 'None'}})}
