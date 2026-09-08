// a scale enum lands in json as {__kind, value}, the name is what a badge shows
export const variantName = (v: unknown) => (v as {__kind?: string} | null | undefined)?.__kind ?? null

export const variantValue = (v: unknown) => (v as {value?: unknown} | null | undefined)?.value
