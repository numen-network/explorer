export const emptyText = (what: string, filtered = false) => (filtered ? `No matching ${what}.` : `No ${what} yet.`)

export default function EmptyList({what, filtered}: {what: string; filtered?: boolean}) {
    return <div className="px-5 py-6 text-sm text-muted-foreground">{emptyText(what, filtered)}</div>
}
