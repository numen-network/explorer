import {expect, within} from 'storybook/test'
import {castFromSnapshots} from '../../../../../mock/fixtures/governance.js'
import {expectNoHangingDots, tabPanel} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {Play, approvedHeld, approvedRefunded, curated, killedSlashed, story, withPlay} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Metadata', ...pageMeta(ReferendumPage)}

// each depositor shares the first line of its row with the deposit
const depositorsInline: Play = async ({canvas}) => {
    for (const label of ['Submission deposit', 'Decision deposit']) {
        const value = (await canvas.findByText(label)).nextElementSibling as HTMLElement
        expect(within(value).getAllByRole('link')[0].getBoundingClientRect().top).toBeCloseTo(value.getBoundingClientRect().top, 0)
    }
}

// every row holds a value, and no deposit row ends a line on its middle dot
export const EveryField = withPlay(story(approvedHeld, 'metadata', castFromSnapshots(approvedHeld)), async context => {
    await depositorsInline!(context)
    const rows = tabPanel(context.canvasElement, 'Referendum').querySelector('[data-slot=card]')!
    expect([...rows.children].filter(row => row.lastElementChild!.textContent === '—').map(row => row.firstElementChild!.textContent)).toEqual([])
    expectNoHangingDots(rows)
})

export const EmptyFields = story(
    {...curated(7), id: '16', index: 16, origin: null, proposalHash: null, submitter: null, deposits: []},
    'metadata'
)

const depositValue = async (canvas: Parameters<NonNullable<Play>>[0]['canvas'], label: string) => (await canvas.findByText(label)).nextElementSibling as HTMLElement

// ended with both deposits back with their depositors, each row names the refund and its block
export const EndedDepositsRefunded = withPlay(story(approvedRefunded, 'metadata', castFromSnapshots(approvedRefunded)), async context => {
    await depositorsInline!(context)
    for (const label of ['Submission deposit', 'Decision deposit']) {
        const value = await depositValue(context.canvas, label)
        await expect(value).toHaveTextContent(/NUMN .* · Refunded · #588,640$/)
        await expect(within(value).getByRole('link', {name: '#588,640'})).toBeInTheDocument()
    }
    expectNoHangingDots(tabPanel(context.canvasElement, 'Referendum').querySelector('[data-slot=card]')!)
})

// a kill slashes both deposits, each row names the slash and its block
export const EndedDepositsSlashed = withPlay(story(killedSlashed, 'metadata'), async ({canvas}) => {
    for (const label of ['Submission deposit', 'Decision deposit']) {
        const value = await depositValue(canvas, label)
        await expect(value).toHaveTextContent(/NUMN .* · Slashed · #790,000$/)
        expect(within(value).getByText('Slashed')).toHaveClass('text-destructive')
    }
})

// no decision deposit was ever placed
export const DepositNeverPlaced = withPlay(story({...curated(5), deposits: (curated(5).deposits as object[]).slice(0, 1)}, 'metadata'), async ({canvas}) =>
    expect(await depositValue(canvas, 'Decision deposit')).toHaveTextContent(/^—$/)
)

const enactValue = async (canvas: Parameters<NonNullable<Play>>[0]['canvas']) => ((await canvas.findByText('Enact')).nextElementSibling as HTMLElement).textContent

// still deciding, so only the requested moment is known
export const EnactRequested = withPlay(story(curated(5), 'metadata'), async ({canvas}) => expect(await enactValue(canvas)).toBe('After: 8,640'))

// approved with the track's minimum delay, so it runs that many blocks after confirmation
export const EnactAfterScheduled = withPlay(story(approvedRefunded, 'metadata', castFromSnapshots(approvedRefunded)), async ({canvas}) =>
    expect(await enactValue(canvas)).toBe('After: 8,640 · #597,280')
)

// approved, a requested block later than the track's minimum stands as asked
export const EnactAtScheduled = withPlay(
    story({...approvedRefunded, enactment: {__kind: 'At', value: 620_000}, enactsAt: 620_000}, 'metadata', castFromSnapshots(approvedRefunded)),
    async ({canvas}) => expect(await enactValue(canvas)).toBe('At: 620,000 · #620,000')
)
