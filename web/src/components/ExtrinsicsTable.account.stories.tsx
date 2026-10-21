import type {Meta} from '@storybook/nextjs-vite'
import {person} from '../../../mock/fixtures.js'
import {ROWS, table} from './ExtrinsicsTable.stories.helpers'

const meta = {title: 'Pages/Account/Extrinsics'} satisfies Meta
export default meta

// the tab lists what its account signed, so the unsigned rows stay out
export const EveryShape = table('account', ROWS.filter(x => x.signer !== null).map(x => ({...x, signer: person(0)})))
