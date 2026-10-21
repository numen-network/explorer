import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {CONVICTIONS, delegatedFrom} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import {table} from './DelegationsTable.stories.helpers'

const meta = {title: 'Pages/Account/Governance | Received'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const DelegatorsEmpty: Story = {render: () => table('Delegated from', [])}

export const DelegatorsFilteredEmpty: Story = {render: () => table('Delegated from', [], true)}

// the incoming side weighs each delegator the same way
export const DelegatorsEveryConviction: Story = {
    render: () => table('Delegated from', delegatedFrom(CONVICTIONS.length)),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Conviction')).toEqual(['2x', '3x', '4x', '5x', '6x', '0.1x', '1x'])
        expect(columnTexts(canvasElement, 'Votes')).toEqual(['7,001 NUMN', '9,001.5 NUMN', '10,002 NUMN', '10,002.5 NUMN', '9,003 NUMN', '100.05 NUMN', '500.5 NUMN'])
    },
}
