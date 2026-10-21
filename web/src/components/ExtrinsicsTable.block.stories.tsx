import type {Meta} from '@storybook/nextjs-vite'
import {ROWS, table} from './ExtrinsicsTable.stories.helpers'

const meta = {title: 'Pages/Block/Extrinsics'} satisfies Meta
export default meta

export const EveryShape = table('block', ROWS)
