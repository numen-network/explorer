import type {StoryObj} from '@storybook/nextjs-vite'
import {extrinsic, HEAD, hashOf, paged} from '../../../../../mock/fixtures.js'
import {expectShortHashes} from '../../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import ExtrinsicPage from './page'

export default {title: 'Pages/Extrinsic/Ambiguous hash', ...pageMeta(ExtrinsicPage)}

const shared = hashOf('replayed', 1)
const hit = (height: number, index: number) => {
    const {id, indexInBlock, pallet, method, success, block} = extrinsic(height, index)
    return {id, indexInBlock, hash: shared, pallet, method, success, block}
}

const ambiguous = (hits: object[], page = '1') => pageStory({extrinsics: paged(hits), extrinsicsConnection: {totalCount: hits.length}}, {params: {id: shared}, searchParams: {page}})

const replays = Array.from({length: 45}, (_, i) => hit(300_000 + i * 15_000, 1 + (i % 3)))

export const Few: StoryObj = {
    ...ambiguous([hit(412_007, 3), hit(698_311, 1), hit(HEAD - 42, 2)]),
    play: async ({canvas}) => expectShortHashes(canvas.getByRole('heading', {name: /^Extrinsic 0x/}).textContent!),
}

export const Many = ambiguous(replays)

export const LastPage = ambiguous(replays, lastPage(replays.length))
