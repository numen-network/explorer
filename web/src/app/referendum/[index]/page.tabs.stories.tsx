import {expect, within} from 'storybook/test'
import {castFromSnapshots, metadataAction} from '../../../../../mock/fixtures/governance.js'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {curated, story, withPlay} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Tabs', ...pageMeta(ReferendumPage)}

const texts = [
    metadataAction(990_500, 4, 'MetadataSet', {title: curated(6).title}),
    metadataAction(975_100, 3, 'MetadataCleared'),
    metadataAction(960_020, 2, 'MetadataSet', {title: 'Fund the medium spender pilot'}),
]

// opened without a tab the page lands on Call, and the text history, the
// timeline and the votes count their entries
export const EveryTab = withPlay(story(curated(6), '', castFromSnapshots(curated(6)), texts), async ({canvas, canvasElement}) => {
    // the call panel holds a table and json switch of its own
    const strip = within(canvas.getByRole('navigation', {name: 'Referendum'}))
    const call = strip.getByRole('link', {name: /^Call/})
    const slugs = strip.getAllByRole('link').map(tab => new URL(tab.getAttribute('href')!, 'http://x').searchParams.get('tab'))
    expect(slugs).toEqual(['call', 'metadata', 'text', 'timeline', 'votes', 'curves', 'statistics'])
    expect(call).toHaveAttribute('aria-current', 'page')
    expect(['text', 'timeline', 'votes'].map(slug => tabCount(canvasElement, slug))).toEqual(['3', '4', '5'])
})
