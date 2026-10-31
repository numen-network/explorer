import {Download} from 'lucide-react'
import {cn} from 'cn'
import {Button} from '@/components/ui/button'
import {INLINE_ICON_BUTTON} from './inlineIconButton'

export default function DownloadBtn({href}: {href: string}) {
    return (
        <Button asChild variant="outline" size="icon-xs" className={cn(INLINE_ICON_BUTTON, 'ml-1.5')}>
            <a href={href} download aria-label="download">
                <Download className="size-2.5" />
            </a>
        </Button>
    )
}
