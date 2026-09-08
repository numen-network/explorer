import {hexToBytes} from '@noble/hashes/utils.js'

export async function gunzipHex(hex: string): Promise<ArrayBuffer> {
    const stream = new Blob([hexToBytes(hex.slice(2))]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new Response(stream).arrayBuffer()
}
