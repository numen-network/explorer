import {Download} from 'lucide-react'
import {cn} from 'cn'
import {buttonVariants} from '@/components/ui/button'
import {INLINE_ICON_BUTTON} from './inlineIconButton'

export default function DownloadBtn({href}: {href: string}) {
    return (
        <a href={href} download aria-label="download" className={cn(buttonVariants({variant: 'outline', size: 'icon-xs'}), cn(INLINE_ICON_BUTTON, 'ml-1.5'))}>
            <Download className="size-2.5" />
        </a>
    )
}
