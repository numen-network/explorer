import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {bounty, CHILD_STATUSES, childBounty} from '../../../../../mock/fixtures/governance.js'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import BountyPage from './page'
import {detail} from './page.stories.helpers'

export default {title: 'Pages/Bounty/Child bounties', ...pageMeta(BountyPage)}

const parent = bounty(12, 'Active')

export const EveryStatus: StoryObj = {
    ...detail(
        parent,
        CHILD_STATUSES.map((status, i) => childBounty(12, i, status)),
        'children'
    ),
    play: async ({canvas}) => {
        const statuses = canvas.getAllByRole('row').slice(1).map(row => row.lastElementChild!.textContent)
        await expect(statuses).toEqual(['Added', 'Curator proposed', 'Active', 'Pending payout', 'Claimed', 'Cancelled'])
    },
}

// a child with no description goes by its number, a long one is cut short before the value column
export const DescriptionEdges = detail(
    parent,
    [childBounty(12, 0, 'Added', {description: null}), childBounty(12, 1, 'Active', {description: 'A child bounty description long enough that the table has to cut it short before the value column'})],
    'children'
)

// a value and payout of nothing, and a value thirty digits long
export const ValueEdges = detail(parent, [childBounty(12, 2, 'Claimed', {value: '0', payout: '0'}), childBounty(12, 3, 'PendingPayout', {value: '123456789012345678901234567890'})], 'children')

const children = Array.from({length: 45}, (_, i) => childBounty(12, i, CHILD_STATUSES[i % CHILD_STATUSES.length]))

export const Many = detail(parent, children, 'children')

export const Page2 = detail(parent, children, 'children', '2')

export const LastPage = detail(parent, children, 'children', lastPage(children.length))
