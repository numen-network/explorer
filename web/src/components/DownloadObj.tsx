'use client'
import {gunzipHex} from '@/lib/mesh'

const fmt = (x: number) => String(parseFloat(x.toPrecision(7)))

export default function DownloadObj({vertices, faces, name}: {vertices: string; faces: string; name: string}) {
    const onClick = async () => {
        const [vBuf, fBuf] = await Promise.all([gunzipHex(vertices), gunzipHex(faces)])
        const v = new Float32Array(vBuf)
        const f = new Uint16Array(fBuf)
        const lines: string[] = []
        for (let i = 0; i < v.length; i += 3) lines.push(`v ${fmt(v[i])} ${fmt(v[i + 1])} ${fmt(v[i + 2])}`)
        for (let i = 0; i < f.length; i += 3) lines.push(`f ${f[i] + 1} ${f[i + 1] + 1} ${f[i + 2] + 1}`)
        const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], {type: 'model/obj'}))
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        URL.revokeObjectURL(url)
    }
    return (
        <button
            aria-label="download obj"
            title="Download OBJ"
            onClick={onClick}
            className="inline-grid size-5 place-items-center rounded border border-edge bg-card align-middle text-faint hover:text-accent"
        >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v11" />
                <path d="m7 11 5 5 5-5" />
                <path d="M4 20h16" />
            </svg>
        </button>
    )
}
