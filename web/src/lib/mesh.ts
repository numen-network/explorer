export async function gunzipHex(hex: string): Promise<ArrayBuffer> {
    const bytes = new Uint8Array((hex.length - 2) / 2)
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(2 + i * 2, 4 + i * 2), 16)
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new Response(stream).arrayBuffer()
}
