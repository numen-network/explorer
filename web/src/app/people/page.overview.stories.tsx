import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {pageMeta} from '../../../.storybook/page'
import PeoplePage from './page'
import {EVERY_VERDICT, MANY, identities, tileText} from './page.stories.helpers'

export default {title: 'Pages/People/Overview', ...pageMeta(PeoplePage)}

export const IdentitiesEveryVerdict: StoryObj = {
    ...identities(EVERY_VERDICT),
    play: async ({canvasElement}) => expect(tileText(canvasElement, 'Direct identities')).toEqual(['Direct identities', '11', 'Sub identities', '0', '3 · verified5 · unverified3 · flagged']),
}

export const IdentitiesExtremeCounts = identities(MANY, {counts: {direct: 2_147_483_647, good: 1_234_567_890, bad: 98_765_432, both: 1_234_567, subs: 1_000_000}})
