import type {StoryObj} from '@storybook/nextjs-vite'
import * as echarts from 'echarts'
import {expect, spyOn, userEvent, waitFor, within} from 'storybook/test'

export type Play = NonNullable<StoryObj['play']>

// plays that run one after another against the same render
export const all =
    <Context,>(...plays: ((context: Context) => unknown)[]) =>
    async (context: Context) => {
        for (const play of plays) await play(context)
    }

// content that runs past a box widens its scroll width, even when the box clips it
export function expectFits(...boxes: Element[]) {
    expect(boxes.length).toBeGreaterThan(0)
    for (const box of boxes) expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
}

// each pager under root keeps its page row and controls inside it, bar the
// padding of the next arrow that hangs past its right edge
export function expectPagersFit(root: Element) {
    const pagers = root.querySelectorAll('[data-slot=pagination]')
    expect(pagers.length).toBeGreaterThan(0)
    for (const pager of pagers) {
        const box = pager.getBoundingClientRect()
        for (const item of pager.children) {
            const edges = item.getBoundingClientRect()
            expect(Math.round(edges.left - box.left)).toBeGreaterThanOrEqual(0)
            expect(Math.round(box.right - parseFloat(getComputedStyle(item).marginRight) - edges.right)).toBeGreaterThanOrEqual(0)
        }
    }
}

export const cardsFit: Play = async ({canvasElement}) => expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))

type Shape = ReturnType<echarts.graphic.Group['children']>[number]

// echarts tags each tick label label_<value> and groups an axis's labels, so
// this reads them back per axis with boxes in canvas pixels
function axisLabels(chart: echarts.ECharts) {
    const axes = new Map<Shape, {text: string; box: echarts.graphic.BoundingRect}[]>()
    const walk = (el: Shape) => {
        if (el instanceof echarts.graphic.Text && el.anid?.startsWith('label_') && !el.ignore) {
            const box = el.getBoundingRect().clone()
            box.applyTransform(el.getComputedTransform())
            axes.set(el.parent, [...(axes.get(el.parent) ?? []), {text: String(el.style.text), box}])
        }
        if (el instanceof echarts.graphic.Group) el.children().forEach(walk)
    }
    chart.getZr().storage.getRoots().forEach(walk)
    return [...axes.values()]
}

// where each chart's plot starts, in pixels from its left edge, read off the
// first two categories, whose bands share a width and meet at the plot edge
export const plotLefts = (root: Element) =>
    chartsIn(root).map(chart => {
        const [a, b] = [0, 1].map(i => chart.convertToPixel({xAxisIndex: 0}, i))
        return a - (b - a) / 2
    })

const chartsIn = (root: Element) => [...root.querySelectorAll<HTMLElement>('[_echarts_instance_]')].map(el => echarts.getInstanceByDom(el)!)

// how full each progress bar under root is drawn, in percent
export const progressIn = (root: Element) => [...root.querySelectorAll<HTMLElement>('[data-slot=progress-indicator]')].map(bar => 100 + Number(/translateX\(([-\d.e]+)%\)/.exec(bar.style.transform)![1]))

// the categories along the x axis of each chart under root
export const categoriesIn = (root: Element) => chartsIn(root).map(chart => (chart.getOption().xAxis as {data: string[]}[])[0].data)

// the tick labels each chart under root shows, one list per axis
export const axisTexts = (root: Element) => chartsIn(root).map(chart => axisLabels(chart).map(labels => labels.map(l => l.text)))

// every axis of every chart under root labels each tick once and shows every
// label whole, a ring has no axis to read
export function expectLegibleAxes(root: Element) {
    const charts = chartsIn(root).filter(chart => (chart.getOption().xAxis as unknown[] | undefined)?.length)
    expect(charts.length).toBeGreaterThan(0)
    for (const chart of charts) {
        const axes = axisLabels(chart)
        expect(axes.length).toBeGreaterThan(0)
        for (const labels of axes) {
            const texts = labels.map(l => l.text)
            expect(texts.filter((text, i) => texts.indexOf(text) !== i)).toEqual([])
            const cut = labels.filter(({box}) => box.x < 0 || box.y < 0 || box.x + box.width > chart.getWidth() || box.y + box.height > chart.getHeight())
            expect(cut.map(l => l.text)).toEqual([])
        }
    }
}

// a chart draws from an effect, which can run after the story has mounted
export const axesLegible: Play = async ({canvasElement}) => waitFor(() => expectLegibleAxes(canvasElement))

interface Stack {
    labels: string[]
    series: Record<string, number[]>
    totals: string[]
}

// the labels a chart's bars carry, left to right
function barLabels(chart: echarts.ECharts) {
    return chart
        .getZr()
        .storage.getDisplayList(true)
        .flatMap(el => {
            const label = el.getTextContent()
            if (label == null || label.ignore) return []
            const box = el.getBoundingRect().clone()
            box.applyTransform(el.getComputedTransform())
            return [{x: box.x + box.width / 2, text: String(label.style.text)}]
        })
        .sort((a, b) => a.x - b.x)
        .map(l => l.text)
}

// what each stacked bar chart under root draws, its category labels, every
// series by name and the total written on top of each stack
export function stacksIn(root: Element): Stack[] {
    return chartsIn(root)
        .filter(chart => (chart.getOption().series as {name?: string}[]).some(s => s.name === 'total'))
        .map(chart => {
            const option = chart.getOption() as {xAxis: {data: string[]}[]; series: {name: string; data: number[]}[]}
            return {
                labels: option.xAxis[0].data,
                series: Object.fromEntries(option.series.filter(s => s.name !== 'total').map(s => [s.name, s.data])),
                totals: barLabels(chart),
            }
        })
}

// the widths the bars of every chart under root are drawn at, to a hundredth
// of a pixel, each width once
export const barWidthsIn = (root: Element) => [
    ...new Set(chartsIn(root).flatMap(chart => chart.getZr().storage.getDisplayList(true).flatMap(el => (el instanceof echarts.graphic.Rect ? [Math.round(el.shape.width * 100) / 100] : [])))),
]

type Series = {type: string; name?: string; stack?: string; data: number[]; itemStyle: {color: string}}

// the hex colour the canvas paints at a point on a series' axes. a line two
// pixels wide around the point covers the whole pixel the point falls in
export function pixelAt(chart: echarts.ECharts, seriesIndex: number, point: [number, number]) {
    const [x, y] = chart.convertToPixel({seriesIndex}, point).map(v => Math.floor(v * chart.getDevicePixelRatio()))
    const [r, g, b] = chart.getDom().querySelector('canvas')!.getContext('2d')!.getImageData(x, y, 1, 1).data
    return echarts.color.toHex(`rgb(${r},${g},${b})`)
}

// a line needs two values for a segment, so each line under root that holds
// a single value paints a dot of its colour on that value, raised by the
// lines stacked under it
export function expectLonePointsPainted(root: Element) {
    const series = chartsIn(root).flatMap(chart => {
        const all = chart.getOption().series as Series[]
        return all.map((series, seriesIndex) => ({chart, series, seriesIndex, base: all.slice(0, seriesIndex).filter(s => s.stack != null && s.stack === series.stack).reduce((sum, s) => sum + s.data[0], 0)}))
    })
    const lines = series.filter(({series}) => series.type === 'line' && series.data.length === 1)
    expect(lines.length).toBeGreaterThan(0)
    for (const {chart, series, seriesIndex, base} of lines) {
        expect(pixelAt(chart, seriesIndex, [0, base + series.data[0]])).toBe(echarts.color.toHex(series.itemStyle.color))
    }
}

// the dot draws in once the line's reveal animation reaches it
export const lonePointsPainted = async ({canvasElement}: {canvasElement: Element}) => waitFor(() => expectLonePointsPainted(canvasElement), {timeout: 3000})

// echarts appends the tooltip box to the chart container, next to the zrender viewport
function tooltipOf(chart: echarts.ECharts) {
    const viewport = chart.getZr().painter.getViewportRoot()
    return [...chart.getDom().children].find(el => el !== viewport)!
}

// a tooltip shown at the first, last and middle value of each chart under
// root lies whole inside the viewport
export function expectTooltipsInView(root: Element) {
    const charts = chartsIn(root)
    expect(charts.length).toBeGreaterThan(0)
    const view = document.documentElement
    for (const chart of charts) {
        // echarts throttles a tooltip with a transition and slides it into
        // place, so turning the transition off lands every move at once
        chart.setOption({tooltip: {transitionDuration: 0}})
        chart.getDom().scrollIntoView({block: 'center'})
        const last = (chart.getOption().series as Series[])[0].data.length - 1
        for (const dataIndex of new Set([0, last, Math.floor(last / 2)])) {
            chart.dispatchAction({type: 'showTip', seriesIndex: 0, dataIndex})
            const box = tooltipOf(chart).getBoundingClientRect()
            expect(box.left).toBeGreaterThanOrEqual(0)
            expect(box.top).toBeGreaterThanOrEqual(0)
            expect(box.right).toBeLessThanOrEqual(view.clientWidth)
            expect(box.bottom).toBeLessThanOrEqual(view.clientHeight)
        }
    }
}

// the lines of the tooltip each chart under root shows at the last value of
// the series with that name, or of its first series
export function lastTooltipLines(root: Element, name?: string) {
    return chartsIn(root).map(chart => {
        chart.setOption({tooltip: {transitionDuration: 0}})
        const series = chart.getOption().series as (Series & {name?: string})[]
        const seriesIndex = name === undefined ? 0 : series.findIndex(s => s.name === name)
        chart.dispatchAction({type: 'showTip', seriesIndex, dataIndex: series[seriesIndex].data.length - 1})
        return [...tooltipOf(chart).children].map(line => line.textContent)
    })
}

// waitFor reruns its callback on every DOM change and showing a tooltip makes
// one, so a failing check would spin forever inside it
export const tooltipsInView: Play = async ({canvasElement}) => {
    await waitFor(() => expect(chartsIn(canvasElement).length).toBeGreaterThan(0))
    expectTooltipsInView(canvasElement)
}

// the box of the first line an element's content takes up
function firstLine(el: Element) {
    const range = document.createRange()
    range.selectNodeContents(el)
    return [...range.getClientRects()].filter(r => r.width > 0).sort((a, b) => a.top - b.top || a.height - b.height)[0]
}

// a middle dot shares the first line of the item after it, so no line ends on one
export function expectNoHangingDots(root: Element) {
    const mid = (r: DOMRect) => r.top + r.height / 2
    const dots = [...root.querySelectorAll('span')].filter(el => el.textContent === '·')
    expect(dots.length).toBeGreaterThan(0)
    for (const dot of dots) {
        const next = dot.nextElementSibling
        expect(next).not.toBeNull()
        expect(Math.abs(mid(dot.getBoundingClientRect()) - mid(firstLine(next!)))).toBeLessThan(2)
    }
}

// how far a box's content may reach, inside its border and padding
function contentEdges(box: Element) {
    const r = box.getBoundingClientRect()
    const style = getComputedStyle(box)
    return {left: r.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft), right: r.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight)}
}

// each element stays clear of the border and padding of box
export function expectInContentBox(box: Element, ...els: Element[]) {
    expect(els.length).toBeGreaterThan(0)
    const edges = contentEdges(box)
    for (const el of els) {
        const r = el.getBoundingClientRect()
        const name = el.textContent || el.tagName
        expect({name, inside: r.left >= edges.left - 0.5 && r.right <= edges.right + 0.5}).toEqual({name, inside: true})
    }
}

// a 3D object draws from an effect once its mesh unpacks, after the story has mounted
export const drawnCanvases = (root: Element, count: number) =>
    waitFor(
        () => {
            const canvases = [...root.querySelectorAll('canvas')]
            expect(canvases).toHaveLength(count)
            return canvases
        },
        {timeout: 5000}
    )

// the faces each 3D object under root draws, read off the index count of the
// draw call an interactive object repeats every frame
export async function drawnFaces(root: Element, count: number) {
    const draw = spyOn(WebGL2RenderingContext.prototype, 'drawElements')
    try {
        const canvases = await drawnCanvases(root, count)
        return await waitFor(() =>
            canvases.map(canvas => {
                const call = (draw.mock.contexts as WebGL2RenderingContext[]).findLastIndex(gl => gl.canvas === canvas)
                expect(call).toBeGreaterThanOrEqual(0)
                return draw.mock.calls[call][1] / 3
            })
        )
    } finally {
        draw.mockRestore()
    }
}

interface Frame {
    pixels: Uint8Array
    width: number
    height: number
}

// the blank pixels a frame leaves past its ink on each side, its rows bottom up as readPixels hands them over
function blankEdges({pixels, width, height}: Frame) {
    const range = (n: number) => Array.from({length: n}, (_, i) => i)
    const inked = (x: number, y: number) => pixels[(y * width + x) * 4 + 3] > 0
    const rows = range(height).filter(y => range(width).some(x => inked(x, y)))
    const cols = range(width).filter(x => rows.some(y => inked(x, y)))
    expect(rows.length).toBeGreaterThan(0)
    return {top: height - 1 - rows.at(-1)!, right: width - 1 - cols.at(-1)!, bottom: rows[0], left: cols[0]}
}

// the blank pixels between each 3D object under root and each edge of its
// canvas. the browser wipes a WebGL frame once it is on screen, so each frame
// is read straight after the draw call an interactive object repeats every frame
export async function drawnMargins(root: Element, count: number) {
    const draw = WebGL2RenderingContext.prototype.drawElements
    const frames = new Map<WebGL2RenderingContext['canvas'], Frame>()
    const spy = spyOn(WebGL2RenderingContext.prototype, 'drawElements').mockImplementation(function (this: WebGL2RenderingContext, ...args) {
        draw.apply(this, args)
        const {drawingBufferWidth: width, drawingBufferHeight: height} = this
        const pixels = new Uint8Array(width * height * 4)
        this.readPixels(0, 0, width, height, this.RGBA, this.UNSIGNED_BYTE, pixels)
        frames.set(this.canvas, {pixels, width, height})
    })
    try {
        const canvases = await drawnCanvases(root, count)
        return await waitFor(() =>
            canvases.map(canvas => {
                expect(frames.has(canvas)).toBe(true)
                return blankEdges(frames.get(canvas)!)
            })
        )
    } finally {
        spy.mockRestore()
    }
}

// the box of every run of text under el, one per line it takes up
function textBoxes(el: Element) {
    const boxes: DOMRect[] = []
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
        const range = document.createRange()
        range.selectNodeContents(node)
        boxes.push(...[...range.getClientRects()].filter(r => r.width > 0))
    }
    return boxes
}

// every timestamp under root keeps its text and timezone switch inside its
// block and its card, its age, date and timezone each on one line, and splits
// the timezone off only once the date has a line of its own
export function expectTimesFit(root: Element) {
    const ages = [...root.querySelectorAll('span')].filter(span => /^\d+[smhd] ago$/.test(span.textContent!))
    expect(ages.length).toBeGreaterThan(0)
    for (const age of ages) {
        let stamp: Element = age
        while (stamp.parentElement!.textContent === age.parentElement!.textContent) stamp = stamp.parentElement!
        let box = stamp
        while (getComputedStyle(box).display.startsWith('inline')) box = box.parentElement!
        const ink = [...textBoxes(stamp), ...[...stamp.querySelectorAll('svg')].map(icon => icon.getBoundingClientRect())]
        for (const edges of [box, box.closest('[data-slot=card]')].filter(el => el !== null).map(contentEdges)) {
            const out = ink.filter(r => r.left < edges.left - 0.5 || r.right > edges.right + 0.5)
            expect({stamp: box.textContent, out: out.length}).toEqual({stamp: box.textContent, out: 0})
        }
        const segments = [age, ...age.nextElementSibling!.children]
        expectOneLine(...segments)
        const [top, date, zone] = segments.map(segment => segment.getBoundingClientRect().top)
        if (zone !== undefined && zone > date) expect(date).toBeGreaterThan(top)
    }
}

// each text ends in a hash shortened to 0x, four digits, … and four digits
export function expectShortHashes(...texts: string[]) {
    expect(texts.length).toBeGreaterThan(0)
    for (const text of texts) expect(text).toMatch(/(^|\s)0x[0-9a-fA-F]{4}…[0-9a-fA-F]{4}$/)
}

// every address a link shows reads in one whole form, its short split in a
// table cell narrower than sm, nu5…4 for an account and 0x4…4 for an EVM
// address, and the full address anywhere else, and no box inside the link cuts
// it off
export function expectAddressForm(root: Element) {
    const links = [...root.querySelectorAll<HTMLElement>('a[href^="/account/"], a[href^="/address/"]')].filter(a => /^(nu|0x)[\w…]+$/.test(a.innerText.trim()))
    expect(links.length).toBeGreaterThan(0)
    const narrow = matchMedia('(width < 40rem)').matches
    for (const link of links) {
        const text = link.innerText.trim()
        const short = text.startsWith('0x') ? /^0x[0-9a-fA-F]{4}…[0-9a-fA-F]{4}$/ : /^nu\w{5}…\w{4}$/
        expect(text).toMatch(narrow && link.closest('td') ? short : /^\w{42,}$/)
        expectFits(link, ...link.querySelectorAll('span'))
    }
}

// every scroll arrow of a tab strip centres on the line its labels sit on
export function expectArrowsOnLabelLine(root: Element) {
    const arrows = [...root.querySelectorAll('button[aria-label^="Scroll "]')]
    expect(arrows.length).toBeGreaterThan(0)
    const centre = (r: DOMRect) => r.top + r.height / 2
    for (const arrow of arrows) {
        const label = document.createRange()
        label.selectNodeContents(arrow.parentElement!.querySelector('.overflow-x-auto a')!)
        const off = Math.abs(centre(arrow.querySelector('svg')!.getBoundingClientRect()) - centre(label.getBoundingClientRect()))
        expect({arrow: arrow.getAttribute('aria-label'), onLine: off <= 1}).toEqual({arrow: arrow.getAttribute('aria-label'), onLine: true})
    }
}

// a full address in a table column too narrow for it breaks between its two halves and nowhere else
export function expectHalves(full: Element) {
    const lines = (node: Node) => {
        const range = document.createRange()
        range.selectNodeContents(node)
        return [...new Set([...range.getClientRects()].map(r => Math.round(r.top)))]
    }
    const [head, , tail] = full.childNodes
    const [top, bottom] = [lines(head), lines(tail)]
    expect(top).toHaveLength(1)
    expect(bottom).toHaveLength(1)
    expect(top[0]).toBeLessThan(bottom[0])
}

const blockOf = (node: Node) => {
    let el = node.parentElement!
    while (getComputedStyle(el).display.startsWith('inline')) el = el.parentElement!
    return el
}

// every run of non-space text under el, one run reaching across the inline
// elements it spans and stopping where its block does
function wordRanges(el: Element) {
    const chars: [Node | null, number][] = []
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let node = walk.nextNode(), block: Element | null = null; node; node = walk.nextNode()) {
        if (block !== blockOf(node)) chars.push([null, 0])
        block = blockOf(node)
        for (let i = 0; i < node.textContent!.length; i++) chars.push([node, i])
    }
    const text = chars.map(([node, i]) => (node ? node.textContent![i] : ' ')).join('')
    return [...text.matchAll(/\S+/g)].map(({0: word, index}) => {
        const range = document.createRange()
        range.setStart(...(chars[index] as [Node, number]))
        const [end, at] = chars[index + word.length - 1] as [Node, number]
        range.setEnd(end, at + 1)
        return range
    })
}

// a word that fits its block keeps to one line, a word broken across two
// lines leaves a rect on each of them
export function expectWholeWords(...boxes: Element[]) {
    expect(boxes.length).toBeGreaterThan(0)
    for (const box of boxes) {
        for (const range of wordRanges(box)) {
            const rects = [...range.getClientRects()].filter(r => r.width > 0)
            const {left, right} = contentEdges(blockOf(range.startContainer))
            if (rects.reduce((width, r) => width + r.width, 0) > right - left + 0.5) continue
            const word = range.toString()
            expect({word, lines: new Set(rects.map(r => Math.round(r.top))).size}).toEqual({word, lines: 1})
        }
    }
}

// all the text in each box sits on one line
export function expectOneLine(...boxes: Element[]) {
    expect(boxes.length).toBeGreaterThan(0)
    for (const box of boxes) {
        const tops = textBoxes(box).map(r => r.top)
        expect({text: box.textContent, spread: Math.max(...tops) - Math.min(...tops) < 4}).toEqual({text: box.textContent, spread: true})
    }
}

// what every token link under root reads, in page order
export const tokenLabels = (root: Element) => [...root.querySelectorAll('a[href^="/token/"]')].map(link => link.textContent)

// what each body row of the table under root shows in the column under header
export function columnTexts(root: HTMLElement, header: string | RegExp) {
    const [head, ...rows] = within(root).getAllByRole('row')
    const at = [...head.children].findIndex(cell => (typeof header === 'string' ? cell.textContent === header : header.test(cell.textContent!)))
    expect(at).toBeGreaterThanOrEqual(0)
    return rows.map(row => row.children[at].textContent)
}

// every navigation landmark under root carries a name of its own
export function expectNamedNavs(root: HTMLElement) {
    const navs = within(root).getAllByRole('navigation')
    for (const nav of navs) {
        const name = nav.getAttribute('aria-label')
        expect(name).toBeTruthy()
        expect(within(root).getAllByRole('navigation', {name: name!})).toEqual([nav])
    }
}

// the count on the tab that opens slug, or null when the page shows no such tab
export function tabCount(root: Element, slug: string) {
    const tab = root.querySelector(`:is([role=tablist], nav) a[href$="?tab=${slug}"]`)
    return tab && tab.querySelector('[data-slot=badge]')!.textContent
}

// the chips of the filter row named label, each read as its label and count,
// the active one in brackets, or null when no such row shows
export function filterChips(root: Element, label: string) {
    const name = [...root.querySelectorAll('span')].find(span => span.textContent === label && span.nextElementSibling?.matches('a'))
    if (!name) return null
    return [...name.parentElement!.querySelectorAll('a')].map(chip => {
        const text = [...chip.childNodes].map(node => node.textContent).join(' ')
        return chip.dataset.variant === 'solid' ? `[${text}]` : text
    })
}

// the options of the filter select named label, each read as its label and
// the count or contract after it, the picked one in brackets, or null when no such select shows. the
// list opens to be read and closes again
export async function filterOptions(root: HTMLElement, label: string) {
    const trigger = within(root).queryByRole('combobox', {name: label})
    if (!trigger) return null
    await userEvent.click(trigger)
    const list = await within(document.body).findByRole('listbox')
    const options = within(list)
        .getAllByRole('option')
        .map(option => {
            const text = [...option.lastElementChild!.lastElementChild!.childNodes].map(node => node.textContent).join(' ')
            return option.getAttribute('aria-selected') === 'true' ? `[${text}]` : text
        })
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(within(document.body).queryByRole('listbox')).toBeNull())
    return options
}

// which rows carry the address poisoning mark. a marked row greys every part
// but the warning icon, an unmarked one greys nothing
export function poisonedRows(rows: Element[]) {
    const faded = (el: Element) => getComputedStyle(el).opacity === '0.5'
    return rows.map(row => {
        const mark = row.querySelector('[data-slot=poisoning]')
        const parts = [...row.children].flatMap(part => [...part.children]).filter(part => part !== mark)
        expect(parts.map(faded)).toEqual(parts.map(() => mark != null))
        if (mark) expect([faded(mark), faded(mark.firstElementChild!), faded(mark.querySelector('svg')!)]).toEqual([false, true, false])
        return mark != null
    })
}
