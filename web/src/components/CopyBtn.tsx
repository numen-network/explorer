'use client'
import {useState} from 'react'
import {Check, Copy} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {cn} from 'cn'
import {INLINE_ICON_BUTTON} from './inlineIconButton'

export default function CopyBtn({text}: {text: string}) {
    const [ok, setOk] = useState(false)
    return (
        <Button
            variant="outline"
            size="icon-xs"
            aria-label="copy"
            onClick={() => {
                navigator.clipboard.writeText(text).then(() => {
                    setOk(true)
                    setTimeout(() => setOk(false), 1200)
                })
            }}
            className={cn(INLINE_ICON_BUTTON, 'ml-1.5')}
        >
            {ok ? <Check className="size-2.5 text-good" /> : <Copy className="size-2.5" />}
        </Button>
    )
}
