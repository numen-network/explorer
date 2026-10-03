import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import TimeAgo from './TimeAgo'

const meta = {title: 'Components/TimeAgo'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const ago = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString()

const CASES: [label: string, iso: string][] = [
    ['clock ahead of the block', ago(-90)],
    ['just now', ago(0)],
    ['seconds', ago(42)],
    ['minutes', ago(17 * 60)],
    ['hours', ago(5 * 3600)],
    ['days', ago(12 * 86400)],
    ['years in days', ago(800 * 86400)],
]

export const EveryRange: Story = {
    render: () => (
        <dl className="grid w-80 grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
            {CASES.map(([label, iso]) => (
                <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-mono">
                        <TimeAgo iso={iso} />
                    </dd>
                </div>
            ))}
        </dl>
    ),
}
