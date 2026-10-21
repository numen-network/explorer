import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {ss58Encode} from '@/lib/ss58'
import {PEOPLE, base, chainInfo} from '../../../../mock/fixtures.js'
import {expectFits} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import SearchPage from './page'
import {hits, results, NOVA} from './page.stories.helpers'

export default {title: 'Pages/Search/Query', ...pageMeta(SearchPage)}

export const NoQuery = pageStory({})

export const NothingFound = results('zzz', [], [])

// a query that matches one thing anywhere opens it
export const OneAccountRedirects = pageStory(hits([PEOPLE[5]], []), {searchParams: {q: 'nova fund'}, redirect: `/account/${ss58Encode(PEOPLE[5].id, chainInfo.ss58)}`})

export const OneTokenRedirects = pageStory(hits([], [NOVA]), {searchParams: {q: 'nova points'}, redirect: `/token/${NOVA.id}`})

const HASH = '0x' + 'ab'.repeat(32)
const lookups = (account: object | null) => ({blocks: ({where}: {where?: object}) => (where ? [] : base.blocks()), extrinsics: [], evmTransactions: [], accountById: account, ...hits([], [])})

// a 32 byte hex that is no block, extrinsic or transaction opens the account it names
export const HashOfAnAccountRedirects = pageStory(lookups({id: HASH}), {searchParams: {q: HASH}, redirect: `/account/${ss58Encode(HASH, chainInfo.ss58)}`})

export const HashNothingFound: StoryObj = {
    ...pageStory(lookups(null), {searchParams: {q: HASH}}),
    play: async ({canvas}) => {
        expect(canvas.getByText(/^Nothing found/)).toBeVisible()
        expectFits(canvas.getByRole('heading', {level: 1}))
    },
}
