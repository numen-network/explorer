import {ICON} from '@/lib/icons'

const SOCIAL: [label: string, href: string, icon: string][] = [
    ['GitHub', 'https://github.com/numen-network/numen', 'github'],
    ['Discord', 'https://discord.gg/ajPKdvrvJK', 'discord'],
    ['X', 'https://x.com/numen_network', 'x'],
    ['Telegram', 'https://t.me/numen_network', 'telegram'],
    ['Bitcointalk', 'https://bitcointalk.org/index.php?action=profile;u=3763959', 'bitcointalk'],
    ['YouTube', 'https://www.youtube.com/@numen_network', 'youtube'],
]

export default function Footer() {
    return (
        <footer className="border-t border-edge bg-card">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4 text-xs text-sub">
                <span>© 2026 Numen Network</span>
                <div className="ml-auto flex items-center">
                    {SOCIAL.map(([label, href, icon]) => (
                        <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noopener"
                            aria-label={label}
                            className="grid size-8 place-items-center text-faint hover:text-ink"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d={ICON[icon]} />
                            </svg>
                        </a>
                    ))}
                </div>
            </div>
        </footer>
    )
}
