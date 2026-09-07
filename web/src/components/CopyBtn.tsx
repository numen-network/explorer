'use client'
import {useState} from 'react'
import {Check, Copy} from 'lucide-react'
import {Button} from '@/components/ui/button'

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
            className="ml-1.5 size-5 rounded bg-card align-middle text-dim hover:bg-card hover:text-primary"
        >
            {ok ? <Check className="size-2.5 text-good" /> : <Copy className="size-2.5" />}
        </Button>
    )
}
