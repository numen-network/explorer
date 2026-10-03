import {paged} from '../../../../../mock/fixtures.js'
import {bounty, bountyEvents, CHILD_STATUSES, childBounty, eventsById} from '../../../../../mock/fixtures/governance.js'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import BountyPage from './page'

export default {title: 'Pages/Bounty', ...pageMeta(BountyPage)}

type Bounty = ReturnType<typeof bounty>

const detail = (b: Bounty, children: object[] = [], tab = '', page = '1') =>
    pageStory(
        {bounties: [b], childBounties: paged(children), childBountiesConnection: {totalCount: children.length}, events: eventsById(bountyEvents(b))},
        {params: {id: String(b.index)}, searchParams: {tab, page}}
    )

export const Proposed = detail(bounty(9, 'Proposed'))

export const Approved = detail(bounty(8, 'Approved'))

export const ApprovedWithCurator = detail(bounty(7, 'ApprovedWithCurator'))

export const Funded = detail(bounty(6, 'Funded'))

export const CuratorProposed = detail(bounty(5, 'CuratorProposed'))

export const Active = detail(bounty(4, 'Active'))

export const PendingPayout = detail(bounty(3, 'PendingPayout'))

export const Claimed = detail(bounty(2, 'BountyClaimed'))

export const Rejected = detail(bounty(1, 'BountyRejected'))

export const Canceled = detail(bounty(0, 'BountyCanceled'))

export const NullableFieldsEmpty = detail(bounty(10, 'BountyRejected', {description: null, proposer: null, fee: null, value: '0'}))

export const LongDescription = detail(
    bounty(11, 'Active', {
        description:
            'Keep the community archive node, the snapshot mirror and the public RPC endpoint running for twelve months, publish monthly uptime reports with the raw probe data, rotate the TLS certificates before they expire, and hand the whole setup over with written runbooks at the end of the term so the next curator can pick it up without a single call',
        value: '987654321098765432109876543210',
    })
)

const parent = bounty(12, 'Active')

export const ChildBountiesEveryStatus = detail(
    parent,
    CHILD_STATUSES.map((status, i) => childBounty(12, i, status)),
    'children'
)

export const ChildBountiesEdgeCases = detail(
    parent,
    [
        childBounty(12, 0, 'Added', {description: null}),
        childBounty(12, 1, 'Active', {description: 'A child bounty description long enough that the table has to cut it short before the value column'}),
        childBounty(12, 2, 'Claimed', {value: '0', payout: '0'}),
        childBounty(12, 3, 'PendingPayout', {value: '123456789012345678901234567890'}),
    ],
    'children'
)

const children = Array.from({length: 45}, (_, i) => childBounty(12, i, CHILD_STATUSES[i % CHILD_STATUSES.length]))

export const ChildBountiesMany = detail(parent, children, 'children')

export const ChildBountiesPage2 = detail(parent, children, 'children', '2')

export const ChildBountiesLastPage = detail(parent, children, 'children', lastPage(children.length))
