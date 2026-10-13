import {http, HttpResponse} from 'msw'

export const AVATAR_HOST = 'https://avatar.example'

const picture = (hue: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="hsl(${hue} 70% 55%)"/><circle cx="48" cy="38" r="16" fill="#fff" fill-opacity=".85"/><ellipse cx="48" cy="86" rx="30" ry="22" fill="#fff" fill-opacity=".85"/></svg>`

// serves any avatar.example picture except missing.png, which is gone the way a dead link is
export const avatars = http.get(`${AVATAR_HOST}/:name`, ({params}) =>
    params.name === 'missing.png' ? new HttpResponse(null, {status: 404}) : new HttpResponse(picture(String(params.name).length * 47), {headers: {'content-type': 'image/svg+xml'}})
)
