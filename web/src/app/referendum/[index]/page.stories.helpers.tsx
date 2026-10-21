import type {StoryObj} from '@storybook/nextjs-vite'
import {within} from 'storybook/test'
import type {RawStep} from '@/components/timeline'
import data, {referenda} from '../../../../../mock/data.js'
import {at, block, numn, paged, PEOPLE} from '../../../../../mock/fixtures.js'
import {accounts, actionLog, anon, castFromSnapshots, castVotes, delegatedVoteData, delegation, eventsById, metadataAction, metadataEvents, proposal, snapshots, split, splitAbstain, standard, step, stepEvents, voteData, votingAction, withImpact} from '../../../../../mock/fixtures/governance.js'
import {pageStory} from '../../../../.storybook/page'

export interface Referendum {
    index: number
    snapshots: object[]
    deposits: object[]
    [field: string]: unknown
}
type Text = ReturnType<typeof metadataAction>
export type Play = StoryObj['play']

export const curated = (index: number): Referendum => referenda.find(r => r.index === index)!

export const story = (r: Referendum, tab: string, extra: Record<string, unknown> = {}, texts: Text[] = [], query: Record<string, string> = {}) =>
    pageStory(
        {
            ...data,
            accounts,
            // the block the proposal was submitted in, which the call args are read against
            blocks: (args: {where?: {height_eq?: number}}) => (args.where?.height_eq === r.submittedAt ? [block(r.submittedAt)] : data.blocks()),
            referendums: [r],
            referendumTallySnapshots: paged(r.snapshots),
            metadataActions: paged(texts),
            metadataActionsConnection: {totalCount: texts.length},
            events: eventsById(stepEvents(r), metadataEvents(texts)),
            ...extra,
        },
        {params: {index: String(r.index)}, searchParams: {tab, ...query}}
    )

// a curated case on its curves tab, with one vote per move its tally history made
export const curatedCase = (index: number, tab = 'curves') => story(curated(index), tab, castFromSnapshots(curated(index)))

export const cast = (r: Referendum, votes: object[], tab: string, extra: Record<string, unknown> = {}, delegated: object[] = [], query: Record<string, string> = {}) => {
    const {referendum, ...log} = castVotes(r, votes, delegated)
    return story(referendum, tab, {...log, ...extra}, [], query)
}

export const withPlay = (s: StoryObj, play: Play): StoryObj => ({...s, play})

// the queries bound to the card under a title
export const card = (root: HTMLElement, title: string) => within(within(root).getByText(title).closest<HTMLElement>('[data-slot=card]')!)

export const markdownPitch = `Pays a pilot cohort of **three** community teams, see the [forum thread](https://forum.example.com/t/42).

## Budget

| Team | Amount |
| --- | ---: |
| Docs | 12,000 NUMN |
| Tooling | 30,000 NUMN |

- monthly reports
- unspent funds go back to the treasury`

interface Deposit {
    kind: string
    who: {id: string}
    amount: string
    state: string
}

// the submission deposit and the decision deposit its submitter placed, both in one state
const bothDeposits = (r: Referendum, state: string) => {
    const [submission] = r.deposits as Deposit[]
    return [
        {...submission, state},
        {...submission, kind: 'Decision', amount: (r.track as {decisionDeposit: string}).decisionDeposit, state},
    ]
}

export const approvedRefunded = {...curated(0), deposits: bothDeposits(curated(0), 'Refunded')}

// both deposits stay held after the end until somebody asks for the refund
export const approvedHeld = {
    ...curated(0),
    id: '27',
    index: 27,
    title: 'Approved with both deposits still held',
    deposits: bothDeposits(curated(0), 'Held'),
    timeline: (curated(0).timeline as RawStep[]).filter(s => !s.name.endsWith('DepositRefunded')),
}

export const treasurySpend = (amount: string, beneficiary: string, validFrom: number | null) => ({
    __kind: 'Treasury',
    value: {__kind: 'spend', assetKind: null, amount, beneficiary, validFrom},
})

export const PREIMAGE = '0x4f2c9d07a1b3e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e'
export const refundTitle = `Refund the deposit locked under preimage ${PREIMAGE}`
export const refundPitch = `Preimage ${PREIMAGE} was noted twice, so this pays back the second deposit.`

// approved on its second confirmation, the first one aborted when nays came in
export const secondAttempt = {
    ...curated(0),
    id: '17',
    index: 17,
    title: 'Approved on its second confirmation after the first one aborted',
    submittedAt: 700_000,
    submittedTimestamp: at(700_000),
    status: 'Approved',
    decidingSince: 701_440,
    confirmingSince: 735_000,
    endedAt: 743_640,
    ayes: numn(6_500_000),
    nays: numn(1_900_000),
    support: numn(5_200_000),
    deposits: curated(0).deposits.map(d => ({...d, state: 'Refunded'})),
    timeline: [
        step('Referenda.Submitted', 700_000, 3),
        step('Referenda.DecisionDepositPlaced', 700_050, 4),
        step('Referenda.DecisionStarted', 701_440, 0),
        step('Referenda.ConfirmStarted', 720_000, 0),
        step('Referenda.ConfirmAborted', 724_000, 0),
        step('Referenda.ConfirmStarted', 735_000, 0),
        step('Referenda.Confirmed', 743_640, 0),
        {...step('Scheduler.Dispatched', 752_280, 0), error: null},
        step('Referenda.SubmissionDepositRefunded', 760_000, 2),
        step('Referenda.DecisionDepositRefunded', 760_000, 3),
    ],
    snapshots: snapshots([
        [700_100, 500_000, 0, 400_000],
        [701_440, 500_000, 0, 400_000],
        [715_000, 2_600_000, 300_000, 3_000_000],
        [723_500, 2_600_000, 1_900_000, 3_000_000],
        [733_000, 6_500_000, 1_900_000, 5_200_000],
        [743_640, 6_500_000, 1_900_000, 5_200_000],
    ]),
}

export const deciding = (index: number, title: string) => ({...curated(5), id: String(index), index, title})

export const single = deciding(19, 'A single conviction vote decides the tally so far')
export const singleVote = [{...standard(PEOPLE[0], true, 'Locked3x', numn(1_000_000)), block: 952_000}]

// every way to vote, delegate and take it back, with the tally after each block
export const [alice, bob, carol, dave, erin, frank, grace] = [PEOPLE[0], PEOPLE[1], PEOPLE[2], PEOPLE[3], PEOPLE[5], PEOPLE[9], PEOPLE[6]]
const aliceVote = standard(alice, true, 'Locked2x', numn(400_000))
const bobFirst = standard(bob, false, 'Locked1x', numn(300_000))
const bobNow = standard(bob, false, 'Locked4x', numn(300_000))
const carolVote = split(carol, numn(100_000), numn(50_000))
const daveVote = splitAbstain(dave, numn(20_000), numn(20_000), numn(200_000))
const erinVote = standard(erin, true, 'None', numn(500_000))
const graceDelegation = delegation(grace, alice, 'Locked6x', numn(50_000), '32')
const everyVotes = [aliceVote, bobNow, carolVote, daveVote]

const everySnapshots = snapshots([
    [952_000, 800_000, 0, 400_000],
    [954_000, 800_000, 300_000, 400_000],
    [956_000, 812_000, 307_000, 720_000],
    [960_000, 1_262_000, 307_000, 870_000],
    [962_000, 1_312_000, 307_000, 1_370_000],
    [964_000, 1_262_000, 307_000, 870_000],
    [966_000, 812_000, 307_000, 720_000],
    [967_000, 1_112_000, 307_000, 770_000],
    [968_000, 1_112_000, 307_000, 770_000],
    [970_000, 1_112_000, 1_207_000, 770_000],
])

// a delegation row carries the standing vote of the target it moves, the two
// votes in block 956,000 share that block's move on the later one
const everyRow = (block: number, index: number, method: string, vote: object, extra: object = {}) => votingAction(12, block, index, method, vote, extra)
export const everyRows = withImpact(
    [
        everyRow(970_000, 3, 'Voted', bobNow),
        everyRow(968_000, 3, 'Voted', aliceVote, {delegatedVotes: numn(300_000)}),
        everyRow(967_000, 3, 'Delegated', aliceVote, {delegator: grace, delegatedVotes: numn(300_000)}),
        everyRow(966_000, 3, 'Undelegated', aliceVote, {delegator: frank}),
        everyRow(964_000, 3, 'VoteRemoved', erinVote),
        everyRow(962_000, 3, 'Voted', erinVote),
        everyRow(960_000, 3, 'Delegated', aliceVote, {delegator: frank, delegatedVotes: numn(450_000)}),
        everyRow(956_000, 4, 'Voted', daveVote),
        everyRow(956_000, 3, 'Voted', carolVote),
        everyRow(954_000, 3, 'Voted', bobFirst),
        everyRow(952_000, 3, 'Voted', aliceVote),
    ],
    everySnapshots
)

export const everyAction = {
    referendum: {
        ...deciding(12, 'Every kind of voting action, from split votes to delegations'),
        ayes: numn(1_112_000),
        nays: numn(1_207_000),
        support: numn(770_000),
        snapshots: everySnapshots,
    },
    data: {
        ...voteData(12, everyVotes),
        ...actionLog(everyRows),
        ...delegatedVoteData(12, everyVotes, [graceDelegation]),
    },
}

const CONVICTIONS = ['None', 'Locked1x', 'Locked2x', 'Locked3x', 'Locked4x', 'Locked5x', 'Locked6x']

export const convictionVotes = CONVICTIONS.flatMap((conviction, i) => [
    {...standard(PEOPLE[i], true, conviction, numn(300_000 - i * 1_000)), block: 962_000 + i * 2_000},
    {...standard(anon(40 + i), false, conviction, numn(50_000 - i * 1_000)), block: 963_000 + i * 2_000},
])

// every list runs past two pages, the splits repeat aye parts so their nay parts break the ties
export const manyVotes = [
    ...Array.from({length: 220}, (_, i) => ({...standard(i < 10 ? PEOPLE[i] : anon(100 + i), i % 3 !== 2, CONVICTIONS[i % 7], numn(2_000 + ((i * 7919) % 60_000))), block: 952_000 + i * 120})),
    ...Array.from({length: 47}, (_, i) => ({...split(anon(400 + i), numn(10_000 * (1 + ((i * 7) % 12))), numn(1_000 + ((i * 7919) % 90_000))), block: 980_000 + i * 50})),
    ...Array.from({length: 45}, (_, i) => {
        const side = i % 4 === 0 ? numn(5_000 + i * 100) : '0'
        return {...splitAbstain(anon(500 + i), side, side, numn(2_000 + ((i * 7919) % 150_000))), block: 983_000 + i * 50}
    }),
]

export const many = deciding(21, 'Three hundred and twelve voters on one referendum')

export const anons = (from: number, count: number) => Array.from({length: count}, (_, i) => anon(from + i))

export const delegators = (target: object, whos: object[], most = 90_000) => whos.map((who, i) => delegation(who, target, CONVICTIONS[(i * 3) % 7], numn(1 + ((i * 7919) % most)), '31'))

const delegated = [PEOPLE[5], PEOPLE[3], PEOPLE[0]]
export const delegatedVotes = delegated.map((voter, i) => ({...standard(voter, true, 'Locked2x', numn(900_000 - i * 150_000)), block: 962_000 + i * 1_000}))
export const delegatedRef = {...curated(6), id: '22', index: 22}

export const fewAndMany = [...delegators(PEOPLE[3], anons(60, 3)), ...delegators(PEOPLE[0], [anon(70), anon(71), PEOPLE[7], ...anons(73, 10)])]

const hugeSpend = '9999999999999999999999999'

export const extremeAmounts = (tab: string) =>
    cast(
        {
            ...deciding(18, refundTitle),
            ...proposal(treasurySpend(hugeSpend, PEOPLE[7].id, null)),
        },
        [
            {...standard(PEOPLE[7], true, 'Locked1x', numn(52_000_000)), block: 975_000},
            {...standard(anon(9), false, 'None', '10'), block: 976_000},
        ],
        tab
    )
