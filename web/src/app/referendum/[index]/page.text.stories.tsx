import {castFromSnapshots, metadataAction} from '../../../../../mock/fixtures/governance.js'
import {expectFits, expectTimesFit} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {curated, story, curatedCase, withPlay, PREIMAGE, refundTitle} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Text history', ...pageMeta(ReferendumPage)}

export const Empty = curatedCase(6, 'text')

const pitch = `Pays a pilot cohort of three community teams from the medium spender track.

Each team reports monthly in the forum thread, and anything unspent after six months goes back to the treasury.`

const texts = [
    metadataAction(990_500, 4, 'MetadataSet', {title: curated(6).title, description: pitch}),
    metadataAction(975_100, 3, 'MetadataCleared', {hash: '0x' + 'be'.repeat(32)}),
    metadataAction(962_000, 5, 'MetadataSet', {hash: '0x' + 'be'.repeat(32)}),
    metadataAction(960_020, 2, 'MetadataSet', {title: 'Fund the medium spender pilot', description: 'First draft of the pitch, before the budget was split.'}),
]

export const SeveralVersions = story({...curated(6), description: pitch}, 'text', castFromSnapshots(curated(6)), texts)

const drafts = Array.from({length: 45}, (_, i) =>
    i % 4 === 3
        ? metadataAction(990_000 - i * 700, 2, 'MetadataCleared', {hash: '0x' + 'be'.repeat(32)})
        : metadataAction(990_000 - i * 700, 2 + (i % 3), 'MetadataSet', {title: `Fund the medium spender pilot, draft ${45 - i}`, description: pitch})
)

export const Many = story(curated(6), 'text', {}, drafts)

export const Page2 = story(curated(6), 'text', {}, drafts, {page: '2'})

export const LastPage = story(curated(6), 'text', {}, drafts, {page: lastPage(drafts.length)})

const refundPitch = `Preimage ${PREIMAGE} was noted twice, so this pays back the second deposit.`

export const LongTokens = withPlay(
    story({...curated(6), title: refundTitle, description: refundPitch}, 'text', {}, [metadataAction(990_500, 4, 'MetadataSet', {title: refundTitle, description: refundPitch})]),
    async ({canvas, canvasElement}) => {
        expectFits(...canvas.getAllByText(refundTitle), ...canvas.getAllByText(refundPitch))
        expectTimesFit(canvasElement)
    }
)
