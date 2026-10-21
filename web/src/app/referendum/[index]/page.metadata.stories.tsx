import {expect, within} from 'storybook/test'
import {castFromSnapshots} from '../../../../../mock/fixtures/governance.js'
import {expectNoHangingDots} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {Play, approvedHeld, approvedRefunded, curated, story, withPlay} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Metadata', ...pageMeta(ReferendumPage)}

// each depositor shares the first line of its row with the deposit
const depositorsInline: Play = async ({canvas}) => {
    for (const label of ['Submission deposit', 'Decision deposit']) {
        const value = (await canvas.findByText(label)).nextElementSibling as HTMLElement
        expect(within(value).getByRole('link').getBoundingClientRect().top).toBeCloseTo(value.getBoundingClientRect().top, 0)
    }
}

// every row holds a value, and no deposit row ends a line on its middle dot
export const EveryField = withPlay(story(approvedHeld, 'metadata', castFromSnapshots(approvedHeld)), async context => {
    await depositorsInline!(context)
    const rows = context.canvas.getByRole('tabpanel').querySelector('[data-slot=card]')!
    expect([...rows.children].filter(row => row.lastElementChild!.textContent === '—').map(row => row.firstElementChild!.textContent)).toEqual([])
    expectNoHangingDots(rows)
})

export const EmptyFields = story(
    {...curated(7), id: '16', index: 16, origin: null, proposalHash: null, submitter: null, deposits: []},
    'metadata'
)

// ended with both deposits back with their depositors, so neither reads as held
export const EndedDepositsRefunded = withPlay(story(approvedRefunded, 'metadata', castFromSnapshots(approvedRefunded)), async ({canvas}) => {
    const value = async (label: string) => (await canvas.findByText(label)).nextElementSibling as HTMLElement
    await expect(within(await value('Ended at')).getByRole('link', {name: '#588,640'})).toBeInTheDocument()
    for (const label of ['Submission deposit', 'Decision deposit']) await expect(await value(label)).toHaveTextContent(/^—$/)
})
