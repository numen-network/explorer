import type {StoryObj} from '@storybook/nextjs-vite'
import {identitySet, identityTimeline, timelineVerdicts} from '../../../../../mock/fixtures/accounts.js'
import {HEAD} from '../../../../../mock/fixtures.js'
import {expectFits} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, named} from './page.stories.helpers'

export default {title: 'Pages/Account/Identity | Timeline', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const One = story({account: named(), timeline: [identitySet(HEAD - 10_000)]}, {tab: 'timeline'})

// the longest event name breaks inside its card
export const Many: StoryObj = {
    ...story(
        {
            account: named(),
            timeline: [...identityTimeline(), identitySet(HEAD - 12_000), identitySet(HEAD - 14_000), identitySet(HEAD - 16_000)],
            verdicts: timelineVerdicts(),
            counts: {timeline: 41},
        },
        {tab: 'timeline'}
    ),
    play: async ({canvas}) => expectFits(canvas.getByText('DanglingUsernameRemoved')),
}
