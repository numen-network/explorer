import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, named} from './page.stories.helpers'

export default {title: 'Pages/Account/Registrar', ...pageMeta(AccountPage), decorators: [wellKnown]}

// a registrar seat is a tab of its own with no strip under it
export const NoSubStrip: StoryObj = {
    ...story({account: named(), registrar: 2}, {tab: 'registrar'}),
    play: async ({canvas}) => {
        expect(canvas.queryByRole('navigation', {name: 'Registrar'})).toBeNull()
        expect(canvas.getByText('Requests received')).toBeVisible()
    },
}
