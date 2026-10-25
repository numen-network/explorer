import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {pageMeta} from '../../../.storybook/page'
import PeoplePage from './page'
import {EVERY_AUTHORITY, EVERY_USERNAME, identities, WITH_SUBS} from './page.stories.helpers'

export default {title: 'Pages/People/Tabs', ...pageMeta(PeoplePage)}

// opened without a tab the page lands on Identities, and every tab counts its list
export const EveryTab: StoryObj = {
    ...identities(WITH_SUBS, {usernames: EVERY_USERNAME, authorities: EVERY_AUTHORITY, tab: ''}),
    play: async ({canvas}) => {
        const links = within(canvas.getByRole('navigation', {name: 'People'})).getAllByRole('link')
        expect(links.map(a => [a.getAttribute('href'), a.querySelector('[data-slot=badge]')!.textContent, a.getAttribute('aria-current')])).toEqual([
            ['/people', '4', 'page'],
            ['/people?tab=pending', '0', null],
            ['/people?tab=registrars', '3', null],
            ['/people?tab=usernames', '7', null],
            ['/people?tab=authorities', '4', null],
        ])
    },
}
