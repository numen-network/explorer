import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import type {DelegationRow} from '@/lib/gql'
import {CONVICTIONS, delegatedFrom} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import type {Sorting} from './DelegationsTable'
import {table} from './DelegationsTable.stories.helpers'

const meta = {title: 'Pages/Account/Governance | Received'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

// the delegator list always sorts by its headings, capital biggest first by default
const BY_CAPITAL: Sorting = {
    by: 'capital',
    dir: 'desc',
    hrefs: {
        conviction: '/account/x?tab=received&rtab=delegators&sort=conviction&order=desc',
        capital: '/account/x?tab=received&rtab=delegators&sort=capital&order=asc',
        votes: '/account/x?tab=received&rtab=delegators&sort=votes&order=desc',
        since: '/account/x?tab=received&rtab=delegators&sort=since&order=desc',
    },
}

const delegators = (rows: DelegationRow[], filtered?: boolean) => table('Delegated from', rows, filtered, BY_CAPITAL)

export const DelegatorsEmpty: Story = {render: () => delegators([])}

export const DelegatorsFilteredEmpty: Story = {render: () => delegators([], true)}

// the incoming side weighs each delegator the same way
export const DelegatorsEveryConviction: Story = {
    render: () => delegators(delegatedFrom(CONVICTIONS.length)),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Conviction')).toEqual(['2x', '3x', '4x', '5x', '6x', '0.1x', '1x'])
        expect(columnTexts(canvasElement, 'Votes')).toEqual(['7,001 NUMN', '9,001.5 NUMN', '10,002 NUMN', '10,002.5 NUMN', '9,003 NUMN', '100.05 NUMN', '500.5 NUMN'])
    },
}
