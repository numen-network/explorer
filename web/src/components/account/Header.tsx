import AccountFace from '@/components/AccountFace'
import BioDialog from '@/components/BioDialog'
import {AddrMark} from '@/components/addrHot'
import CopyBtn from '@/components/CopyBtn'
import {JudgementBadge, verdictOf} from '@/components/JudgementBadge'
import QrButton from '@/components/QrButton'
import Socials from '@/components/Socials'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import {identityInfoJson, identityLabel, splitBio, type IdentityRef} from '@/lib/identity'
import type {Role} from './shared'

// a sub with no registration of its own goes by super/sub and wears the
// judgement of its super, the way AccountLink names it everywhere else
export default function Header({a, addr, roles}: {a: IdentityRef & {id: string}; addr: string; roles: Role[]}) {
    const verdict = verdictOf(identityInfoJson(a))
    const {short, full} = splitBio(a.identityJson)
    return (
        <div className="mt-6 flex items-start gap-3.5 sm:gap-4">
            <AccountFace hex={a.id} json={a.identityJson} className="size-12 sm:size-14" />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h1 className="flex items-center gap-1.75 text-xl leading-7 font-semibold">
                        {verdict && <JudgementBadge verdict={verdict} />}
                        <span className="min-w-0 wrap-anywhere">{identityLabel(a) ?? 'Account'}</span>
                    </h1>
                    {roles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {roles.map(r => (
                                <Tip key={r.text} text={r.tip && <span className="flex flex-col gap-0.5">{r.tip.map((line, i) => <span key={i}>{line}</span>)}</span>}>
                                    <Badge variant={r.tone}>{r.text}</Badge>
                                </Tip>
                            ))}
                        </div>
                    )}
                </div>
                <div className="mt-0.5 font-mono text-sm break-all">
                    {a.username && (
                        <>
                            <span className="wrap-anywhere">{a.username}</span>
                            <span className="mx-2 text-dim">|</span>
                        </>
                    )}
                    <AddrMark addr={addr}>{addr}</AddrMark>
                    <span className="whitespace-nowrap">
                        <CopyBtn text={addr} />
                        <QrButton text={addr} label={a.username} />
                    </span>
                </div>
                {(short || full) && (
                    <div className="mt-2 flex items-start gap-2">
                        {short && (
                            <p dir="auto" className="line-clamp-2 max-w-[72ch] text-sm leading-[22px] text-muted-foreground wrap-anywhere">
                                {short}
                            </p>
                        )}
                        <BioDialog acc={a} addr={addr} size="icon-xs" className="shrink-0" />
                    </div>
                )}
                <div className="has-[svg]:mt-2.5">
                    <Socials json={a.identityJson} />
                </div>
            </div>
        </div>
    )
}
