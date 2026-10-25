import type {IconType} from '@icons-pack/react-simple-icons'
import {SiBitcoin, SiDiscord, SiGithub, SiTelegram, SiX, SiYoutube} from '@icons-pack/react-simple-icons'
import {Button} from '@/components/ui/button'
import {CONFIG} from '@/lib/config'

type Social = keyof typeof CONFIG.socials

const MARK: Record<Social, [label: string, Mark: IconType]> = {
    github: ['GitHub', SiGithub],
    discord: ['Discord', SiDiscord],
    x: ['X', SiX],
    telegram: ['Telegram', SiTelegram],
    bitcointalk: ['Bitcointalk', SiBitcoin],
    youtube: ['YouTube', SiYoutube],
}

export default function Footer() {
    return (
        <footer className="border-t bg-card">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4 text-xs text-muted-foreground">
                <span>© 2026 Numen Network</span>
                <div className="ml-auto flex items-center">
                    {(Object.keys(CONFIG.socials) as Social[]).map(key => {
                        const [label, Mark] = MARK[key]
                        return (
                            <Button key={key} asChild variant="ghost" size="icon" className="text-dim hover:bg-transparent hover:text-foreground">
                                <a href={CONFIG.socials[key]} target="_blank" rel="noopener" aria-label={label}>
                                    <Mark size={16} title="" />
                                </a>
                            </Button>
                        )
                    })}
                </div>
            </div>
        </footer>
    )
}
