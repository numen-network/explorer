import {expect, waitFor, within} from 'storybook/test'
import {numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {anon, castVotes, CHAIN, delegation, delegationData, standard, voteData} from '../../../../../mock/fixtures/governance.js'
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

// the every kind referendum holds one vote in each list
export const NayOne = story(everyAction.referendum, 'votes', everyAction.data, [], {group: 'nay'})

export const SplitOne = story(everyAction.referendum, 'votes', everyAction.data, [], {group: 'split'})

export const AbstainOne = story(everyAction.referendum, 'votes', everyAction.data, [], {group: 'abstain'})

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

// the delegators past the inline ten are counted under the list
const hiddenNote = (list: object[], note: string) =>
    withPlay(withDelegators(list), async context => {
        await expandRow('Polaris Guild')!(context)
        await expect(await context.canvas.findByRole('link', {name: note})).toBeVisible()
    })

export const DelegatorsOverInlineLimit = hiddenNote(fewAndMany, '3 more delegators on the account page')

export const DelegatorsOneOverInlineLimit = hiddenNote(delegators(PEOPLE[0], anons(80, 11)), '1 more delegator on the account page')

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

const nayVote = {...standard(PEOPLE[4], false, 'Locked1x', numn(5_000)), block: 965_000}
const searchVotes = [...delegatedVotes, nayVote]
const voterIs = (who: {id: string}) => (v: {voter: {id: string}}) => v.voter.id === who.id

// the server's answer to a search. keep picks the votes it finds, given the
// targets of the delegators it names
type Carried = (v: {voter: {id: string}}, carriers: string[]) => boolean
const searchAt = (query: Record<string, string>, keep: Carried, named: object[] = []) => {
    const {referendum, ...all} = castVotes(delegatedRef, searchVotes, fewAndMany)
    type Where = {AND?: {OR: [object, {voter: {id_in: string[]}}]}[]; delegator?: object}
    const hits = (where: Where) => voteData(referendum.index, searchVotes.filter(v => keep(v, where.AND![0].OR[1].voter.id_in)))
    return story(
        referendum,
        'votes',
        {
            ...all,
            votes: (args: {where: Where}) => (args.where.AND ? hits(args.where) : all).votes(args),
            votesConnection: (args: {where: Where}) => (args.where.AND ? hits(args.where) : all).votesConnection(args),
            delegatedVotes: (args: {where: Where; limit: number; offset?: number}) => (args.where.delegator ? named : all.delegatedVotes(args)),
        },
        [],
        query
    )
}

type Canvas = Parameters<NonNullable<Play>>[0]['canvas']

// the account cells of the list on screen, one per row
const accounts = async (canvas: Canvas) => {
    const rows = (await canvas.findAllByRole('row')).slice(1)
    return rows.map(row => row.querySelector('td')!.textContent)
}

const chips = (canvas: Canvas) => canvas.getAllByRole('link').filter(link => link.getAttribute('href')?.includes('group=') && !link.closest('[data-slot=card]')).map(link => `${link.textContent}|${link.getAttribute('href')}`)

// a name finds the vote it belongs to, every list counts what it finds and
// the list links keep the search
export const SearchVoter = withPlay(searchAt({q: 'Redshift'}, voterIs(PEOPLE[3])), async ({canvas}) => {
    await expect(await accounts(canvas)).toEqual(['Redshift'])
    await expect(canvas.getByPlaceholderText('Search for address/identity')).toHaveValue('Redshift')
    await expect(chips(canvas).filter(c => c.startsWith('Aye') || c.startsWith('Nay') || c.startsWith('Abstain'))).toEqual(
        ['Aye1', 'Nay0', 'Abstain0'].map((c, i) => `${c}|/referendum/22?tab=votes&group=${['aye', 'nay', 'abstain'][i]}&q=Redshift`)
    )
})

// a delegator's address finds the vote carrying its delegation
const delegatorOfRedshift = fewAndMany[0] as {who: {id: string}}
export const SearchDelegator = withPlay(
    searchAt({q: ss58Encode(delegatorOfRedshift.who.id, CHAIN.ss58)}, (v, carriers) => carriers.includes(v.voter.id), [{voter: {id: PEOPLE[3].id}}]),
    async ({canvas}) => {
        await expect(await accounts(canvas)).toEqual(['Redshift'])
    }
)

// a search that only finds nay opens the nay list
export const SearchOpensListWithHits = withPlay(searchAt({q: 'Spamlord'}, voterIs(PEOPLE[4])), async ({canvas}) => {
    await expect(await accounts(canvas)).toEqual(['Spamlord'])
    await expect(chips(canvas).find(c => c.startsWith('Nay'))).toMatch(/^Nay1\|/)
})

// the list a link asks for stays open though the search finds nothing in it
export const SearchKeepsListAsked = withPlay(searchAt({q: 'Spamlord', group: 'aye'}, voterIs(PEOPLE[4])), async ({canvas}) => {
    await expect(await accounts(canvas)).toEqual(['No matching aye votes.'])
})

export const SearchNoMatch = withPlay(searchAt({q: 'nobody by this name'}, () => false), async ({canvas}) => {
    await expect(await accounts(canvas)).toEqual(['No matching aye votes.'])
})
