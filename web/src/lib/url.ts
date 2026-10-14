export const https = (url: string | null | undefined) => (url && /^https:\/\//i.test(url) ? url : null)
