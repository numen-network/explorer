import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {chainDays} from '../../../mock/fixtures/home.js'
import {HEAD} from '../../../mock/fixtures.js'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {home, minedUpTo, many} from './page.stories.helpers'

export default {title: 'Pages/Home/Network status', ...pageMeta(Home)}

// only genesis is indexed, with no timestamp and no validator row
export const Empty: StoryObj = {
    ...pageStory(home({head: 0, days: [], validators: 0})),
    play: async ({canvas}) => {
        for (const text of ['No mined blocks yet.', 'No transfers yet.', 'No referenda yet.']) await expect(canvas.getByText(text)).toBeInTheDocument()
        await expect(canvas.getByText('Session').nextElementSibling).toHaveTextContent(/^—$/)
    },
}

export const Indexing = pageStory(home({...many, best: HEAD + 4_000, finalized: HEAD + 3_998}))

// mainnet rebuilding from genesis, indexed to #30,979 while the chain stood at
// #220,176, every figure on the page reads #30,979
export const IndexBehind: StoryObj = {
    ...pageStory(home({head: 30_979, best: 220_176, finalized: 220_174, days: chainDays(30_979), objects: minedUpTo(30_979, 5, 220_174)})),
    play: async ({canvas}) => {
        const row = (label: string) => canvas.getByText(label, {selector: 'dt'}).nextElementSibling!
        await expect(row('Latest block')).toHaveTextContent(/^30,979$/)
        await expect(row('Latest block').querySelector('a')).toHaveAttribute('href', '/block/30979')
        await expect(row('Finalized')).toHaveTextContent(/^30,979$/)
        await expect(row('Session')).toHaveTextContent(/^#516$/)
        await expect(canvas.getByText('Block 20 / 60')).toBeInTheDocument()
    },
}
