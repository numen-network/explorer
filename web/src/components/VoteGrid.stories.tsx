import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import * as echarts from 'echarts'
import {expect, waitFor} from 'storybook/test'
import {VoteGrid} from './charts'
import type {GridCell, GridVote} from '@/lib/voteGrid'
import {recordTip} from '@/app/account/[id]/page.stories.helpers'
import {Card} from './ui/card'

const meta = {title: 'Pages/Account/Governance | Direct votes'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const VOTES: GridVote[] = ['aye', 'aye', 'nay', null, 'aye', 'abstain', 'aye', 'nay', null, 'split']

const cells = (count: number): GridCell[] =>
    Array.from({length: count}, (_, index) => ({index, title: index % 3 ? `Referendum ${index} title` : null, vote: VOTES[index % VOTES.length], delegated: false, facts: [{label: null, rows: [['Track', 'Root']]}]}))

const grid = (count: number, rows = cells(count)): Story => ({
    render: () => (
        <Card className="gap-3 px-5 py-4">
            <VoteGrid cells={rows} />
        </Card>
    ),
})

// the chart echarts drew, read once its first frame is in
const chartIn = async (root: HTMLElement) => {
    let chart: echarts.ECharts | undefined
    await waitFor(() => {
        chart = echarts.getInstanceByDom(root.querySelector('[_echarts_instance_]') as HTMLElement)
        expect(chart).toBeDefined()
    })
    return chart!.getOption() as {series: {data: number[][]}[]; dataZoom: {show?: boolean; endValue: number}[]}
}

// five to a column, top to bottom, the last column part full, and three columns fit with no slider
export const RecordFiveToAColumn: Story = {
    ...grid(14),
    play: async ({canvasElement}) => {
        const {series, dataZoom} = await chartIn(canvasElement)
        expect(series[0].data.slice(4, 6)).toEqual([
            [0, 4],
            [1, 0],
        ])
        expect(series[0].data.at(-1)).toEqual([2, 3])
        expect(dataZoom[1].show).toBe(false)
    },
}

// more columns than the card holds scroll, opening on the newest
export const RecordMoreThanFit: Story = {
    ...grid(1500),
    play: async ({canvasElement}) => {
        await waitFor(async () => expect((await chartIn(canvasElement)).dataZoom[1].show).toBe(true))
        expect((await chartIn(canvasElement)).dataZoom[0].endValue).toBe(299.5)
    },
}

// a delegation's votes draw hollow beside the account's own
export const RecordDelegatedSquares = grid(
    10,
    cells(10).map((c, i) => (i >= 4 && i < 8 ? {...c, vote: i % 2 ? 'nay' : 'aye', delegated: true} : c))
)

// the tooltip opens on the referendum and lists each fact by name, a titled
// block under its title. a delegate's name stays plain text
export const RecordTooltipRows: Story = {
    ...grid(
        3,
        cells(3).map((c, i) => (i === 1 ? {...c, delegated: true, facts: [{label: null, rows: [['Vote', 'Aye'], ['Delegate', 'Orbit <b>Labs</b>']]}, {label: 'Received votes', rows: [['Delegators', '2']]}]} : c))
    ),
    play: async ({canvasElement}) => {
        const tip = await recordTip(canvasElement)
        expect(tip(1)).toEqual({head: '#1 · Referendum 1 title', Vote: 'Aye', Delegate: 'Orbit <b>Labs</b>', 'Received votes': {Delegators: '2'}})
        expect(tip(0)).toEqual({head: '#0', Track: 'Root'})
    },
}
