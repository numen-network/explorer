import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {HEAD, person} from '../../../../../mock/fixtures.js'
import {heartbeat, mined, timestampSet, transfer, vestingPayout} from '../../../../../mock/fixtures/blocks.js'
import {pageMeta} from '../../../../.storybook/page'
import BlockPage from './page'
import {QUIET, detail, genesis} from './page.stories.helpers'

export default {title: 'Pages/Block/Extrinsics', ...pageMeta(BlockPage)}

const crowd = (i: number) => (i % 4 === 0 ? heartbeat : (height: number) => transfer(height, {from: person(i), to: person(i + 3)}))
const CROWDED = mined(HEAD - 400, [timestampSet, ...Array.from({length: 44}, (_, i) => crowd(i))])
const PAYOUT_SIZES = [526, 731, 412, 650]
const PAYOUTS = mined(HEAD - 520, [timestampSet, ...PAYOUT_SIZES.map(count => (height: number) => vestingPayout(height, {count}))])

export const One = detail(QUIET)

export const Many = detail(CROWDED)

export const ManyLastPage = detail(CROWDED, {page: 3})

// thousands of leaf calls across one block, each row counting its own
export const PayoutBatches: StoryObj = {
    ...detail(PAYOUTS),
    play: async ({canvas}) => {
        for (const count of PAYOUT_SIZES) await expect(canvas.getByText(`${count}× Vesting.vested_transfer`)).toBeVisible()
    },
}

export const EmptyGenesis = genesis()
