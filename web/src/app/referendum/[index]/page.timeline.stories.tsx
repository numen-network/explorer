import {expect, within} from 'storybook/test'
import {numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {castFromSnapshots, eventsById, proposal, snapshots, step, stepEvents} from '../../../../../mock/fixtures/governance.js'
import type {RawStep} from '@/components/timeline'
import {expectFits, expectTimesFit, expectWholeWords, tabPanel} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {Play, curated, story, curatedCase, withPlay, treasurySpend, secondAttempt} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Timeline', ...pageMeta(ReferendumPage)}

// an approved referendum ends at Confirmed with no Approved step. Executed
// ticks when the dispatch went through, else reads Failed with the error
// wrapped between whole words
const approvedRail = (confirmed: string, enacted: string, error: string | null = null): Play => async ({canvas, canvasElement}) => {
    const step = async (title: string, block: string) => {
        const item = (await within(tabPanel(canvasElement, 'Referendum')).findByText(title)).closest<HTMLElement>('li')!
        await expect(within(item).getByRole('link', {name: block})).toBeInTheDocument()
        return item
    }
    await step('Confirmed', confirmed)
    await expect(within(tabPanel(canvasElement, 'Referendum')).queryByText('Approved')).toBeNull()
    const enactment = await step('Executed', enacted)
    if (error == null) {
        await expect(enactment.querySelector('.lucide-check')).not.toBeNull()
        await expect(within(enactment).queryByText('Failed')).toBeNull()
    } else {
        await expect(enactment.querySelector('.lucide-x')).not.toBeNull()
        await expect(within(enactment).getByText('Failed')).toBeInTheDocument()
        expectWholeWords(within(enactment).getByText(error))
    }
}

// every step's time breaks inside the card
export const ApprovedEarly = withPlay(curatedCase(10, 'timeline'), async context => {
    await approvedRail('#698,640', '#707,280')!(context)
    expectTimesFit(tabPanel(context.canvasElement, 'Referendum'))
})

export const Rejected = curatedCase(1, 'timeline')

export const TimedOut = curatedCase(11, 'timeline')

// referendum #12 enacted the cancel, so the step names it by its title
const cancelled = curated(2)
const canceller = {index: 12, title: 'Cancel referendum #2, its registrar already holds a seat'}
const titles = ({where}: {where?: {index_in?: number[]}}) => (where?.index_in ? [canceller] : [cancelled])

export const Cancelled = withPlay(story(cancelled, 'timeline', {...castFromSnapshots(cancelled), referendums: titles}), async ({canvas}) => {
    const item = (await canvas.findAllByText('Cancelled')).map(el => el.closest<HTMLElement>('li')).find(li => li != null)!
    await expect(within(item).getByText('By')).toBeInTheDocument()
    await expect(item.querySelector('dd a[href="/referendum/12"]')).toHaveTextContent(`#12 · ${canceller.title}`)
})

// the prime signs the kill. it slashes each deposit the referendum still held,
// newest first, and each slash names who lost what inside the kill's extrinsic
const killRail = (amounts: string[]): Play => async ({canvas}) => {
    const extrinsicOf = (step: HTMLElement) => step.querySelector('a[href^="/extrinsic/"]')?.textContent
    const killStep = (await canvas.findAllByText('Killed')).map(el => el.closest<HTMLElement>('li')).find(li => li != null)!
    await expect(within(killStep).getByText('By')).toBeInTheDocument()
    await expect(within(killStep).getByText(PEOPLE[1].identityDisplay!)).toBeInTheDocument()
    const kill = extrinsicOf(killStep)
    await expect(kill).toBeTruthy()
    const slashes = (await canvas.findAllByText('Deposit slashed')).map(el => el.closest<HTMLElement>('li')!)
    await expect(slashes.map(step => within(step).getByText(/NUMN$/).textContent)).toEqual(amounts)
    for (const step of slashes) {
        await expect(within(step).getByText('Who')).toBeInTheDocument()
        await expect(extrinsicOf(step)).toBe(kill)
    }
}

export const Killed = withPlay(curatedCase(4, 'timeline'), killRail(['1,000 NUMN', '5 NUMN']))

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

export const KilledBeforeDecisionDeposit = withPlay(story(killedEarly, 'timeline', castFromSnapshots(killedEarly)), killRail(['5 NUMN']))

// the first confirmation aborts once nays come in and the second one passes,
// newest first
export const TwoConfirmAttempts = withPlay(story(secondAttempt, 'timeline', castFromSnapshots(secondAttempt)), async ({canvas}) => {
    const rail = within((await canvas.findByText('Confirm aborted')).closest<HTMLElement>('ol')!)
    await expect(rail.getAllByText(/^Confirm/).map(title => title.textContent)).toEqual(['Confirmed', 'Confirming', 'Confirm aborted', 'Confirming'])
})

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

// the preimage was gone by dispatch time, so the call never ran
const unavailable = {
    ...curated(0),
    id: '27',
    index: 27,
    title: 'Approved after its preimage was unnoted, so the call was never found',
    timeline: (curated(0).timeline as RawStep[]).map(s => (s.name === 'Scheduler.Dispatched' ? {...s, name: 'Scheduler.CallUnavailable'} : s)),
}

export const CallUnavailable = withPlay(story(unavailable, 'timeline', castFromSnapshots(unavailable)), async ({canvasElement}) => {
    const rail = within(tabPanel(canvasElement, 'Referendum'))
    const item = (await rail.findByText('Call unavailable')).closest<HTMLElement>('li')!
    await expect(item.querySelector('.lucide-x')).not.toBeNull()
    await expect(rail.queryByText('Executed')).toBeNull()
})

// every step keeps each value whole and inside the card, whether its rows sit
// beside the title or drop below it
export const EnactmentFailed = withPlay(story(overCap, 'timeline', {...castFromSnapshots(overCap), events: eventsById(overCapEvents)}), async context => {
    await approvedRail('#588,640', '#597,280', 'Treasury.InsufficientPermission')!(context)
    const rail = tabPanel(context.canvasElement, 'Referendum')
    const values = [...rail.querySelectorAll('dl dd')]
    await expect(values.length).toBeGreaterThan(0)
    expectWholeWords(...values)
    expectFits(...rail.querySelectorAll('[data-slot=card]'))
})
