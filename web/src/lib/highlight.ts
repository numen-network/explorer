import {createHighlighterCore} from 'shiki/core'
import {createJavaScriptRegexEngine} from 'shiki/engine/javascript'

// the JavaScript engine colours these grammars exactly as Oniguruma does, without its wasm
const highlighter = createHighlighterCore({
    themes: [import('shiki/themes/github-light.mjs')],
    langs: [import('shiki/langs/solidity.mjs'), import('shiki/langs/vyper.mjs'), import('shiki/langs/json.mjs')],
    engine: createJavaScriptRegexEngine(),
})

// the card around the code is the scroll box, so the pre drops shiki's background and focus stop
const bare = {
    pre(node: {properties: Record<string, unknown>}) {
        delete node.properties.style
        delete node.properties.tabindex
    },
}

export async function highlight(code: string, lang: string) {
    return (await highlighter).codeToHtml(code, {lang, theme: 'github-light', transformers: [bare]})
}
