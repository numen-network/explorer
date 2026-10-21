import {HEAD, numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {proposal} from '../../../../../mock/fixtures/governance.js'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {curated, story, curatedCase, treasurySpend} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Call', ...pageMeta(ReferendumPage)}

export const SingleSpend = curatedCase(0, 'call')

export const NonSpend = curatedCase(2, 'call')

const tranches: [string, string, number | null][] = [
    [numn(200_000), PEOPLE[0].id, null],
    [numn(150_000), PEOPLE[1].id, HEAD - 2_000],
    [numn(120_000.25), PEOPLE[2].id, HEAD + 30 * 8640],
    [numn(80_000), PEOPLE[7].id, HEAD + 400 * 8640],
]

export const MultiPayout = story(
    {
        ...curated(6),
        id: '13',
        index: 13,
        title: 'Staged grant paid out in four tranches',
        ...proposal({__kind: 'Utility', value: {__kind: 'batch_all', calls: tranches.map(t => treasurySpend(...t))}}),
    },
    'call'
)

export const BatchTree = story(
    {
        ...curated(5),
        id: '14',
        index: 14,
        title: 'Batch that pays two grants, notes a remark and approves a bounty',
        ...proposal({
            __kind: 'Utility',
            value: {
                __kind: 'batch_all',
                calls: [
                    {__kind: 'System', value: {__kind: 'remark_with_event', remark: '0x6772616e7473'}},
                    {
                        __kind: 'Utility',
                        value: {
                            __kind: 'batch',
                            calls: [
                                {__kind: 'Treasury', value: {__kind: 'spend_local', amount: numn(12_000), beneficiary: {__kind: 'Id', value: PEOPLE[3].id}}},
                                {
                                    __kind: 'Utility',
                                    value: {
                                        __kind: 'force_batch',
                                        calls: [treasurySpend(numn(8_000), PEOPLE[3].id, HEAD + 9 * 8640), {__kind: 'Bounties', value: {__kind: 'approve_bounty', bountyId: 7}}],
                                    },
                                },
                            ],
                        },
                    },
                    {__kind: 'Scheduler', value: {__kind: 'schedule_after', after: 100, maybePeriodic: null, priority: 63, call: {__kind: 'System', value: {__kind: 'remark', remark: '0x'}}}},
                ],
            },
        }),
    },
    'call'
)

export const Unreadable = story(
    {
        ...curated(8),
        id: '15',
        index: 15,
        title: 'Proposal whose preimage was never noted',
        proposalPallet: null,
        proposalMethod: null,
        proposalCalls: null,
        proposalPayouts: null,
        proposalAmount: null,
        proposalBeneficiary: null,
    },
    'call'
)
