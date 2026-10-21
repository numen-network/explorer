import {expect, within} from 'storybook/test'
import {expectNoHangingDots} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {Play, curated, story, curatedCase, withPlay} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Metadata', ...pageMeta(ReferendumPage)}

// each depositor shares the first line of its row with the deposit
const depositorsInline: Play = async ({canvas}) => {
    for (const label of ['Submission deposit', 'Decision deposit']) {
        const value = (await canvas.findByText(label)).nextElementSibling as HTMLElement
        expect(within(value).getByRole('link').getBoundingClientRect().top).toBeCloseTo(value.getBoundingClientRect().top, 0)
    }
}

export const EveryField = withPlay(curatedCase(6, 'metadata'), async context => {
    await depositorsInline!(context)
    expectNoHangingDots(context.canvasElement)
})

export const EmptyFields = story(
    {...curated(7), id: '16', index: 16, origin: null, proposalHash: null, submitter: null, deposits: []},
    'metadata'
)

export const Approved = withPlay(curatedCase(0, 'metadata'), async ({canvas}) => {
    await expect(canvas.getByText('Approved')).toBeInTheDocument()
    const ended = (await canvas.findByText('Ended at')).nextElementSibling as HTMLElement
    await expect(within(ended).getByRole('link', {name: '#588,640'})).toBeInTheDocument()
})
