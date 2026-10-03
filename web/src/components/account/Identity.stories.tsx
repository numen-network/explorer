import type {Meta, StoryObj} from '@storybook/nextjs-vite'
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

export const Full: Story = {render: () => card(identity('Aurora Labs', FULL_FIELDS))}

export const DisplayOnly: Story = {render: () => card(identity('Aurora Labs'))}

export const Unjudged: Story = {render: () => card(identity('Aurora Labs', {judgements: []}))}

// registrar 3 is retired and the fee paid to it stays reserved
export const EveryVerdict: Story = {render: () => card(identity('Aurora Labs', {judgements: VERDICTS}))}

export const SubOnly: Story = {render: () => card(polarisSub)}

export const SubWithOwnRegistration: Story = {render: () => card({...identity('Aurora Payouts'), ...polarisSub})}

export const SubFiledUnderAHash: Story = {
    render: () => card({...polarisSub, identitySubName: null, identitySubData: {__kind: 'BlakeTwo256', value: hashOf('sub', 1)}}),
}

export const SubWithoutAName: Story = {render: () => card({...polarisSub, identitySubName: null, identitySubData: {__kind: 'None'}})}
