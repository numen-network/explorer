// a long id shown whole wraps at any character to fill its lines. a table cell
// breaks it only at the middle so the column can shrink to half of it, and on
// a phone shows the short form there, since even half of one crowds out the
// other columns
export default function FullText({text, short}: {text: string; short: string}) {
    const half = Math.ceil(text.length / 2)
    return (
        <>
            <span className="break-all whitespace-normal in-[td]:break-normal max-sm:in-[td]:hidden">
                {text.slice(0, half)}
                <wbr />
                {text.slice(half)}
            </span>
            <span className="hidden max-sm:in-[td]:inline">{short}</span>
        </>
    )
}
