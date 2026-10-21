import type {Meta} from '@storybook/nextjs-vite'
import {ROWS, table} from './ExtrinsicsTable.stories.helpers'

const meta = {title: 'Pages/Extrinsics/List'} satisfies Meta
export default meta

export const EveryShape = table('list', ROWS)

export const OneRow = table('list', ROWS.slice(2, 3))

export const Empty = table('list', [])
