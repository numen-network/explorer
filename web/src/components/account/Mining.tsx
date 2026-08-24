import {BarsChart} from '@/components/charts'

// the summary already reads the day rows to total the blocks, so the chart
// takes them from there rather than asking again
export default function Mining({days}: {days: {day: string; blocks: number}[]}) {
    const chrono = [...days].reverse().slice(-30)
    return (
        <div className="card px-5 py-4">
            <BarsChart labels={chrono.map(d => d.day.slice(5))} values={chrono.map(d => d.blocks)} height={160} />
        </div>
    )
}
