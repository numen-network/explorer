import AccountFace from '@/components/AccountFace'
import {AddrMark} from '@/components/addrHot'
import CopyBtn from '@/components/CopyBtn'
import {JudgementBadge, verdictOf} from '@/components/JudgementBadge'
import QrButton from '@/components/QrButton'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import {identityInfoJson, identityLabel, type IdentityRef} from '@/lib/identity'
import type {Role} from './shared'

// a sub with no registration of its own goes by super/sub and wears the
// judgement of its super, the way AccountLink names it everywhere else
export default function Header({a, addr, roles}: {a: IdentityRef & {id: string}; addr: string; roles: Role[]}) {
    const verdict = verdictOf(identityInfoJson(a))
    return (
        <div className="mt-6 flex items-start gap-3.5 sm:gap-4">
            <AccountFace hex={a.id} json={a.identityJson} className="size-12 sm:size-14" />
            <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-1.75 text-xl leading-7 font-semibold">
                    {verdict && <JudgementBadge verdict={verdict} />}
                    <span className="min-w-0 wrap-anywhere">{identityLabel(a) ?? 'Account'}</span>
                </h1>
                <div className="mt-0.5 font-mono text-sm break-all">
                    <AddrMark addr={addr}>{addr}</AddrMark>
                    <CopyBtn text={addr} />
                    <QrButton text={addr} />
                </div>
                {roles.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {roles.map(r => (
                            <Tip key={r.text} text={r.tip && <span className="flex flex-col gap-0.5">{r.tip.map((line, i) => <span key={i}>{line}</span>)}</span>}>
                                <Badge variant={r.tone}>{r.text}</Badge>
                            </Tip>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
