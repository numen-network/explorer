import {accountExtrinsics, ME, subject} from '../../../../../mock/fixtures/accounts.js'
import {rows, transfer} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story} from './page.stories.helpers'

export default {title: 'Pages/Account/Extrinsics', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const Empty = story({account: subject({nonce: 0}), transfers: rows(3, (h: number, i: number) => transfer(h, i, {to: ME}))}, {tab: 'extrinsics'})

export const One = story({account: subject({nonce: 1}), extrinsics: accountExtrinsics(1)}, {tab: 'extrinsics'})

export const Many = story({account: subject({nonce: 412}), extrinsics: accountExtrinsics(20), counts: {extrinsics: 412}}, {tab: 'extrinsics'})
