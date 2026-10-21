import type {Meta} from '@storybook/nextjs-vite'
import {CALL_ROWS, ROWS, table} from './ExtrinsicsTable.stories.helpers'

const meta = {title: 'Pages/Extrinsics/List'} satisfies Meta
export default meta

// every extrinsic shape, then the rows a pallet filter lists for calls under a root
export const EveryShape = table('list', [...ROWS, ...CALL_ROWS])

export const OneRow = table('list', ROWS.slice(2, 3))
