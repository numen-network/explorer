import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor, within} from 'storybook/test'
import data, {referenda} from '../../../../../mock/data.js'
import {at, HEAD, numn, paged, PEOPLE} from '../../../../../mock/fixtures.js'
import {
    accounts,
    anon,
    castFromSnapshots,
    castVotes,
    delegation,
    delegationAction,
    delegationData,
    eventsById,
    metadataAction,
    metadataEvents,
    proposal,
    snapshots,
    split,
    splitAbstain,
    standard,
    step,
    stepEvents,
    voteAction,
    voteData,
} from '../../../../../mock/fixtures/governance.js'
import type {RawStep} from '@/components/timeline'
import {DESKTOP, expectFits, expectLegibleAxes, expectNoHangingDots, expectTimesFit, expectWholeWords, lastTooltipLines, PHONE} from '../../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import ReferendumPage from './page'

export default {title: 'Pages/Referendum', ...pageMeta(ReferendumPage)}

interface Referendum {
    index: number
    snapshots: object[]
    [field: string]: unknown
}
type Text = ReturnType<typeof metadataAction>
type Play = StoryObj['play']

const curated = (index: number): Referendum => referenda.find(r => r.index === index)!

const story = (r: Referendum, tab: string, extra: Record<string, unknown> = {}, texts: Text[] = [], query: Record<string, string> = {}) =>
    pageStory(
        {
            ...data,
            accounts,
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
const curatedCase = (index: number, tab = 'curves') => story(curated(index), tab, castFromSnapshots(curated(index)))

const cast = (r: Referendum, votes: object[], tab: string, extra: Record<string, unknown> = {}, delegated: object[] = [], query: Record<string, string> = {}) => {
    const {referendum, ...log} = castVotes(r, votes, delegated)
    return story(referendum, tab, {...log, ...extra}, [], query)
}

// the votes tab opened on the list and page the query names
const castAt = (r: Referendum, votes: object[], query: Record<string, string>) => cast(r, votes, 'votes', {}, [], query)

const withPlay = (s: StoryObj, play: Play): StoryObj => ({...s, play})

const expandRow = (label: string): Play => async ({canvas, userEvent}) => {
    const row = (await canvas.findAllByText(label)).map(el => el.closest('tr')).find(tr => tr != null)!
    await userEvent.click(within(row).getByRole('button', {name: 'expand'}))
}

const expandAll: Play = async ({canvas, userEvent}) => {
    for (const button of await canvas.findAllByRole('button', {name: 'expand'})) await userEvent.click(button)
}

export const TimedOutAfterVotes = curatedCase(11)

export const ApprovedAfterLongLeadIn = curatedCase(10)

export const VotingInPreparePeriod = curatedCase(9)

export const WaitingForDecisionDeposit = curatedCase(8)

export const SubmittedWithoutVotes = curatedCase(7)

// the aye tally ends exactly on the last digit the card shows
export const Confirming = withPlay(curatedCase(6), async ({canvas}) => {
    const tally = within(canvas.getByText('Tally').closest<HTMLElement>('[data-slot=card]')!)
    await expect(tally.getByText('5.1M NUMN')).toBeInTheDocument()
})

export const DecidingBelowCurves = curatedCase(5)

export const KilledWithDepositsSlashed = curatedCase(4)

export const TimedOutWithoutTitle = curatedCase(3)

export const CancelledNonSpend = curatedCase(2)

export const RejectedAtEnd = curatedCase(1)

export const ApprovedAndEnacted = curatedCase(0)

export const CallSingleSpend = curatedCase(0, 'call')

export const CallNonSpend = curatedCase(2, 'call')

const treasurySpend = (amount: string, beneficiary: string, validFrom: number | null) => ({
    __kind: 'Treasury',
    value: {__kind: 'spend', assetKind: null, amount, beneficiary, validFrom},
})

const tranches: [string, string, number | null][] = [
    [numn(200_000), PEOPLE[0].id, null],
    [numn(150_000), PEOPLE[1].id, HEAD - 2_000],
    [numn(120_000.25), PEOPLE[2].id, HEAD + 30 * 8640],
    [numn(80_000), PEOPLE[7].id, HEAD + 400 * 8640],
]

export const CallMultiPayout = story(
    {
        ...curated(6),
        id: '13',
        index: 13,
        title: 'Staged grant paid out in four tranches',
        ...proposal(
            [
                {pallet: 'Utility', method: 'batch_all', depth: 0},
                ...tranches.map(([amount, beneficiary, validFrom]) => ({pallet: 'Treasury', method: 'spend', depth: 1, amount, beneficiary, validFrom})),
            ],
            {calls: tranches.map(t => treasurySpend(...t))}
        ),
    },
    'call'
)

export const CallBatchTree = story(
    {
        ...curated(5),
        id: '14',
        index: 14,
        title: 'Batch that pays two grants, notes a remark and approves a bounty',
        ...proposal(
            [
                {pallet: 'Utility', method: 'batch_all', depth: 0},
                {pallet: 'System', method: 'remark_with_event', depth: 1},
                {pallet: 'Utility', method: 'batch', depth: 1},
                {pallet: 'Treasury', method: 'spend_local', depth: 2, amount: numn(12_000), beneficiary: PEOPLE[3].id, validFrom: null},
                {pallet: 'Utility', method: 'force_batch', depth: 2},
                {pallet: 'Treasury', method: 'spend', depth: 3, amount: numn(8_000), beneficiary: PEOPLE[3].id, validFrom: HEAD + 9 * 8640},
                {pallet: 'Bounties', method: 'approve_bounty', depth: 3, bounty: 7},
                {pallet: 'Scheduler', method: 'schedule_after', depth: 1},
            ],
            {
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
            }
        ),
    },
    'call'
)

export const CallUnreadable = story(
    {
        ...curated(8),
        id: '15',
        index: 15,
        title: 'Proposal whose preimage was never noted',
        proposalPallet: null,
        proposalMethod: null,
        proposalArgs: null,
        proposalCalls: null,
        proposalAmount: null,
        proposalBeneficiary: null,
    },
    'call'
)

// each depositor shares the first line of its row with the deposit
const depositorsInline: Play = async ({canvas}) => {
    for (const label of ['Submission deposit', 'Decision deposit']) {
        const value = (await canvas.findByText(label)).nextElementSibling as HTMLElement
        expect(within(value).getByRole('link').getBoundingClientRect().top).toBeCloseTo(value.getBoundingClientRect().top, 0)
    }
}

export const MetadataEveryField = withPlay(curatedCase(6, 'metadata'), depositorsInline)

export const MetadataEveryFieldOnPhone = withPlay({...curatedCase(6, 'metadata'), globals: PHONE}, async context => {
    await depositorsInline(context)
    expectNoHangingDots(context.canvasElement)
})

export const MetadataEmptyFields = story(
    {...curated(7), id: '16', index: 16, origin: null, proposalHash: null, submitter: null, submissionDepositor: null, submissionDeposit: null},
    'metadata'
)

export const MetadataApproved = withPlay(curatedCase(0, 'metadata'), async ({canvas}) => {
    await expect(canvas.getByText('Approved')).toBeInTheDocument()
    const ended = (await canvas.findByText('Ended at')).nextElementSibling as HTMLElement
    await expect(within(ended).getByRole('link', {name: '#588,640'})).toBeInTheDocument()
})

export const TextHistoryEmpty = curatedCase(6, 'text')

const pitch = `Pays a pilot cohort of three community teams from the medium spender track.

Each team reports monthly in the forum thread, and anything unspent after six months goes back to the treasury.`

const texts = [
    metadataAction(990_500, 4, 'MetadataSet', {title: curated(6).title, description: pitch}),
    metadataAction(975_100, 3, 'MetadataCleared', {hash: '0x' + 'be'.repeat(32)}),
    metadataAction(962_000, 5, 'MetadataSet', {hash: '0x' + 'be'.repeat(32)}),
    metadataAction(960_020, 2, 'MetadataSet', {title: 'Fund the medium spender pilot', description: 'First draft of the pitch, before the budget was split.'}),
]

export const TextHistorySeveralVersions = story({...curated(6), description: pitch}, 'text', castFromSnapshots(curated(6)), texts)

const drafts = Array.from({length: 45}, (_, i) =>
    i % 4 === 3
        ? metadataAction(990_000 - i * 700, 2, 'MetadataCleared', {hash: '0x' + 'be'.repeat(32)})
        : metadataAction(990_000 - i * 700, 2 + (i % 3), 'MetadataSet', {title: `Fund the medium spender pilot, draft ${45 - i}`, description: pitch})
)

export const TextHistoryMany = story(curated(6), 'text', {}, drafts)

export const TextHistoryPage2 = story(curated(6), 'text', {}, drafts, {page: '2'})

export const TextHistoryLastPage = story(curated(6), 'text', {}, drafts, {page: lastPage(drafts.length)})

const PREIMAGE = '0x4f2c9d07a1b3e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e'
const refundTitle = `Refund the deposit locked under preimage ${PREIMAGE}`
const refundPitch = `Preimage ${PREIMAGE} was noted twice, so this pays back the second deposit.`

export const TextHistoryLongTokensOnPhone = withPlay(
    {
        ...story({...curated(6), title: refundTitle, description: refundPitch}, 'text', {}, [metadataAction(990_500, 4, 'MetadataSet', {title: refundTitle, description: refundPitch})]),
        globals: PHONE,
    },
    async ({canvas, canvasElement}) => {
        expectFits(...canvas.getAllByText(refundTitle), ...canvas.getAllByText(refundPitch))
        expectTimesFit(canvasElement)
    }
)

// an approved referendum ends where it confirmed and no step of its own reads
// Approved, its enactment ticks when the dispatch went through and otherwise
// reads Failed with the error, which wraps between whole words
const approvedRail = (confirmed: string, enacted: string, error: string | null = null): Play => async ({canvas}) => {
    await expect(canvas.getByText('Approved')).toBeInTheDocument()
    const step = async (title: string, block: string) => {
        const item = (await canvas.findByText(title)).closest<HTMLElement>('li')!
        await expect(within(item).getByRole('link', {name: block})).toBeInTheDocument()
        return item
    }
    await step('Confirmed', confirmed)
    const enactment = await step('Enacted', enacted)
    if (error == null) {
        await expect(enactment.querySelector('.lucide-check')).not.toBeNull()
        await expect(within(enactment).queryByText('Failed')).toBeNull()
    } else {
        await expect(enactment.querySelector('.lucide-x')).not.toBeNull()
        await expect(within(enactment).getByText('Failed')).toBeInTheDocument()
        expectWholeWords(within(enactment).getByText(error))
    }
}

export const TimelineApprovedEarly = withPlay(curatedCase(10, 'timeline'), approvedRail('#698,640', '#707,280'))

// on a phone the submission time in the header and every step's time break
// inside their cards, with no line ending on a middle dot
export const TimelineOnPhone = withPlay({...TimelineApprovedEarly, globals: PHONE}, async ({canvasElement}) => {
    expectTimesFit(canvasElement)
    expectNoHangingDots(canvasElement)
})

export const TimelineRejected = curatedCase(1, 'timeline')

export const TimelineTimedOut = curatedCase(11, 'timeline')

export const TimelineCancelled = curatedCase(2, 'timeline')

export const TimelineKilled = curatedCase(4, 'timeline')

// approved on its second confirmation, the first one aborted when nays came in
const secondAttempt = {
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
    submissionDepositor: null,
    submissionDeposit: null,
    decisionDepositor: null,
    decisionDeposit: null,
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

export const TimelineTwoConfirmAttempts = withPlay(story(secondAttempt, 'timeline', castFromSnapshots(secondAttempt)), approvedRail('#743,640', '#752,280'))

export const CurvesTwoConfirmAttempts = story(secondAttempt, 'curves', castFromSnapshots(secondAttempt))

// the spend asks for more than the small spender track may pay, which only
// the enactment checks, and the runtime encodes that refusal as error 2 of
// Treasury at pallet index 23
const overCap = {
    ...curated(0),
    id: '25',
    index: 25,
    title: 'Spend over the small spender cap, approved and refused at enactment',
    ...proposal([{pallet: 'Treasury', method: 'spend', depth: 0, amount: numn(250_000), beneficiary: PEOPLE[2].id, validFrom: null}], {
        assetKind: null,
        amount: numn(250_000),
        beneficiary: PEOPLE[2].id,
        validFrom: null,
    }),
    timeline: (curated(0).timeline as RawStep[]).map(s => (s.name === 'Scheduler.Dispatched' ? {...s, error: 'Treasury.InsufficientPermission'} : s)),
}
const refused = {__kind: 'Err', value: {__kind: 'Module', value: {index: 23, error: '0x02000000'}}}
const enactment = overCap.timeline.find(s => s.name === 'Scheduler.Dispatched')!.event
const overCapEvents = stepEvents(overCap).map((e: {id: string; args: object}) => (e.id === enactment ? {...e, args: {...e.args, result: refused}} : e))

export const TimelineEnactmentFailed = {
    ...withPlay(story(overCap, 'timeline', {...castFromSnapshots(overCap), events: eventsById(overCapEvents)}), approvedRail('#588,640', '#597,280', 'Treasury.InsufficientPermission')),
    globals: DESKTOP,
}

// more snapshots than one read returns, packed early so the second read carries most of the run and a swing in nays
const longRun = {
    ...curated(5),
    snapshots: snapshots(
        Array.from({length: 6_000}, (_, i) => {
            if (i < 5_000) return [951_440 + 2 * i, 800_000 + 240 * i, 100 * i, 600_000 + 40 * i]
            const v = (i - 5_000) / 999
            return [961_440 + 38 * (i - 5_000), 2_000_000 + 800_000 * v, v < 0.5 ? 500_000 + 3_000_000 * v : 2_100_000 - 200_000 * v, 800_000 + 600_000 * v]
        })
    ),
}

export const CurvesPastOneRead = story(longRun, 'curves')

const deciding = (index: number, title: string) => ({...curated(5), id: String(index), index, title})

export const VotesEmpty = curatedCase(7, 'votes')

const single = deciding(19, 'A single conviction vote decides the tally so far')
const singleVote = [{...standard(PEOPLE[0], true, 'Locked3x', numn(1_000_000)), block: 952_000}]

export const VotesOne = cast(single, singleVote, 'votes')

export const VotesNayEmpty = castAt(single, singleVote, {group: 'nay'})

export const VotesAbstainEmpty = castAt(single, singleVote, {group: 'abstain'})

// a referendum without split votes has no split list, asking for it opens the first list holding votes
export const VotesSplitAbsent = castAt(single, singleVote, {group: 'split'})

// every way to vote, delegate and take it back, with the tally after each block
const [alice, bob, carol, dave, erin, frank, grace] = [PEOPLE[0], PEOPLE[1], PEOPLE[2], PEOPLE[3], PEOPLE[5], PEOPLE[9], PEOPLE[6]]
const aliceVote = standard(alice, true, 'Locked2x', numn(400_000))
const bobFirst = standard(bob, false, 'Locked1x', numn(300_000))
const bobNow = standard(bob, false, 'Locked4x', numn(300_000))
const carolVote = split(carol, numn(100_000), numn(50_000))
const daveVote = splitAbstain(dave, numn(20_000), numn(20_000), numn(200_000))
const erinVote = standard(erin, true, 'None', numn(500_000))

const everyAction = {
    referendum: {
        ...deciding(12, 'Every kind of voting action, from split votes to delegations'),
        ayes: numn(1_112_000),
        nays: numn(1_207_000),
        support: numn(770_000),
        snapshots: snapshots([
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
        ]),
    },
    data: {
        ...voteData(12, [aliceVote, bobNow, carolVote, daveVote]),
        voteActions: [
            voteAction(970_000, 3, 'Voted', bobNow),
            voteAction(968_000, 3, 'Voted', aliceVote, numn(300_000)),
            voteAction(964_000, 3, 'VoteRemoved', erinVote),
            voteAction(962_000, 3, 'Voted', erinVote),
            voteAction(956_000, 4, 'Voted', daveVote),
            voteAction(956_000, 3, 'Voted', carolVote),
            voteAction(954_000, 3, 'Voted', bobFirst),
            voteAction(952_000, 3, 'Voted', aliceVote),
        ],
        delegationActions: [
            delegationAction(967_000, 3, 'Delegated', grace, alice, 'Locked6x', numn(50_000), numn(300_000)),
            delegationAction(966_000, 3, 'Undelegated', frank, alice, 'Locked3x', numn(150_000), '0'),
            delegationAction(960_000, 3, 'Delegated', frank, alice, 'Locked3x', numn(150_000), numn(450_000)),
        ],
        ...delegationData([delegation(grace, alice, 'Locked6x', numn(50_000), '32')]),
    },
}

export const ActionsEveryKind = story(everyAction.referendum, 'curves', everyAction.data)

export const VotesEveryKind = story(everyAction.referendum, 'votes', everyAction.data)

export const VotesNayGroup = story(everyAction.referendum, 'votes', everyAction.data, [], {group: 'nay'})

export const VotesSplitGroup = story(everyAction.referendum, 'votes', everyAction.data, [], {group: 'split'})

export const VotesAbstainGroup = story(everyAction.referendum, 'votes', everyAction.data, [], {group: 'abstain'})

const CONVICTIONS = ['None', 'Locked1x', 'Locked2x', 'Locked3x', 'Locked4x', 'Locked5x', 'Locked6x']

const convictionVotes = CONVICTIONS.flatMap((conviction, i) => [
    {...standard(PEOPLE[i], true, conviction, numn(300_000 - i * 1_000)), block: 962_000 + i * 2_000},
    {...standard(anon(40 + i), false, conviction, numn(50_000 - i * 1_000)), block: 963_000 + i * 2_000},
])

export const VotesEveryConviction = withPlay(cast(deciding(20, 'Votes at every conviction from 0x to 6x'), convictionVotes, 'votes'), expandAll)

// every list runs past two pages, the splits repeat aye parts so their nay parts break the ties
const manyVotes = [
    ...Array.from({length: 220}, (_, i) => ({...standard(i < 10 ? PEOPLE[i] : anon(100 + i), i % 3 !== 2, CONVICTIONS[i % 7], numn(2_000 + ((i * 7919) % 60_000))), block: 952_000 + i * 120})),
    ...Array.from({length: 47}, (_, i) => ({...split(anon(400 + i), numn(10_000 * (1 + ((i * 7) % 12))), numn(1_000 + ((i * 7919) % 90_000))), block: 980_000 + i * 50})),
    ...Array.from({length: 45}, (_, i) => {
        const side = i % 4 === 0 ? numn(5_000 + i * 100) : '0'
        return {...splitAbstain(anon(500 + i), side, side, numn(2_000 + ((i * 7919) % 150_000))), block: 983_000 + i * 50}
    }),
]

const many = deciding(21, 'Three hundred and twelve voters on one referendum')

const listSize = (kind: string, aye: boolean | null = null) => manyVotes.filter(v => v.kind === kind && (aye === null || v.aye === aye)).length

const manyAt = (group: string, page = '1') => castAt(many, manyVotes, {group, page})

export const VotesMany = cast(many, manyVotes, 'votes')

export const VotesAyePage2 = manyAt('aye', '2')

export const VotesAyeLastPage = manyAt('aye', lastPage(listSize('Standard', true)))

export const VotesNayMany = manyAt('nay')

export const VotesNayPage2 = manyAt('nay', '2')

export const VotesNayLastPage = manyAt('nay', lastPage(listSize('Standard', false)))

export const VotesSplitMany = manyAt('split')

export const VotesSplitPage2 = manyAt('split', '2')

export const VotesSplitLastPage = manyAt('split', lastPage(listSize('Split')))

export const VotesAbstainMany = manyAt('abstain')

export const VotesAbstainPage2 = manyAt('abstain', '2')

export const VotesAbstainLastPage = manyAt('abstain', lastPage(listSize('SplitAbstain')))

export const ActionsMany = cast(many, manyVotes, 'curves')

const anons = (from: number, count: number) => Array.from({length: count}, (_, i) => anon(from + i))

const delegators = (target: object, whos: object[], most = 90_000) => whos.map((who, i) => delegation(who, target, CONVICTIONS[(i * 3) % 7], numn(1 + ((i * 7919) % most)), '31'))

const delegated = [PEOPLE[5], PEOPLE[3], PEOPLE[0]]
const delegatedVotes = delegated.map((voter, i) => ({...standard(voter, true, 'Locked2x', numn(900_000 - i * 150_000)), block: 962_000 + i * 1_000}))
const delegatedRef = {...curated(6), id: '22', index: 22}

const withDelegators = (list: object[], total?: number) => cast(delegatedRef, delegatedVotes, 'votes', delegationData(list, total), list)

const fewAndMany = [...delegators(PEOPLE[3], anons(60, 3)), ...delegators(PEOPLE[0], [anon(70), anon(71), PEOPLE[7], ...anons(73, 10)])]

export const DelegatorsNone = withPlay(withDelegators(fewAndMany), expandRow('Nova Fund'))

export const DelegatorsFew = withPlay(withDelegators(fewAndMany), expandRow('Redshift'))

export const DelegatorsOverInlineLimit = withPlay(withDelegators(fewAndMany), expandRow('Polaris Guild'))

export const DelegationsPartial = withPlay(withDelegators(delegators(PEOPLE[0], anons(1000, 5000), 1_000), 5200), expandRow('Polaris Guild'))

// two delegations of 0.3 and 0.15 behind one standing vote
export const DelegatorsAddUp = withPlay(withDelegators([delegation(anon(80), PEOPLE[3], 'Locked1x', numn(0.3), '31'), delegation(anon(81), PEOPLE[3], 'Locked1x', numn(0.15), '31')]), async ({canvas}) => {
    const row = (await canvas.findAllByText('Redshift')).map(el => el.closest('tr')).find(tr => tr != null)!
    await expect(within(row).getByText('0.45 NUMN')).toBeInTheDocument()
})

const hugeSpend = '9999999999999999999999999'

const extremeAmounts = (tab: string) =>
    cast(
        {
            ...deciding(18, refundTitle),
            ...proposal([{pallet: 'Treasury', method: 'spend', depth: 0, amount: hugeSpend, beneficiary: PEOPLE[7].id, validFrom: null}], {
                assetKind: null,
                amount: hugeSpend,
                beneficiary: PEOPLE[7].id,
                validFrom: null,
            }),
        },
        [
            {...standard(PEOPLE[7], true, 'Locked1x', numn(52_000_000)), block: 975_000},
            {...standard(anon(9), false, 'None', '10'), block: 976_000},
        ],
        tab
    )

// the queries bound to the card under a title
const card = (root: HTMLElement, title: string) => within(within(root).getByText(title).closest<HTMLElement>('[data-slot=card]')!)

// a single planck of nay against 52M of aye keeps the aye share under 100%
export const ExtremeAmounts = withPlay(extremeAmounts('call'), async ({canvasElement}) => {
    for (const figure of ['99.99%', '<0.01%']) await expect(card(canvasElement, 'Tally').getByText(figure)).toBeInTheDocument()
})

// the lines of the curves tooltip at the newest step of the tally
const tallyReadings = async (root: HTMLElement) => {
    await waitFor(() => expectLegibleAxes(root))
    return lastTooltipLines(root, 'Current approval')[0]
}

// the curves read that planck of nay off the tally too
export const CurvesExtremeAmounts = withPlay(extremeAmounts('curves'), async ({canvasElement}) => {
    await expect(await tallyReadings(canvasElement)).toContain('Current approval99.99%')
})

// a planck of aye against a million of nay is a sliver of approval and of
// support, not none
export const CurvesDustAye = withPlay(
    cast(
        deciding(24, 'A planck of aye against a million of nay'),
        [
            {...standard(PEOPLE[0], true, 'None', '10'), block: 952_000},
            {...standard(PEOPLE[1], false, 'Locked1x', numn(1_000_000)), block: 953_000},
        ],
        'curves'
    ),
    async ({canvasElement}) => {
        const lines = await tallyReadings(canvasElement)
        for (const line of ['Current approval<0.01%', 'Current support<0.01%']) await expect(lines).toContain(line)
    }
)

// four nay votes against 9,996 aye votes, support a sliver of active issuance,
// and prepare and confirm periods that stop between whole units of time
export const NearlyAllAyeOnUnevenTrack = withPlay(
    cast(
        {...deciding(23, 'Nearly every vote aye on a track with uneven periods'), track: {...(curated(5).track as object), preparePeriod: 540, confirmPeriod: 36_000}},
        [
            {...standard(PEOPLE[0], true, 'Locked6x', numn(1_666)), block: 952_000},
            {...standard(PEOPLE[1], false, 'Locked1x', numn(4)), block: 953_000},
        ],
        'curves'
    ),
    async ({canvasElement}) => {
        for (const figure of ['99.96%', '0.04%', '<0.01%']) await expect(card(canvasElement, 'Tally').getByText(figure)).toBeInTheDocument()
        for (const span of ['1h 30m', '28d', '4d 4h', '1d']) await expect(card(canvasElement, 'Status').getByText(span)).toBeInTheDocument()
    }
)
