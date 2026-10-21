import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {chainInfo, HEAD} from '../../../../../mock/fixtures.js'
import {progressIn} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {curated, story} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Status', ...pageMeta(ReferendumPage)}

// a quarter into its decision period at the newest indexed block while the
// chain has run past the whole period, the bars read prepare, decision,
// confirmation and enactment
export const DecidingIndexBehind: StoryObj = {
    ...story({...curated(5), decidingSince: HEAD - 60_480}, 'call', {chainInfos: [{...chainInfo, head: HEAD + 300_000, finalizedHead: HEAD + 299_998}]}),
    play: async ({canvasElement}) => expect(progressIn(canvasElement)).toEqual([100, 25, 0, 0]),
}
