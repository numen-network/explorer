import {gzipSync} from 'node:zlib'
import {RpcClient} from '@subsquid/rpc-client'

export interface ParsedMesh {
    vertexCount: number
    faceCount: number
    verticesGz: Buffer
    facesGz: Buffer
}

export function fetchObj(rpc: RpcClient, blockHash: string): Promise<string> {
    return rpc.call('poscan_getObject', [blockHash])
}

export function parseMesh(obj: string): ParsedMesh {
    const vertices: number[] = []
    const faces: number[] = []
    for (const line of obj.split('\n')) {
        if (line.startsWith('v ')) {
            const p = line.split(' ')
            if (p.length !== 4) throw new Error(`malformed vertex line ${line}`)
            for (let i = 1; i < 4; i++) {
                const f = Number(p[i])
                if (!Number.isFinite(f)) throw new Error(`non finite vertex in ${line}`)
                vertices.push(f)
            }
        } else if (line.startsWith('f ')) {
            const p = line.split(' ')
            if (p.length !== 4) throw new Error(`malformed face line ${line}`)
            for (let i = 1; i < 4; i++) {
                faces.push(Number(p[i]) - 1)
            }
        }
    }
    const vertexCount = vertices.length / 3
    const faceCount = faces.length / 3
    if (vertexCount === 0 || faceCount === 0) throw new Error('empty mesh')
    for (const idx of faces) {
        if (!Number.isInteger(idx) || idx < 0 || idx >= vertexCount) throw new Error('face index out of range')
        if (idx >= 0x10000) throw new Error('face index does not fit u16')
    }
    const vbuf = Buffer.alloc(vertices.length * 4)
    vertices.forEach((f, i) => vbuf.writeFloatLE(f, i * 4))
    const fbuf = Buffer.alloc(faces.length * 2)
    faces.forEach((idx, i) => fbuf.writeUInt16LE(idx, i * 2))
    return {
        vertexCount,
        faceCount,
        verticesGz: gzipSync(vbuf),
        facesGz: gzipSync(fbuf),
    }
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length)
    let next = 0
    async function worker(): Promise<void> {
        while (next < items.length) {
            const i = next++
            out[i] = await fn(items[i])
        }
    }
    await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker))
    return out
}
