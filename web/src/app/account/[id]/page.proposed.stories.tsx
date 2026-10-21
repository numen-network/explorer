import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {proposals} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Proposed', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const One: StoryObj = {
    ...story({account: voting(numn(1_000)), proposed: proposals(1)}, {tab: 'proposed'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Referendum')).toEqual(['#1 · Referendum 1 title']),
}

const manyProposed = proposals(25)

export const Many = story({account: voting(numn(1_000)), proposed: manyProposed}, {tab: 'proposed'})

export const LastPage = story({account: voting(numn(1_000)), proposed: manyProposed}, {tab: 'proposed', page: lastPage(manyProposed.length)})
