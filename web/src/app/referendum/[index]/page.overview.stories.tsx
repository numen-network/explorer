import {expect, within} from 'storybook/test'
import {PEOPLE} from '../../../../../mock/fixtures.js'
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
