// a YYYY-MM-DD string is a day only if Date reads it back unchanged, 2026-02-30 would roll into March
export const isDay = (s: string) => new Date(s).toJSON()?.slice(0, 10) === s
