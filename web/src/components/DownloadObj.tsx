'use client'
import {Download} from 'lucide-react'
import {Tip} from '@/components/Tip'
import {Button} from '@/components/ui/button'
import {gunzipHex} from '@/lib/mesh'

export default function DownloadObj({vertices, faces, name}: {vertices: string; faces: string; name: string}) {
    const onClick = async () => {
        const [vBuf, fBuf] = await Promise.all([gunzipHex(vertices), gunzipHex(faces)])
        const v = new Float64Array(vBuf)
        const f = new Uint16Array(fBuf)
        const lines: string[] = []
        for (let i = 0; i < v.length; i += 3) lines.push(`v ${v[i]} ${v[i + 1]} ${v[i + 2]}`)
        for (let i = 0; i < f.length; i += 3) lines.push(`f ${f[i] + 1} ${f[i + 1] + 1} ${f[i + 2] + 1}`)
        const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], {type: 'model/obj'}))
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        URL.revokeObjectURL(url)
    }
    return (
        <Tip text="Download OBJ">
            <Button variant="outline" size="icon-xs" aria-label="download obj" onClick={onClick} className="size-5 rounded bg-card align-middle text-dim hover:bg-card hover:text-primary">
                <Download className="size-[11px]" />
            </Button>
        </Tip>
    )
}
