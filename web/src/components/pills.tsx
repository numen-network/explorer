import Link from 'next/link'
import {fmtInt} from '@/lib/format'

export function FilterChip({label, count, href, active}: {label: string; count?: number; href: string; active: boolean}) {
    const cls = active ? 'border-accent bg-accent font-medium text-white' : 'border-edge bg-card text-sub hover:text-ink'
    return (
        <Link href={href} className={`rounded-full border px-3 py-1 text-xs whitespace-nowrap ${cls}`}>
            {label}
            {count != null && <span className={`ml-1.5 ${active ? 'text-white/70' : 'text-faint'}`}>{fmtInt(count)}</span>}
        </Link>
    )
}

const DOT_TONE = {
    pos: 'bg-pos',
    warn: 'bg-warn',
    neg: 'bg-neg',
    idle: 'bg-faint',
} as const

export function StatusDot({tone}: {tone: keyof typeof DOT_TONE}) {
    return <span className={`inline-block size-1.5 shrink-0 rounded-full ${DOT_TONE[tone]}`} />
}

export function HashPill({text}: {text: string}) {
    return <span className="rounded-md border border-edge bg-bg px-1.5 py-0.5 font-mono text-[11px] text-sub">{text}</span>
}

export function Tag({text, tone = 'idle'}: {text: string; tone?: 'pos' | 'warn' | 'neg' | 'idle' | 'accent'}) {
    const cls = {
        pos: 'bg-pos-soft text-pos',
        warn: 'bg-[#fdf3e2] text-warn',
        neg: 'bg-neg-soft text-neg',
        idle: 'bg-bg text-sub border border-edge',
        accent: 'bg-accent-soft text-accent',
    }[tone]
    return <span className={`rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap ${cls}`}>{text}</span>
}
