import {BProgress} from '@bprogress/core'

// faster navigations never show the bar, and a redirect() gets this long to start its follow-up
const DELAY = 100

const pending: string[] = []
let show = 0
let done = 0

BProgress.configure({showSpinner: false})

const route = (url: string | URL) => {
    const {pathname, search} = new URL(url, location.href)
    return pathname + search
}

export function onRouterTransitionStart(url: string) {
    pending.push(route(url))
    clearTimeout(done)
    clearTimeout(show)
    show = window.setTimeout(() => BProgress.isStarted() || BProgress.start(), DELAY)
}

// a commit settles its navigation and every older one, an unknown url means a redirect and settles all
function commit(url: string | URL) {
    const i = pending.lastIndexOf(route(url))
    pending.splice(0, i < 0 ? pending.length : i + 1)
    if (pending.length) return
    clearTimeout(show)
    done = window.setTimeout(() => BProgress.done(), DELAY)
}

// the router writes every route it commits to history
for (const method of ['pushState', 'replaceState'] as const) {
    const write = history[method].bind(history)
    history[method] = (data, unused, url) => {
        if (url) commit(url)
        write(data, unused, url)
    }
}
