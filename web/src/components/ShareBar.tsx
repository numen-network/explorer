import {Progress} from '@/components/ui/progress'
import {fmtPct, pctToNum} from '@/lib/format'

export default function ShareBar({part, whole}: {part: string; whole: string | null}) {
    return (
        <div className="inline-flex items-center gap-2">
            <Progress value={Math.min(100, pctToNum(BigInt(part), BigInt(whole ?? 0)))} className="h-1.5 w-16" />
            <span className="w-14 text-right font-mono text-xs text-muted-foreground">{fmtPct(part, whole)}</span>
        </div>
    )
}
