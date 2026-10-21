import {expect, waitFor, within} from 'storybook/test'
import {numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {anon, CHAIN, delegation, delegationData, standard} from '../../../../../mock/fixtures/governance.js'
import {ss58Encode} from '@/lib/ss58'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {Referendum, Play, curated, story, curatedCase, cast, withPlay, deciding, single, singleVote, everyAction, convictionVotes, manyVotes, many, anons, delegators, delegatedVotes, delegatedRef, fewAndMany} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Votes', ...pageMeta(ReferendumPage)}

// the votes tab opened on the list and page the query names
const castAt = (r: Referendum, votes: object[], query: Record<string, string>) => cast(r, votes, 'votes', {}, [], query)

const expandRow = (label: string): Play => async ({canvas, userEvent}) => {
    const row = (await canvas.findAllByText(label)).map(el => el.closest('tr')).find(tr => tr != null)!
    await userEvent.click(within(row).getByRole('button', {name: 'expand'}))
}

const expandAll: Play = async ({canvas, userEvent}) => {
    for (const button of await canvas.findAllByRole('button', {name: 'expand'})) await userEvent.click(button)
}

export const Empty = curatedCase(7, 'votes')

export const One = cast(single, singleVote, 'votes')

export const NayEmpty = castAt(single, singleVote, {group: 'nay'})

export const AbstainEmpty = castAt(single, singleVote, {group: 'abstain'})

// a referendum without split votes has no split list, asking for it opens the first list holding votes
export const SplitAbsent = castAt(single, singleVote, {group: 'split'})

export const EveryKind = story(everyAction.referendum, 'votes', everyAction.data)

export const NayGroup = story(everyAction.referendum, 'votes', everyAction.data, [], {group: 'nay'})

export const SplitGroup = story(everyAction.referendum, 'votes', everyAction.data, [], {group: 'split'})

export const AbstainGroup = story(everyAction.referendum, 'votes', everyAction.data, [], {group: 'abstain'})

export const EveryConviction = withPlay(cast(deciding(20, 'Votes at every conviction from 0x to 6x'), convictionVotes, 'votes'), expandAll)

const listSize = (kind: string, aye: boolean | null = null) => manyVotes.filter(v => v.kind === kind && (aye === null || v.aye === aye)).length

const manyAt = (group: string, page = '1') => castAt(many, manyVotes, {group, page})

export const Many = cast(many, manyVotes, 'votes')

export const AyePage2 = manyAt('aye', '2')

export const AyeLastPage = manyAt('aye', lastPage(listSize('Standard', true)))

export const NayMany = manyAt('nay')

export const NayPage2 = manyAt('nay', '2')

export const NayLastPage = manyAt('nay', lastPage(listSize('Standard', false)))

export const SplitMany = manyAt('split')

export const SplitPage2 = manyAt('split', '2')

export const SplitLastPage = manyAt('split', lastPage(listSize('Split')))

export const AbstainMany = manyAt('abstain')

export const AbstainPage2 = manyAt('abstain', '2')

export const AbstainLastPage = manyAt('abstain', lastPage(listSize('SplitAbstain')))

const withDelegators = (list: object[]) => cast(delegatedRef, delegatedVotes, 'votes', {}, list)

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

// the delegation made once the referendum had ended is not one it counted, so
// the vote list leaves it out though the target holds it today
const endedRef = {...curated(0), id: '26', index: 26, title: 'A delegation made after the end stays off the vote list'}
const countedDelegation = delegation(anon(90), PEOPLE[0], 'Locked1x', numn(5_000), '31')
const laterDelegation = delegation(anon(91), PEOPLE[0], 'Locked3x', numn(70_000), '31')
export const DelegatedAfterEnd = withPlay(
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
