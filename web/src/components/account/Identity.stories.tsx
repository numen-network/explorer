import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, userEvent, within} from 'storybook/test'
import {expectOneLine} from '../../../.storybook/fit'
import {shortHash} from '@/lib/format'
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

const withBio = (bio: string) => {
    const fields = {...FULL_FIELDS, bio}
    return card(identity('Aurora Labs', fields))
}

const rowValue = (root: HTMLElement, label: string) => within(root).getByText(label, {selector: 'div'}).nextElementSibling!.textContent

export const Full: Story = {render: () => card(identity('Aurora Labs', FULL_FIELDS))}

// the row shows the first line of a bio, a bio with nothing past it opens no dialog
export const BioOneLine: Story = {
    render: () => withBio('Validator operator since genesis.'),
    play: async ({canvas, canvasElement}) => {
        expect(rowValue(canvasElement, 'Bio')).toBe('Validator operator since genesis.')
        expect(canvas.queryByRole('button', {name: 'Bio'})).toBeNull()
    },
}

// the dialog leads with the short bio and reads the full one as markdown
export const BioLines: Story = {
    render: () => withBio('Treasury-minded validator\n## Votes\n- **Root** and Treasurer tracks'),
    play: async ({canvas, canvasElement}) => {
        expect(rowValue(canvasElement, 'Bio')).toBe('Treasury-minded validator')
        await userEvent.click(canvas.getByRole('button', {name: 'Bio'}))
        const dialog = await screen.findByRole('dialog')
        expect(dialog.querySelector('p[dir=auto]')!.textContent).toBe('Treasury-minded validator')
        expect(within(dialog).getByRole('heading', {level: 2, name: 'Votes'})).toBeInTheDocument()
        expect(within(dialog).getByText('Root').tagName).toBe('STRONG')
    },
}

// a bio with no first line leaves the row empty and still opens the full bio
export const BioFullOnly: Story = {
    render: () => withBio('\nVotes within a day'),
    play: async ({canvas, canvasElement}) => {
        expect(rowValue(canvasElement, 'Bio')).toBe('—')
        await userEvent.click(canvas.getByRole('button', {name: 'Bio'}))
        const dialog = await screen.findByRole('dialog')
        expect(dialog.querySelector('p[dir=auto]')).toBeNull()
        expect(dialog.querySelector<HTMLElement>('.prose')!.innerText).toBe('Votes within a day')
    },
}

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
    play: async ({canvasElement}) => expect(rowValue(canvasElement, 'Display')).toBe(`Polaris Guild/BlakeTwo256 ${shortHash(hashOf('sub', 1))}`),
}

export const SubWithoutAName: Story = {render: () => card({...polarisSub, identitySubName: null, identitySubData: {__kind: 'None'}})}
