import {http, HttpResponse} from 'msw'
import {mockSchema, run, schemaFromSdl} from '../../mock/engine.js'

declare const MOCK_SDL: string

const schema = schemaFromSdl(MOCK_SDL)

// answers a story's GraphQL from its own data, keyed by root field the way mock/data.js is
export function graphqlData(data: Record<string, unknown>) {
    const mocked = mockSchema(schema, data)
    return http.post<never, {query: string; variables?: Record<string, unknown>}>('http://127.0.0.1:4350/graphql', async ({request}) =>
        HttpResponse.json(await run(mocked, await request.json()))
    )
}
