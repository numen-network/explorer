import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {tabCount} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import ValidatorsPage from './page'
import {validator} from './page.stories.helpers'

export default {title: 'Pages/Validators/Tabs', ...pageMeta(ValidatorsPage)}

// opened without a tab the page lands on Validators, and every tab counts its list
export const EveryTab: StoryObj = {
    ...pageStory({validators: [validator(1), validator(2)], validatorsConnection: {totalCount: 2}, validatorStepsConnection: {totalCount: 12}, sessionsConnection: {totalCount: 16_667}}),
    play: async ({canvas}) => {
        const nav = canvas.getByRole('navigation', {name: 'Validators'})
        const slugs = within(nav).getAllByRole('link').map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab')!)
        expect(slugs).toEqual(['validators', 'history', 'sessions'])
        expect(within(nav).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Validators/)
        expect(slugs.map(slug => tabCount(nav, slug))).toEqual(['2', '12', '16,667'])
    },
}
