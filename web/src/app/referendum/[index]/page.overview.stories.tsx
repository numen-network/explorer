import {expect, userEvent, waitFor, within} from 'storybook/test'
import {PEOPLE} from '../../../../../mock/fixtures.js'
import {metadataAction} from '../../../../../mock/fixtures/governance.js'
import {expectFits, expectNoHangingDots, expectTimesFit} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {curated, story, curatedCase, withPlay, markdownPitch, refundTitle, refundPitch} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Overview', ...pageMeta(ReferendumPage)}

// the card a referendum's title heads
const overviewOf = (root: HTMLElement, title: string) => within(within(root).getByText(title).closest<HTMLElement>('[data-slot=card]')!)

export const TimedOutWithoutTitle = curatedCase(3)

// the description reads as markdown
export const DescriptionMarkdown = withPlay(story({...curated(6), description: markdownPitch}, 'call'), async ({canvasElement}) => {
    const overview = overviewOf(canvasElement, curated(6).title as string)
    expect(await overview.findAllByRole('heading', {name: 'Budget'})).toHaveLength(1)
    expect(overview.getAllByRole('table')).toHaveLength(1)
    expect(overview.getAllByRole('link', {name: 'forum thread'})).toHaveLength(1)
})

// a title and a description that each carry a 66 character hash break inside the card
export const LongTokens = withPlay(story({...curated(6), title: refundTitle, description: refundPitch}, 'call'), async ({canvasElement}) => {
    const overview = overviewOf(canvasElement, refundTitle)
    expectFits(overview.getByText(refundTitle), overview.getByText(refundPitch))
})

// the longest display name, the track and the submission time wrap inside the
// card, and no line ends on a middle dot
export const LongByline = withPlay(story({...curated(10), submitter: PEOPLE[7]}, 'call'), async ({canvasElement}) => {
    const overview = within(canvasElement).getByText(curated(10).title as string).closest<HTMLElement>('[data-slot=card]')!
    expectTimesFit(overview)
    expectNoHangingDots(overview)
})

const milestones = (n: number) => Array.from({length: n}, (_, i) => `Milestone ${i + 1} pays the team once the forum report is posted.`).join('\n\n')
const foldOf = (root: HTMLElement) => overviewOf(root, curated(6).title as string).getByText('Milestone 1 pays', {exact: false}).closest<HTMLElement>('.prose')!.parentElement!.parentElement!

// a description over 2000px folds to 640px and opens with Show More
export const DescriptionFolded = withPlay(story({...curated(6), description: milestones(60)}, 'call'), async ({canvasElement}) => {
    const fold = foldOf(canvasElement)
    const more = await within(fold).findByRole('button', {name: 'Show More'})
    expect(fold.getBoundingClientRect().height).toBe(640)
    await userEvent.click(more)
    expect(await within(fold).findByRole('button', {name: 'Show Less'})).toHaveAttribute('aria-expanded', 'true')
    expect(fold.getBoundingClientRect().height).toBeGreaterThan(2000)
    await userEvent.click(within(fold).getByRole('button', {name: 'Show Less'}))
    expect(await within(fold).findByRole('button', {name: 'Show More'})).toBeVisible()
})

// a description taller than 640px but under 2000px shows in full with no button
export const DescriptionUnderFold = withPlay(story({...curated(6), description: milestones(20)}, 'call'), async ({canvasElement}) => {
    const fold = foldOf(canvasElement)
    await waitFor(() => expect(fold.getBoundingClientRect().height).toBeGreaterThan(640))
    expect(fold.getBoundingClientRect().height).toBeLessThan(2000)
    expect(within(fold).queryByRole('button')).toBeNull()
})

const budget = (amount: string) => `This referendum proposes allocating ${amount} NUMN from the treasury to marketing campaigns and community airdrops.

Every payout is reported in the forum thread.`

// newest first, an unreadable preimage between two texts is no version of its own
const revisions = [
    metadataAction(990_500, 4, 'MetadataSet', {title: 'Marketing, airdrop, and task budget', description: budget('2,000,000')}),
    metadataAction(990_100, 2, 'MetadataSet', {title: 'Marketing, airdrop, and task budget', description: budget('1,000,000')}),
    metadataAction(980_000, 3, 'MetadataSet', {hash: '0x' + 'be'.repeat(32)}),
    metadataAction(975_100, 3, 'MetadataCleared', {hash: '0x' + 'be'.repeat(32)}),
    metadataAction(960_020, 2, 'MetadataSet', {title: 'Marketing budget', description: 'First draft.'}),
]
const latest = {...curated(6), title: revisions[0].title, description: revisions[0].description}

// the queries bound to a popup once it has faded in
const shown = async (popup: HTMLElement) => {
    await waitFor(() => expect(popup).toBeVisible())
    return within(popup)
}
const openHistory = async (root: HTMLElement) => {
    await userEvent.click(within(root).getByRole('button', {name: 'Edited'}))
    return shown(await within(document.body).findByRole('dialog'))
}
const openRevision = async (root: HTMLElement, item: RegExp) => {
    await userEvent.click((await openHistory(root)).getByRole('button', {name: item}))
    return shown(await within(document.body).findByRole('dialog', {name: 'Proposal Revision'}))
}

// every readable text is listed, the newest marked most recent and the first one original
export const Edited = withPlay(story(latest, 'call', {}, revisions), async ({canvasElement}) => {
    const list = await openHistory(canvasElement)
    expect(list.getByText('Edited 2 times')).toBeVisible()
    const items = list.getAllByRole('button')
    expect(items.map(i => i.textContent?.split(' ')[0])).toEqual(['Edited', 'Edited', 'Original'])
    expect(items[0]).toHaveTextContent(/\(most recent\)$/)
})

// a version shows its changes against the one before it
export const EditedChanges = withPlay(story(latest, 'call', {}, revisions), async ({canvasElement}) => {
    const revision = await openRevision(canvasElement, /most recent/)
    expect(revision.getByText(/^Edited at/)).toBeVisible()
    expect([...canvasElement.ownerDocument.querySelectorAll('[role=dialog] ins')].map(e => e.textContent)).toEqual(['2'])
    expect([...canvasElement.ownerDocument.querySelectorAll('[role=dialog] del')].map(e => e.textContent)).toEqual(['1'])
    expect(revision.getByText(revisions[0].hash)).toBeVisible()
    expect(revision.getByRole('link', {name: /990,500/})).toBeVisible()
    expect(revision.getByRole('link', {name: '990500-1'})).toBeVisible()
    expect(revision.getByRole('link', {name: '990500-4'})).toBeVisible()
})

// the original version reads as it was, with nothing marked
export const EditedOriginal = withPlay(story(latest, 'call', {}, revisions), async ({canvasElement}) => {
    const revision = await openRevision(canvasElement, /^Original/)
    expect(revision.getByText(/^Original at/)).toBeVisible()
    expect(revision.getByText('Marketing budget')).toBeVisible()
    expect(revision.getByRole('link', {name: '960020-2'})).toBeVisible()
    expect(canvasElement.ownerDocument.querySelectorAll('[role=dialog] ins, [role=dialog] del')).toHaveLength(0)
})

// a single edit reads in the singular
export const EditedOnce = withPlay(story(latest, 'call', {}, revisions.slice(0, 2)), async ({canvasElement}) => {
    expect((await openHistory(canvasElement)).getByText('Edited 1 time')).toBeVisible()
})

export const NotEdited = withPlay(story(latest, 'call', {}, revisions.slice(0, 1)), async ({canvasElement}) => {
    await within(canvasElement).findByText(latest.title)
    expect(within(canvasElement).queryByRole('button', {name: 'Edited'})).toBeNull()
})

// a clear on top leaves the card no text to call edited
export const ClearedAfterEdits = withPlay(
    story({...curated(6), title: null, description: null}, 'call', {}, [metadataAction(995_000, 3, 'MetadataCleared', {hash: revisions[0].hash}), ...revisions]),
    async ({canvasElement}) => {
        await within(canvasElement).findByText('No description provided.')
        expect(within(canvasElement).queryByRole('button', {name: 'Edited'})).toBeNull()
    }
)
