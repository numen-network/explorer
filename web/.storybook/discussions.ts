import {http, HttpResponse} from 'msw'

// where a story's page asks discord-gov-bot for a referendum's thread
export const DISCUSSIONS_URL = 'https://discussions.test'

// answers the Discuss button's lookup the way discord-gov-bot does
export const discussions = (links: Record<string, string>) =>
    http.get(`${DISCUSSIONS_URL}/discussions/:index`, ({params}) => {
        const url = links[String(params.index)]
        return url ? HttpResponse.json({url}) : HttpResponse.json({error: 'no thread for this referendum'}, {status: 404})
    })
