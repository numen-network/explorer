import {Progress} from '@/components/ui/progress'
import {fmtPct, pctToNum} from '@/lib/format'

// the figure sits over the bar so the cell stays one line tall
export default function ShareBar({part, whole}: {part: string; whole: string | null}) {
    return (
        <div className="inline-flex flex-col items-end gap-0.5 align-middle">
            <span className="font-mono text-[11px] leading-none text-muted-foreground">{fmtPct(part, whole)}</span>
            <Progress value={Math.min(100, pctToNum(BigInt(part), BigInt(whole ?? 0)))} className="h-1 w-20" />
        </div>
    )
}
