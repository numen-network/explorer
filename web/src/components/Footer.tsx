import type {IconType} from '@icons-pack/react-simple-icons'
import {SiBitcoin, SiDiscord, SiGithub, SiTelegram, SiX, SiYoutube} from '@icons-pack/react-simple-icons'
import {Button} from '@/components/ui/button'

const SOCIAL: [label: string, href: string, Mark: IconType][] = [
    ['GitHub', 'https://github.com/numen-network/explorer', SiGithub],
    ['Discord', 'https://discord.gg/ajPKdvrvJK', SiDiscord],
    ['X', 'https://x.com/numen_network', SiX],
    ['Telegram', 'https://t.me/numen_network', SiTelegram],
    ['Bitcointalk', 'https://bitcointalk.org/index.php?action=profile;u=3763959', SiBitcoin],
    ['YouTube', 'https://www.youtube.com/@numen_network', SiYoutube],
]

export default function Footer() {
    return (
        <footer className="border-t bg-card">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4 text-xs text-muted-foreground">
                <span>© 2026 Numen Network</span>
                <div className="ml-auto flex items-center">
                    {SOCIAL.map(([label, href, Mark]) => (
                        <Button key={label} asChild variant="ghost" size="icon" className="text-dim hover:bg-transparent hover:text-foreground">
                            <a href={href} target="_blank" rel="noopener" aria-label={label}>
                                <Mark size={16} title="" />
                            </a>
                        </Button>
                    ))}
                </div>
            </div>
        </footer>
    )
}
