import type {StoryObj} from '@storybook/nextjs-vite'
import {userEvent, within} from 'storybook/test'
import type {EventRow} from '@/lib/gql'
import {HEAD} from '../../../mock/fixtures.js'
import {batchAll, mined, sessionStart, timestampSet} from '../../../mock/fixtures/blocks.js'

export const BLOCK_EVENTS = mined(HEAD - 160, [timestampSet, batchAll], {initialization: sessionStart(HEAD - 160)}).events as EventRow[]

export const opening = (name: string): StoryObj['play'] => async ({canvasElement}) => {
    await userEvent.click(within(canvasElement).getAllByText(name)[0])
}
