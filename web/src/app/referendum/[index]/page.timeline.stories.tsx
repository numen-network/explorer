import {expect, within} from 'storybook/test'
import {numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {castFromSnapshots, eventsById, proposal, snapshots, step, stepEvents} from '../../../../../mock/fixtures/governance.js'
import type {RawStep} from '@/components/timeline'
import {expectFits, expectTimesFit, expectWholeWords} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {Play, curated, story, curatedCase, withPlay, treasurySpend, secondAttempt} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Timeline', ...pageMeta(ReferendumPage)}

// an approved referendum ends where it confirmed and no step of its own reads
// Approved, its enactment ticks when the dispatch went through and otherwise
// reads Failed with the error, which wraps between whole words
const approvedRail = (confirmed: string, enacted: string, error: string | null = null): Play => async ({canvas}) => {
    const step = async (title: string, block: string) => {
        const item = (await canvas.findByText(title)).closest<HTMLElement>('li')!
        await expect(within(item).getByRole('link', {name: block})).toBeInTheDocument()
        return item
    }
    await step('Confirmed', confirmed)
    await expect(within(canvas.getByRole('tabpanel')).queryByText('Approved')).toBeNull()
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

// every step's time breaks inside the card
export const ApprovedEarly = withPlay(curatedCase(10, 'timeline'), async context => {
    await approvedRail('#698,640', '#707,280')!(context)
    expectTimesFit(context.canvas.getByRole('tabpanel'))
})

export const Rejected = curatedCase(1, 'timeline')

export const TimedOut = curatedCase(11, 'timeline')

export const Cancelled = curatedCase(2, 'timeline')

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

// every step keeps each value whole and inside the card, whether its rows sit
// beside the title or drop below it
export const EnactmentFailed = withPlay(story(overCap, 'timeline', {...castFromSnapshots(overCap), events: eventsById(overCapEvents)}), async context => {
    await approvedRail('#588,640', '#597,280', 'Treasury.InsufficientPermission')!(context)
    const rail = context.canvas.getByRole('tabpanel')
    const values = [...rail.querySelectorAll('dl dd')]
    await expect(values.length).toBeGreaterThan(0)
    expectWholeWords(...values)
    expectFits(...rail.querySelectorAll('[data-slot=card]'))
})
