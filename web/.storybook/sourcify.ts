import {http, HttpResponse} from 'msw'

const LOOKUP = 'https://sourcify.dev/server/v2/contract/:chainId/:address'

// answers the Contract tab's lookup the way the public Sourcify server does
export const sourcify = ({status = 200, body}: {status?: number; body: object}) => http.get(LOOKUP, () => HttpResponse.json(body, {status}))

export const sourcifyDown = http.get(LOOKUP, () => HttpResponse.error())
