import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Fragment, type ReactNode} from 'react'
import {CircleAlert, CircleCheck, CircleQuestionMark, CircleX} from 'lucide-react'
import {identity} from '../../../mock/fixtures.js'
import {JudgementBadge, MarkDisc, verdictOf, type Verdict} from './JudgementBadge'

const meta = {title: 'Components/JudgementBadge'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const VERDICTS: Verdict[] = ['verified', 'stale', 'pending', 'unjudged', 'bad']

const JUDGEMENTS = [
    ['Unknown'],
    ['FeePaid'],
    ['Reasonable'],
    ['KnownGood'],
    ['OutOfDate'],
    ['LowQuality'],
    ['Erroneous'],
    [],
    ['FeePaid', 'OutOfDate'],
    ['OutOfDate', 'Reasonable'],
    ['KnownGood', 'Erroneous'],
]

const SIZES = ['text-xs', 'text-sm', 'text-base', 'text-xl', 'text-4xl']
const FILLS = ['--color-good', '--color-warn', '--color-destructive', '--color-dim']
const MARKS = [CircleCheck, CircleAlert, CircleX, CircleQuestionMark]

function Case({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="grid grid-cols-[220px_minmax(0,1fr)] items-center gap-4 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="flex items-center gap-1 text-sm">{children}</span>
        </div>
    )
}

export const EveryVerdict: Story = {
    render: () => (
        <>
            {VERDICTS.map(v => (
                <Case key={v} label={v}>
                    <JudgementBadge verdict={v} />
                    <span className="font-medium">Polaris Guild</span>
                </Case>
            ))}
        </>
    ),
}

export const EveryJudgement: Story = {
    render: () => (
        <>
            {JUDGEMENTS.map(kinds => {
                const verdict = verdictOf(identity('Polaris Guild', {judgements: kinds}).identityJson)
                return (
                    <Case key={kinds.join()} label={kinds.join(' and ') || 'no judgements'}>
                        {verdict && <JudgementBadge verdict={verdict} />}
                        <span className="text-muted-foreground">{verdict}</span>
                    </Case>
                )
            })}
            <Case label="no registration">
                <span className="text-muted-foreground">{verdictOf(null) ?? 'no badge'}</span>
            </Case>
        </>
    ),
}

export const Sizes: Story = {
    render: () => (
        <>
            {SIZES.map(size => (
                <Case key={size} label={size}>
                    <span className={`flex items-center gap-1 ${size}`}>
                        {VERDICTS.map(v => (
                            <JudgementBadge key={v} verdict={v} />
                        ))}
                        <span className="font-medium">Polaris Guild</span>
                    </span>
                </Case>
            ))}
        </>
    ),
}

export const MarkDiscs: Story = {
    render: () => (
        <div className="grid w-fit grid-cols-[auto_repeat(4,auto)] items-center gap-x-4 gap-y-2">
            {FILLS.map(fill => (
                <Fragment key={fill}>
                    <span className="text-xs text-muted-foreground">{fill}</span>
                    {MARKS.map((mark, i) => (
                        <MarkDisc key={i} fill={`var(${fill})`} mark={mark} className="size-8" />
                    ))}
                </Fragment>
            ))}
        </div>
    ),
}
