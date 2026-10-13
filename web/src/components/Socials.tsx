'use client'

import type {ComponentType} from 'react'
import type {IconType} from '@icons-pack/react-simple-icons'
import {SiDiscord, SiGithub, SiMatrix, SiTelegram, SiX} from '@icons-pack/react-simple-icons'
import {Globe, Mail} from 'lucide-react'
import {Tip} from '@/components/Tip'
import {channelHref, identityFields} from '@/lib/identity'

const MARK: Record<string, IconType | ComponentType<{size?: number; className?: string}>> = {
    web: Globe,
    email: Mail,
    github: SiGithub,
    matrix: SiMatrix,
    x: SiX,
    telegram: SiTelegram,
    discord: SiDiscord,
}

// the X mark runs corner to corner, so it sits a size down to weigh what the others do
const BOX: Record<string, string> = {x: 'size-4'}

export default function Socials({json}: {json: unknown}) {
    return (
        <span className="flex items-center gap-2 text-dim">
            {identityFields(json)
                .filter(c => c.key in MARK)
                .map(c => {
                    const Mark = MARK[c.key]
                    const href = channelHref(c.key, c.value)
                    const icon = <Mark size={18} className={BOX[c.key] ?? 'size-[18px]'} />
                    return (
                        <Tip key={c.key} text={`${c.label} ${c.value}`}>
                            {href ? (
                                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={c.label} className="hover:text-primary">
                                    {icon}
                                </a>
                            ) : (
                                <span aria-label={c.label}>{icon}</span>
                            )}
                        </Tip>
                    )
                })}
        </span>
    )
}
