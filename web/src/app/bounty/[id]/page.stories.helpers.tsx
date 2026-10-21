import {paged} from '../../../../../mock/fixtures.js'
import {bounty, bountyEvents, eventsById} from '../../../../../mock/fixtures/governance.js'
import {pageStory} from '../../../../.storybook/page'

type Bounty = ReturnType<typeof bounty>

export const detail = (b: Bounty, children: object[] = [], tab = '', page = '1') =>
    pageStory(
        {bounties: [b], childBounties: paged(children), childBountiesConnection: {totalCount: children.length}, events: eventsById(bountyEvents(b))},
        {params: {id: String(b.index)}, searchParams: {tab, page}}
    )
