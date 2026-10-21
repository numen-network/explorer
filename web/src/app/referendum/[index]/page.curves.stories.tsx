import {expect, waitFor, within} from 'storybook/test'
import {numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {actionLog, castFromSnapshots, CHAIN, snapshots, standard} from '../../../../../mock/fixtures/governance.js'
import {ss58Encode} from '@/lib/ss58'
import {expectLegibleAxes, lastTooltipLines} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {curated, story, curatedCase, cast, withPlay, secondAttempt, deciding, single, singleVote, alice, grace, everyRows, everyAction, manyVotes, many, extremeAmounts} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Curves', ...pageMeta(ReferendumPage)}

export const TimedOutAfterVotes = curatedCase(11)

export const ApprovedAfterLongLeadIn = curatedCase(10)

export const VotingInPreparePeriod = curatedCase(9)

export const WaitingForDecisionDeposit = curatedCase(8)

// nobody voted, so the action list has nothing to show
export const SubmittedWithoutVotes = withPlay(curatedCase(7), async ({canvasElement}) => {
    const {heading, rows} = await actionList(canvasElement)
    await expect(heading).toBe('Actions (0)')
    await expect(cellsOf(rows[0])).toEqual(['No actions.'])
})

export const DecidingBelowCurves = curatedCase(5)

export const KilledWhileDeciding = curatedCase(4)

export const CancelledWhileDeciding = curatedCase(2)

export const RejectedAtEnd = curatedCase(1)

export const ApprovedOnFirstConfirmation = curatedCase(0)

export const TwoConfirmAttempts = story(secondAttempt, 'curves', castFromSnapshots(secondAttempt))

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

export const PastOneRead = story(longRun, 'curves')

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

export const ActionsNoMatch = filtered({q: 'nobody by this name', action: 'undelegate', impact: 'support-up'}, () => false, ['Undelegate', 'Support up'])

const manyActions = (page: string) =>
    withPlay(cast(many, manyVotes, 'curves', {}, [], {page}), async ({canvasElement}) => {
        const {heading, rows} = await actionList(canvasElement)
        await expect(heading).toBe(`Actions (${manyVotes.length})`)
        await expect(rows.length).toBe(Math.min(20, manyVotes.length - (Number(page) - 1) * 20))
    })

export const ActionsMany = manyActions('1')

export const ActionsPage2 = manyActions('2')

export const ActionsLastPage = manyActions(lastPage(manyVotes.length))

// the lines of the curves tooltip at the newest step of the tally
const tallyReadings = async (root: HTMLElement) => {
    await waitFor(() => expectLegibleAxes(root))
    return lastTooltipLines(root, 'Current approval')[0]
}

// the curves read that planck of nay off the tally too
export const ExtremeAmounts = withPlay(extremeAmounts('curves'), async ({canvasElement}) => {
    await expect(await tallyReadings(canvasElement)).toContain('Current approval99.99%')
})

// a planck of aye against a million of nay is a sliver of approval and of
// support, not none
export const DustAye = withPlay(
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
