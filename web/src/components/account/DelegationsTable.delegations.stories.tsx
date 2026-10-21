import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {CONVICTIONS, delegatingTo} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import {table} from './DelegationsTable.stories.helpers'

const meta = {title: 'Pages/Account/Governance | Delegations'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const One: Story = {render: () => table('Delegating to', delegatingTo(1))}

// None counts a tenth of the capital, LockedNx N times over
export const EveryConviction: Story = {
    render: () => table('Delegating to', delegatingTo(CONVICTIONS.length)),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Conviction')).toEqual(['0.1x', '1x', '2x', '3x', '4x', '5x', '6x'])
        expect(columnTexts(canvasElement, 'Capital')).toEqual(['1,000 NUMN', '2,000.25 NUMN', '3,000.5 NUMN', '4,000.75 NUMN', '5,001 NUMN', '6,001.25 NUMN', '7,001.5 NUMN'])
        expect(columnTexts(canvasElement, 'Votes')).toEqual(['100 NUMN', '2,000.25 NUMN', '6,001 NUMN', '12,002.25 NUMN', '20,004 NUMN', '30,006.25 NUMN', '42,009 NUMN'])
    },
}
