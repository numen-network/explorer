const DISCUSSIONS_URL = process.env.DISCUSSIONS_URL

// only a Discord thread in the shape Gov Bot writes ever becomes a link
const THREAD = /^https:\/\/discord\.com\/channels\/\d+\/\d+$/

// the thread Gov Bot opened for a referendum, null where it opened none
export async function discussionOf(index: number): Promise<string | null> {
    if (!DISCUSSIONS_URL) return null
    try {
        const res = await fetch(DISCUSSIONS_URL, {cache: 'no-store', signal: AbortSignal.timeout(3_000)})
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const link: unknown = (await res.json())[index]
        return typeof link === 'string' && THREAD.test(link) ? link : null
    } catch (e) {
        console.error(`no discussions from ${DISCUSSIONS_URL}`, e)
        return null
    }
}
