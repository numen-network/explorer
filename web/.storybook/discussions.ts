import {http, HttpResponse} from 'msw'

// where a story's page reads Gov Bot's thread links from
export const DISCUSSIONS_URL = 'https://discussions.test/discussions.json'

// answers the Discuss button's lookup the way Gov Bot's published file does
export const discussions = (links: Record<string, string>) => http.get(DISCUSSIONS_URL, () => HttpResponse.json(links))
