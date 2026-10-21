import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {pageMeta} from '../../../.storybook/page'
import PeoplePage from './page'
import {EVERY_AUTHORITY, EVERY_USERNAME, EVERY_VERDICT, MANY, WITH_SUBS, identities, tileText} from './page.stories.helpers'

export default {title: 'Pages/People/Overview', ...pageMeta(PeoplePage)}

export const IdentitiesEveryVerdict: StoryObj = {
    ...identities(EVERY_VERDICT),
    play: async ({canvasElement}) => expect(tileText(canvasElement, 'Direct identities')).toEqual(['Direct identities', '11', 'Sub identities', '0', '3 · verified5 · unverified3 · flagged']),
}

export const IdentitiesWithSubs: StoryObj = {
    ...identities(WITH_SUBS),
    play: async ({canvasElement}) => expect(tileText(canvasElement, 'Direct identities')).toEqual(['Direct identities', '4', 'Sub identities', '104', '4 · verified0 · unverified0 · flagged']),
}

export const IdentitiesExtremeCounts = identities(MANY, {counts: {direct: 2_147_483_647, good: 1_234_567_890, bad: 98_765_432, both: 1_234_567, subs: 1_000_000}})

// the tile splits the usernames by status
export const UsernamesEveryStatus: StoryObj = {
    ...identities(EVERY_VERDICT, {usernames: EVERY_USERNAME}),
    play: async ({canvasElement}) => expect(tileText(canvasElement, 'Usernames')).toEqual(['Usernames', '7', '5 · active1 · pending1 · unbinding']),
}

// the allocations left add up past the largest count one authority can hold
export const AuthoritiesAllocationLeft: StoryObj = {
    ...identities(EVERY_VERDICT, {authorities: EVERY_AUTHORITY}),
    play: async ({canvasElement}) => expect(tileText(canvasElement, 'Authorities')).toEqual(['Authorities', '4', '2,147,483,741 · allocation left']),
}
