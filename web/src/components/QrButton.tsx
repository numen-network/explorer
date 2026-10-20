'use client'

import {useMemo} from 'react'
import encodeQR from 'qr'
import {Download, QrCode} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {cn} from 'cn'
import {INLINE_ICON_BUTTON} from './inlineIconButton'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'

// dark on white whatever the page around it, a code a phone camera can't read
// is a decoration rather than an address
const INK = '#15181a'
const PNG_MODULE = 8

function savePng(matrix: boolean[][], name: string) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = matrix.length * PNG_MODULE
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = INK
    matrix.forEach((row, y) => row.forEach((on, x) => on && ctx.fillRect(x * PNG_MODULE, y * PNG_MODULE, PNG_MODULE, PNG_MODULE)))
    canvas.toBlob(blob => {
        if (!blob) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${name}.png`
        a.click()
        URL.revokeObjectURL(a.href)
    })
}

export default function QrButton({text, label}: {text: string; label?: string | null}) {
    const matrix = useMemo(() => encodeQR(text, 'raw', {border: 4}), [text])
    const path = useMemo(() => matrix.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : ''))).join(''), [matrix])
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon-xs" aria-label="QR code" className={cn(INLINE_ICON_BUTTON, 'ml-1 data-[state=open]:text-primary')}>
                    <QrCode className="size-2.5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent collisionPadding={16} className="w-53 items-center gap-2.5 p-4">
                <div className="rounded-lg border bg-white p-1.5">
                    <svg viewBox={`0 0 ${matrix.length} ${matrix.length}`} width={160} height={160} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${text}`}>
                        <rect width={matrix.length} height={matrix.length} fill="#ffffff" />
                        <path d={path} fill={INK} />
                    </svg>
                </div>
                {label && <div className="-mb-1.5 text-center text-sm font-medium wrap-anywhere">{label}</div>}
                <div className="text-center font-mono text-[11px] leading-4 break-all text-muted-foreground">{text}</div>
                <Button variant="outline" size="sm" className="bg-card" onClick={() => savePng(matrix, text)}>
                    <Download />
                    Save PNG
                </Button>
            </PopoverContent>
        </Popover>
    )
}
