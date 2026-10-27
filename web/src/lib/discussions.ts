const DISCUSSIONS_URL = process.env.DISCUSSIONS_URL

// only a Discord thread in the shape Gov Bot writes ever becomes a link
const THREAD = /^https:\/\/discord\.com\/channels\/\d+\/\d+$/

// the thread Gov Bot opened for a referendum, null where it opened none
export async function discussionOf(index: number): Promise<string | null> {
    if (!DISCUSSIONS_URL) return null
    try {
        const res = await fetch(new URL(`/discussions/${index}`, DISCUSSIONS_URL), {cache: 'no-store', signal: AbortSignal.timeout(3_000)})
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const {url}: {url?: unknown} = await res.json()
        return typeof url === 'string' && THREAD.test(url) ? url : null
    } catch (e) {
        console.error(`no discussion of referendum ${index} from ${DISCUSSIONS_URL}`, e)
        return null
    }
}
