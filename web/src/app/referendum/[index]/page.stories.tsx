import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor, within} from 'storybook/test'
import data, {referenda} from '../../../../../mock/data.js'
import {at, block, chainInfo, HEAD, numn, paged, PEOPLE} from '../../../../../mock/fixtures.js'
import {
    accounts,
    actionLog,
    anon,
    castFromSnapshots,
    castVotes,
    CHAIN,
    delegatedVoteData,
    delegation,
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
    voteData,
    votingAction,
    withImpact,
} from '../../../../../mock/fixtures/governance.js'
import type {RawStep} from '@/components/timeline'
import {ss58Encode} from '@/lib/ss58'
import {axisTexts, barWidthsIn, expectFits, expectLegibleAxes, expectNoHangingDots, expectTimesFit, expectWholeWords, lastTooltipLines, progressIn, stacksIn} from '../../../../.storybook/fit'
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

// a quarter into its decision period at the newest indexed block while the
// chain has run past the whole period, the bars read prepare, decision,
// confirmation and enactment
export const DecidingIndexBehind: StoryObj = {
    ...story({...curated(5), decidingSince: HEAD - 60_480}, 'call', {chainInfos: [{...chainInfo, head: HEAD + 300_000, finalizedHead: HEAD + 299_998}]}),
    play: async ({canvasElement}) => expect(progressIn(canvasElement)).toEqual([100, 25, 0, 0]),
}

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
        ...proposal({__kind: 'Utility', value: {__kind: 'batch_all', calls: tranches.map(t => treasurySpend(...t))}}),
    },
    'call'
)

export const CallBatchTree = story(
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

export const CallUnreadable = story(
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

// each depositor shares the first line of its row with the deposit
const depositorsInline: Play = async ({canvas}) => {
    for (const label of ['Submission deposit', 'Decision deposit']) {
        const value = (await canvas.findByText(label)).nextElementSibling as HTMLElement
        expect(within(value).getByRole('link').getBoundingClientRect().top).toBeCloseTo(value.getBoundingClientRect().top, 0)
    }
}

export const MetadataEveryField = withPlay(curatedCase(6, 'metadata'), async context => {
    await depositorsInline!(context)
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

const markdownPitch = `Pays a pilot cohort of **three** community teams, see the [forum thread](https://forum.example.com/t/42).

## Budget

| Team | Amount |
| --- | ---: |
| Docs | 12,000 NUMN |
| Tooling | 30,000 NUMN |

- monthly reports
- unspent funds go back to the treasury`

// the description reads as markdown while the text history keeps the raw source
export const DescriptionMarkdown = withPlay(
    story({...curated(6), description: markdownPitch}, 'text', {}, [metadataAction(990_500, 4, 'MetadataSet', {title: curated(6).title, description: markdownPitch})]),
    async ({canvas}) => {
        expect(await canvas.findAllByRole('heading', {name: 'Budget'})).toHaveLength(1)
        expect(canvas.getAllByRole('table')).toHaveLength(1)
        expect(canvas.getAllByRole('link', {name: 'forum thread'})).toHaveLength(1)
        expect(canvas.getByText(content => content.includes('## Budget'))).toHaveTextContent(markdownPitch, {normalizeWhitespace: false})
    }
)

const PREIMAGE = '0x4f2c9d07a1b3e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e'
const refundTitle = `Refund the deposit locked under preimage ${PREIMAGE}`
const refundPitch = `Preimage ${PREIMAGE} was noted twice, so this pays back the second deposit.`

export const TextHistoryLongTokens = withPlay(
    story({...curated(6), title: refundTitle, description: refundPitch}, 'text', {}, [metadataAction(990_500, 4, 'MetadataSet', {title: refundTitle, description: refundPitch})]),
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

// the submission time in the header and every step's time break inside their
// cards, with no line ending on a middle dot
export const TimelineApprovedEarly = withPlay(curatedCase(10, 'timeline'), async context => {
    await approvedRail('#698,640', '#707,280')!(context)
    expectTimesFit(context.canvasElement)
    expectNoHangingDots(context.canvasElement)
})

export const TimelineRejected = curatedCase(1, 'timeline')

export const TimelineTimedOut = curatedCase(11, 'timeline')

export const TimelineCancelled = curatedCase(2, 'timeline')

// a kill slashes each deposit the referendum still held, newest first, every
// slash naming who lost what inside the kill's own extrinsic
const killRail = (amounts: string[]): Play => async ({canvas}) => {
    const extrinsicOf = (step: HTMLElement) => step.querySelector('a[href^="/extrinsic/"]')?.textContent
    const kill = extrinsicOf((await canvas.findAllByText('Killed')).map(el => el.closest<HTMLElement>('li')).find(li => li != null)!)
    await expect(kill).toBeTruthy()
    const slashes = (await canvas.findAllByText('Deposit slashed')).map(el => el.closest<HTMLElement>('li')!)
    await expect(slashes.map(step => within(step).getByText(/NUMN$/).textContent)).toEqual(amounts)
    for (const step of slashes) {
        await expect(within(step).getByText('Who')).toBeInTheDocument()
        await expect(extrinsicOf(step)).toBe(kill)
    }
}

export const TimelineKilled = withPlay(curatedCase(4, 'timeline'), killRail(['1,000 NUMN', '5 NUMN']))

// killed before anyone placed the decision deposit, so the submission deposit is all it slashes
const killedEarly = {
    ...curated(4),
    id: '26',
    index: 26,
    title: 'Killed before its decision deposit, slashing the submission deposit alone',
    decidingSince: null,
    endedAt: 761_000,
    nays: '0',
    timeline: [step('Referenda.Submitted', 760_000, 5), step('Referenda.Killed', 761_000, 4), step('Referenda.DepositSlashed', 761_000, 8)],
    snapshots: snapshots([
        [760_200, 200_000, 0, 150_000],
        [761_000, 200_000, 0, 150_000],
    ]),
}

export const TimelineKilledBeforeDecisionDeposit = withPlay(story(killedEarly, 'timeline', castFromSnapshots(killedEarly)), killRail(['5 NUMN']))

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
    ...proposal(treasurySpend(numn(250_000), PEOPLE[2].id, null)),
    timeline: (curated(0).timeline as RawStep[]).map(s => (s.name === 'Scheduler.Dispatched' ? {...s, error: 'Treasury.InsufficientPermission'} : s)),
}
const refused = {__kind: 'Err', value: {__kind: 'Module', value: {index: 23, error: '0x02000000'}}}
const enactment = overCap.timeline.find(s => s.name === 'Scheduler.Dispatched')!.event
const overCapEvents = stepEvents(overCap).map((e: {id: string; args: object}) => (e.id === enactment ? {...e, args: {...e.args, result: refused}} : e))

// every step keeps each value whole and inside the card, whether its rows sit
// beside the title or drop below it
export const TimelineEnactmentFailed = withPlay(story(overCap, 'timeline', {...castFromSnapshots(overCap), events: eventsById(overCapEvents)}), async context => {
    await approvedRail('#588,640', '#597,280', 'Treasury.InsufficientPermission')!(context)
    const values = [...context.canvasElement.querySelectorAll('dl dd')]
    await expect(values.length).toBeGreaterThan(0)
    expectWholeWords(...values)
    expectFits(...context.canvasElement.querySelectorAll('[data-slot=card]'))
})

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
const everyRows = withImpact(
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

const everyAction = {
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

// the action list as the page shows it, its heading, pickers, search text and rows
const actionList = async (root: HTMLElement) => {
    const heading = await within(root).findByRole('heading', {name: /^Actions/})
    const card = heading.closest<HTMLElement>('[data-slot=card]')!
    return {
        heading: heading.textContent,
        rows: [...card.querySelectorAll<HTMLElement>('tbody tr')],
        pickers: [...card.querySelectorAll('[data-slot=select-trigger]')].map(b => b.textContent),
        search: card.querySelector('input')!.value,
    }
}

const cellsOf = (row: HTMLElement) => [...row.children].map(c => c.textContent)

// a delegation row reads its delegator under the action and the target's own
// votes beside the delegated weight, a block's move sits on its latest row only
export const ActionsEveryKind = withPlay(story(everyAction.referendum, 'curves', everyAction.data), async ({canvasElement}) => {
    const {heading, rows} = await actionList(canvasElement)
    await expect(heading).toBe('Actions (11)')
    const [action, amount, impact] = [3, 4, 5].map(i => rows.map(row => cellsOf(row)[i]))
    await expect(action[2]).toContain('Delegated by')
    await expect(action[3]).toContain('Undelegated by')
    await expect(amount[2]).toMatch(/\+ .* delegated$/)
    await expect(amount[3]).not.toContain('delegated')
    await expect(impact.map(i => i === '—')).toEqual([false, false, false, false, false, false, false, false, true, false, false])
})

export const ActionsEmpty = withPlay(curatedCase(7), async ({canvasElement}) => {
    const {heading, rows} = await actionList(canvasElement)
    await expect(heading).toBe('Actions (0)')
    await expect(cellsOf(rows[0])).toEqual(['No actions.'])
})

export const ActionsOne = withPlay(cast(single, singleVote, 'curves'), async ({canvasElement}) => {
    const {heading, rows} = await actionList(canvasElement)
    await expect(heading).toBe('Actions (1)')
    await expect(cellsOf(rows[0])[5]).not.toBe('—')
})

type EveryRow = (typeof everyRows)[number]

// the every kind referendum as the server answers a filtered query, the
// controls read the filters back from the url
const filtered = (query: Record<string, string>, keep: (row: EveryRow) => boolean, pickers: string[]) => {
    const rows = everyRows.filter(keep)
    return withPlay(story(everyAction.referendum, 'curves', {...everyAction.data, ...actionLog(rows)}, [], query), async ({canvasElement}) => {
        const list = await actionList(canvasElement)
        await expect(list.heading).toBe(`Actions (${rows.length})`)
        await expect(list.pickers).toEqual(pickers)
        await expect(list.search).toBe(query.q ?? '')
        await expect(list.rows.map(row => cellsOf(row).length === 1 ? cellsOf(row)[0] : 'row')).toEqual(rows.length > 0 ? rows.map(() => 'row') : ['No matching actions.'])
    })
}

const moved = (field: 'approvalPart' | 'supportPart', up: boolean) => (row: EveryRow) => row[field] != null && (up ? BigInt(row[field]) > 0n : BigInt(row[field]) < 0n)
const names = (who: {id: string}) => (row: EveryRow) => row.voter.id === who.id || row.delegator?.id === who.id

export const ActionsVotes = filtered({action: 'vote'}, row => row.method === 'Voted', ['Vote', 'All impact'])

export const ActionsRemovedVotes = filtered({action: 'remove'}, row => row.method === 'VoteRemoved', ['Remove vote', 'All impact'])

export const ActionsDelegations = filtered({action: 'delegate'}, row => row.method === 'Delegated', ['Delegate', 'All impact'])

export const ActionsUndelegations = filtered({action: 'undelegate'}, row => row.method === 'Undelegated', ['Undelegate', 'All impact'])

export const ActionsApprovalUp = filtered({impact: 'approval-up'}, moved('approvalPart', true), ['All actions', 'Approval up'])

export const ActionsApprovalDown = filtered({impact: 'approval-down'}, moved('approvalPart', false), ['All actions', 'Approval down'])

export const ActionsSupportUp = filtered({impact: 'support-up'}, moved('supportPart', true), ['All actions', 'Support up'])

export const ActionsSupportDown = filtered({impact: 'support-down'}, moved('supportPart', false), ['All actions', 'Support down'])

export const ActionsSearchName = filtered({q: 'Polaris'}, names(alice), ['All actions', 'All impact'])

export const ActionsSearchAddress = filtered({q: ss58Encode(grace.id, CHAIN.ss58)}, names(grace), ['All actions', 'All impact'])

export const ActionsNoMatch = filtered({action: 'undelegate', impact: 'support-up'}, () => false, ['Undelegate', 'Support up'])

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

const manyActions = (page: string) =>
    withPlay(cast(many, manyVotes, 'curves', {}, [], {page}), async ({canvasElement}) => {
        const {heading, rows} = await actionList(canvasElement)
        await expect(heading).toBe(`Actions (${manyVotes.length})`)
        await expect(rows.length).toBe(Math.min(20, manyVotes.length - (Number(page) - 1) * 20))
    })

export const ActionsMany = manyActions('1')

export const ActionsPage2 = manyActions('2')

export const ActionsLastPage = manyActions(lastPage(manyVotes.length))

const anons = (from: number, count: number) => Array.from({length: count}, (_, i) => anon(from + i))

const delegators = (target: object, whos: object[], most = 90_000) => whos.map((who, i) => delegation(who, target, CONVICTIONS[(i * 3) % 7], numn(1 + ((i * 7919) % most)), '31'))

const delegated = [PEOPLE[5], PEOPLE[3], PEOPLE[0]]
const delegatedVotes = delegated.map((voter, i) => ({...standard(voter, true, 'Locked2x', numn(900_000 - i * 150_000)), block: 962_000 + i * 1_000}))
const delegatedRef = {...curated(6), id: '22', index: 22}

const withDelegators = (list: object[]) => cast(delegatedRef, delegatedVotes, 'votes', {}, list)

const fewAndMany = [...delegators(PEOPLE[3], anons(60, 3)), ...delegators(PEOPLE[0], [anon(70), anon(71), PEOPLE[7], ...anons(73, 10)])]

export const DelegatorsNone = withPlay(withDelegators(fewAndMany), expandRow('Nova Fund'))

export const DelegatorsFew = withPlay(withDelegators(fewAndMany), expandRow('Redshift'))

export const DelegatorsOverInlineLimit = withPlay(withDelegators(fewAndMany), expandRow('Polaris Guild'))

// five thousand delegations behind one vote, every one counted and ten listed
export const DelegatorsThousands = withPlay(withDelegators(delegators(PEOPLE[0], anons(1000, 5000), 1_000)), async context => {
    await expandRow('Polaris Guild')!(context)
    await expect(await context.canvas.findByRole('link', {name: '4,990 more delegators on the account page'})).toBeVisible()
    const stat = within(context.canvas.getByRole('heading', {name: 'Delegated votes'}).parentElement!)
    await expect(stat.getByText('Delegators').nextElementSibling).toHaveTextContent('5,000')
})

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
            ...proposal(treasurySpend(hugeSpend, PEOPLE[7].id, null)),
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

// the statistics tab as the page draws it, the list legend, the three totals,
// the conviction shares, every stacked chart once it has drawn its totals and
// the widths its bars take
const statistics = async (root: HTMLElement) => {
    await waitFor(() => {
        const stacks = stacksIn(root)
        expect(stacks).toHaveLength(5)
        for (const stack of stacks) expect(stack.totals).toHaveLength(stack.labels.length)
    })
    const sections = root.querySelectorAll('[data-slot=card] section')
    const [ways, capital, votes, levels, ranges] = stacksIn(root)
    return {
        legend: [...within(root).getByRole('heading', {name: 'Statistics'}).nextElementSibling!.children].map(el => el.textContent),
        totals: [...sections[0].children].map(el => [el.children[0].textContent, el.children[1].textContent]),
        shares: within(root).getAllByRole('listitem').filter(el => el.closest('ul')?.getAttribute('aria-label') === 'Conviction shares').map(el => el.textContent),
        ways,
        capital: capital.totals,
        votes: votes.totals,
        levels,
        ranges,
        // the range labels the last chart draws, a crowded one broken after its dash
        drawnRanges: axisTexts(root)
            .at(-1)!
            .find(axis => axis.length === ranges.labels.length)
            ?.map(text => text.replace('\n', '')),
        barWidths: barWidthsIn(root),
    }
}

const WAYS = ['Delegated', 'Direct']
const LEVELS = ['0.1x', '1x', '2x', '3x', '4x', '5x', '6x']
const RANGES = ['0-10K', '10K-500K', '500K-1M', '1M-5M', '>5M']
const shares = (pcts: string[]) => pcts.map((pct, n) => `${LEVELS[n]}${pct}`)

export const StatisticsEmpty = withPlay(curatedCase(7, 'statistics'), async ({canvas}) => {
    await expect(await canvas.findByText('No votes yet.')).toBeInTheDocument()
})

export const StatisticsOne = withPlay(cast(single, singleVote, 'statistics'), async ({canvasElement}) => {
    await expect(await statistics(canvasElement)).toEqual({
        legend: ['Aye', 'Nay', 'Abstain'],
        totals: [
            ['Accounts', '1'],
            ['Capital', '1M NUMN'],
            ['Votes', '3M NUMN'],
        ],
        shares: shares(['0.00%', '0.00%', '0.00%', '100.00%', '0.00%', '0.00%', '0.00%']),
        ways: {labels: WAYS, series: {Aye: [0, 1], Nay: [0, 0], Abstain: [0, 0]}, totals: ['0', '1']},
        capital: ['0', '1M'],
        votes: ['0', '3M'],
        levels: {labels: LEVELS, series: {Aye: [0, 0, 0, 1, 0, 0, 0], Nay: [0, 0, 0, 0, 0, 0, 0], Abstain: [0, 0, 0, 0, 0, 0, 0]}, totals: ['0', '0', '0', '1', '0', '0', '0']},
        ranges: {labels: RANGES, series: {Aye: [0, 0, 0, 1, 0], Nay: [0, 0, 0, 0, 0], Abstain: [0, 0, 0, 0, 0]}, totals: ['0', '0', '0', '1', '0']},
        drawnRanges: RANGES,
        barWidths: [14],
    })
})

// a standard vote each way, a split, a split abstain and a delegation riding
// alice's aye, the split giving the legend its fourth list
export const StatisticsEveryKind = withPlay(story(everyAction.referendum, 'statistics', everyAction.data), async ({canvasElement}) => {
    await expect(await statistics(canvasElement)).toEqual({
        legend: ['Aye', 'Nay', 'Abstain', 'Split'],
        totals: [
            ['Accounts', '5'],
            ['Capital', '1.14M NUMN'],
            ['Votes', '≈2.33M NUMN'],
        ],
        shares: shares(['40.00%', '0.00%', '20.00%', '0.00%', '20.00%', '0.00%', '20.00%']),
        ways: {labels: WAYS, series: {Aye: [1, 1], Nay: [0, 1], Abstain: [0, 1], Split: [0, 1]}, totals: ['1', '4']},
        capital: ['50K', '1.09M'],
        votes: ['300K', '≈2.03M'],
        levels: {
            labels: LEVELS,
            series: {Aye: [0, 0, 1, 0, 0, 0, 1], Nay: [0, 0, 0, 0, 1, 0, 0], Abstain: [1, 0, 0, 0, 0, 0, 0], Split: [1, 0, 0, 0, 0, 0, 0]},
            totals: ['2', '0', '1', '0', '1', '0', '1'],
        },
        ranges: {labels: RANGES, series: {Aye: [0, 1, 1, 0, 0], Nay: [0, 0, 0, 1, 0], Abstain: [0, 1, 0, 0, 0], Split: [0, 1, 0, 0, 0]}, totals: ['0', '3', '1', '1', '0']},
        drawnRanges: RANGES,
        barWidths: [14],
    })
})

// one aye and one nay at each conviction
export const StatisticsEveryConviction = withPlay(cast(deciding(20, 'Votes at every conviction from 0x to 6x'), convictionVotes, 'statistics'), async ({canvasElement}) => {
    const {totals, shares: held, levels} = await statistics(canvasElement)
    await expect(totals[0]).toEqual(['Accounts', '14'])
    await expect(held).toEqual(shares(Array(7).fill('14.28%')))
    await expect(levels).toEqual({labels: LEVELS, series: {Aye: Array(7).fill(1), Nay: Array(7).fill(1), Abstain: Array(7).fill(0)}, totals: Array(7).fill('2')})
})

// every chart counts all 312 voters once
export const StatisticsMany = withPlay(cast(many, manyVotes, 'statistics'), async ({canvasElement}) => {
    const {legend, totals, ways, levels, ranges} = await statistics(canvasElement)
    await expect(legend).toEqual(['Aye', 'Nay', 'Abstain', 'Split'])
    await expect(totals[0]).toEqual(['Accounts', '312'])
    for (const stack of [ways, levels, ranges]) await expect(stack.totals.reduce((n, t) => n + Number(t), 0)).toBe(312)
})

// sixteen delegators behind two of three aye voters
export const StatisticsDelegated = withPlay(cast(delegatedRef, delegatedVotes, 'statistics', {}, fewAndMany), async ({canvasElement}) => {
    const {totals, ways} = await statistics(canvasElement)
    await expect(totals[0]).toEqual(['Accounts', '19'])
    await expect(ways).toEqual({labels: WAYS, series: {Aye: [16, 3], Nay: [0, 0], Abstain: [0, 0]}, totals: ['16', '3']})
})

// votes of nothing still count as accounts and sit in the lowest range
export const StatisticsZeroBalance = withPlay(
    cast(
        deciding(25, 'Two votes of nothing beside one real one'),
        [
            {...standard(PEOPLE[0], true, 'Locked1x', '0'), block: 952_000},
            {...standard(PEOPLE[1], false, 'None', '0'), block: 953_000},
            {...standard(PEOPLE[2], true, 'Locked3x', numn(20_000)), block: 954_000},
        ],
        'statistics'
    ),
    async ({canvasElement}) => {
        const {totals, ranges} = await statistics(canvasElement)
        await expect(totals).toEqual([
            ['Accounts', '3'],
            ['Capital', '20K NUMN'],
            ['Votes', '60K NUMN'],
        ])
        await expect(ranges).toEqual({labels: RANGES, series: {Aye: [1, 1, 0, 0, 0], Nay: [1, 0, 0, 0, 0], Abstain: [0, 0, 0, 0, 0]}, totals: ['2', '1', '0', '0', '0']})
    }
)

// 52M of aye against ten planck of nay, the tab fits every width
export const StatisticsExtremeAmounts = withPlay(extremeAmounts('statistics'), async ({canvasElement}) => {
    const {totals, ranges} = await statistics(canvasElement)
    await expect(totals).toEqual([
        ['Accounts', '2'],
        ['Capital', '≈52M NUMN'],
        ['Votes', '≈52M NUMN'],
    ])
    await expect(ranges.totals).toEqual(['1', '0', '0', '0', '1'])
    expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
    expectLegibleAxes(canvasElement)
})

// the delegation made once the referendum had ended is not one it counted, so
// the vote list leaves it out though the target holds it today
const endedRef = {...curated(0), id: '26', index: 26, title: 'A delegation made after the end stays off the vote list'}
const countedDelegation = delegation(anon(90), PEOPLE[0], 'Locked1x', numn(5_000), '31')
const laterDelegation = delegation(anon(91), PEOPLE[0], 'Locked3x', numn(70_000), '31')
export const VotesDelegatedAfterEnd = withPlay(
    cast(endedRef, [{...standard(PEOPLE[0], true, 'Locked2x', numn(400_000)), block: 962_000}], 'votes', delegationData([countedDelegation, laterDelegation]), [countedDelegation]),
    async context => {
        await expandRow('Polaris Guild')!(context)
        const listed = (who: {id: string}) => context.canvas.queryAllByRole('link').some(link => link.getAttribute('href') === `/account/${ss58Encode(who.id, CHAIN.ss58)}`)
        await waitFor(() => expect(listed(countedDelegation.who)).toBe(true))
        await expect(listed(laterDelegation.who)).toBe(false)
        const stat = within(context.canvas.getByRole('heading', {name: 'Delegated votes'}).parentElement!)
        await expect(stat.getByText('Delegators').nextElementSibling).toHaveTextContent('1')
    }
)
