import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import data, {referenda, referendaCount} from '../../../../mock/data.js'
import {graphqlData} from '../../../.storybook/graphql'
import GovernancePage from './page'

const meta = {
    title: 'Governance/Referenda list',
    loaders: [async () => ({page: await GovernancePage({params: Promise.resolve({}), searchParams: Promise.resolve({tab: 'referenda'})})})],
    render: (_, {loaded}) => loaded.page,
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const withReferenda = (rows: object[]): Story => ({
    parameters: {msw: [graphqlData({...data, referendums: rows, referendumsConnection: referendaCount(rows)})]},
})

export const Empty = withReferenda([])

export const One = withReferenda(referenda.slice(0, 1))

export const EveryCase = withReferenda(referenda)

export const Many = withReferenda(Array.from({length: 40}, (_, i) => ({...referenda[i % referenda.length], id: String(i), index: i})))
