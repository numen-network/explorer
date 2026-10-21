import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {bounty} from '../../../../../mock/fixtures/governance.js'
import {pageMeta} from '../../../../.storybook/page'
import BountyPage from './page'
import {detail} from './page.stories.helpers'

export default {title: 'Pages/Bounty/Overview', ...pageMeta(BountyPage)}

export const Proposed = detail(bounty(9, 'Proposed'))

export const Approved = detail(bounty(8, 'Approved'))

export const ApprovedWithCurator = detail(bounty(7, 'ApprovedWithCurator'))

export const Funded = detail(bounty(6, 'Funded'))

export const CuratorProposed = detail(bounty(5, 'CuratorProposed'))

export const Active = detail(bounty(4, 'Active'))

export const PendingPayout = detail(bounty(3, 'PendingPayout'))

export const Claimed = detail(bounty(2, 'BountyClaimed'))

export const Rejected = detail(bounty(1, 'BountyRejected'))

// the chain calls it BountyCanceled, the badge reads cancelled
export const Canceled: StoryObj = {
    ...detail(bounty(0, 'BountyCanceled')),
    play: async ({canvas}) => expect(canvas.getByRole('heading', {level: 1}).nextElementSibling).toHaveTextContent(/^Bounty cancelled$/),
}

export const NullableFieldsEmpty = detail(bounty(10, 'BountyRejected', {description: null, proposer: null, fee: null, value: '0'}))

export const LongDescription = detail(
    bounty(11, 'Active', {
        description:
            'Keep the community archive node, the snapshot mirror and the public RPC endpoint running for twelve months, publish monthly uptime reports with the raw probe data, rotate the TLS certificates before they expire, and hand the whole setup over with written runbooks at the end of the term so the next curator can pick it up without a single call',
    })
)

export const HugeValue = detail(bounty(11, 'Active', {value: '987654321098765432109876543210'}))
