import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import * as echarts from 'echarts'
import {expect, waitFor} from 'storybook/test'
import {VoteGrid} from './charts'
import type {GridCell, GridVote} from '@/lib/voteGrid'
import {Card} from './ui/card'

const meta = {title: 'Components/VoteGrid'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const VOTES: GridVote[] = ['aye', 'aye', 'nay', null, 'aye', 'abstain', 'aye', 'nay', null, 'split']

const cells = (count: number): GridCell[] => Array.from({length: count}, (_, index) => ({index, title: index % 3 ? `Referendum ${index} title` : null, vote: VOTES[index % VOTES.length]}))

const grid = (count: number): Story => ({
    render: () => (
        <Card className="gap-3 px-5 py-4">
            <VoteGrid cells={cells(count)} />
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

// five to a column, top to bottom, the last column part full
export const EveryVote: Story = {
    ...grid(14),
    play: async ({canvasElement}) => {
        const {series, dataZoom} = await chartIn(canvasElement)
        expect(series[0].data.slice(4, 6)).toEqual([
            [0, 4],
            [1, 0],
        ])
        expect(dataZoom[1].show).toBe(false)
    },
}

// more columns than the card holds scroll, opening on the newest
export const MoreThanFit: Story = {
    ...grid(1500),
    play: async ({canvasElement}) => {
        await waitFor(async () => expect((await chartIn(canvasElement)).dataZoom[1].show).toBe(true))
        expect((await chartIn(canvasElement)).dataZoom[0].endValue).toBe(299.5)
    },
}
