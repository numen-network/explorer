import {HEAD} from '../../../../mock/fixtures.js'
import {lastPage, pageMeta} from '../../../.storybook/page'
import PeoplePage from './page'
import {U128_MAX, INT_MAX, registrar, retired, EVERY_VERDICT, Registrar, identities} from './page.stories.helpers'

export default {title: 'Pages/People/Registrars', ...pageMeta(PeoplePage)}

const registrarsTab = (registrars: Registrar[], page = '1') => identities(EVERY_VERDICT, {registrars, tab: 'registrars', page})

export const Empty = registrarsTab([])

export const One = registrarsTab([registrar(0)])

export const EveryCase = registrarsTab([
    registrar(0),
    registrar(1, {fee: '0'}),
    registrar(2, {fee: U128_MAX}),
    registrar(3, {requestCount: 0, givenCount: 0, lastJudgementBlock: null, lastJudgementAt: null}),
    registrar(4, {requestCount: INT_MAX, givenCount: INT_MAX}),
    retired(5, HEAD - 50_000),
])

const manyRegistrars = Array.from({length: 45}, (_, i) => (i % 5 === 3 ? retired(i, HEAD - 200_000 + i * 1_000) : registrar(i)))

export const Many = registrarsTab(manyRegistrars)

export const Page2 = registrarsTab(manyRegistrars, '2')

export const LastPage = registrarsTab(manyRegistrars, lastPage(manyRegistrars.length))
