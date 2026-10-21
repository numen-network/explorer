import type {Meta} from '@storybook/nextjs-vite'
import {ROWS, table} from './ExtrinsicsTable.stories.helpers'

const meta = {title: 'Pages/Account/Extrinsics'} satisfies Meta
export default meta

export const EveryShape = table('account', ROWS)
