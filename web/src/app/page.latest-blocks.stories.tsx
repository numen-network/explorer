import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {referenda} from '../../../mock/data.js'
import {minedObject, topology} from '../../../mock/fixtures/blocks.js'
import {DAILY} from '../../../mock/fixtures/home.js'
import {HEAD, PEOPLE, transfer} from '../../../mock/fixtures.js'
import {all, axesLegible, type Play, drawnCanvases, drawnFaces, expectInContentBox, expectOneLine, expectShortHashes} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {PROTOCOL, timeAt, home, minedUpTo, TREASURY, MANY_FINALIZED, many, homeFits} from './page.stories.helpers'

export default {title: 'Pages/Home/Latest blocks', ...pageMeta(Home)}

// a tile needs 240px to keep its figure and its chips on one line each, a row
// holds as many of those as fit and a single tile once two no longer do
const tilesFit: Play = async ({canvasElement}) => {
    const grid = within(canvasElement).getByText('Signed extrinsics').closest('[data-slot=card]')!.parentElement!
    const tiles = [...grid.children]
    expectOneLine(...tiles.flatMap(tile => [...tile.querySelectorAll('[data-slot=card-title], [data-slot=card-content]')]))
    if (grid.clientWidth < 2 * 240 + 16) await expect(new Set(tiles.map(tile => tile.getBoundingClientRect().left)).size).toBe(1)
}

// each block card keeps its object clear of the padding and its protocol on one line
const railObjectsFit: Play = async ({canvasElement}) => {
    const rail = within(canvasElement).getByRole('heading', {name: 'Latest blocks'}).closest('section')!
    for (const object of await drawnCanvases(rail, 5)) expectInContentBox(object.closest('[data-slot=card]')!, object)
    expectOneLine(...within(rail).getAllByText(PROTOCOL))
}

// each block card shortens its own hash and its object's the same way
const railHashes: Play = async ({canvasElement}) => {
    const rail = within(canvasElement).getByRole('heading', {name: 'Latest blocks'}).closest('section')!
    expectShortHashes(...[...rail.querySelectorAll('[data-slot=badge]'), ...within(rail).getAllByText(/^OBJ /)].map(el => el.textContent!))
}

// a chip under ten thousand groups its digits like the tile value above it
export const Many: StoryObj = {
    ...pageStory(home(many)),
    play: all(
        async context => {
            await axesLegible(context)
            await expect(context.canvas.getByText('+1,139')).toBeVisible()
        },
        homeFits,
        railObjectsFit,
        railHashes,
        tilesFit
    ),
}

// an upgrade moved mining onto poscan-v2 two blocks ago, so the rail mixes
// objects of both protocols and each draws on its own protocol's topology
const [V1, V2] = [topology(PROTOCOL), topology('poscan-v2')]
const mixed = minedUpTo(HEAD, 5, MANY_FINALIZED).map((o, i) => ({...o, ...minedObject(o.block.height, i < 2 ? V2.id : V1.id)}))

export const MixedProtocols: StoryObj = {
    ...pageStory({...home({...many, objects: mixed}), meshTopologies: [V1, V2]}),
    play: async ({canvas, canvasElement}) => {
        const rail = within(canvasElement).getByRole('heading', {name: 'Latest blocks'}).closest('section')!
        await expect(await drawnFaces(rail, 5)).toEqual([V2, V2, V1, V1, V1].map(t => t.faceCount))
        await expect(canvas.getByText('PoScan protocol').nextElementSibling).toHaveTextContent(V2.id)
    },
}

const FAR = 987_654_321
const HUGE = '987654321098765432109876543210'

const farDays = DAILY.slice(-31).map((d, i, all) => ({
    ...d,
    transfers: d.transfers * 10_000,
    transferVolume: String(BigInt(d.transferVolume) * 10n ** 6n),
    ...(i === all.length - 1 && {
        cumExtrinsicsSigned: '98765432109',
        cumTransfers: '12345678901',
        issuanceTotal: HUGE,
        issuanceInactive: '0',
        issuanceTransferable: '876543210987654321098765432109',
        treasuryPot: '0',
        difficultyClose: '987654321987654',
    }),
}))

export const Extremes: StoryObj = {
    ...pageStory(
        home({
            head: FAR,
            days: farDays,
            objects: minedUpTo(FAR, 5, FAR - 5, height => ({
                extrinsicCount: 1_234,
                eventCount: 98_765,
                author: height === FAR ? null : PEOPLE[(FAR - height) % 2 ? 7 : 8],
            })),
            transfers: [
                transfer(FAR, 1, {amount: '12345678123456789123456789', from: PEOPLE[7], to: PEOPLE[7], timestamp: timeAt(FAR, FAR)}),
                transfer(FAR, 2, {amount: '1', from: PEOPLE[8], to: PEOPLE[2], timestamp: timeAt(FAR, FAR)}),
                transfer(FAR - 1, 1, {amount: '549926000123456789012345678', from: TREASURY, call: {pallet: 'Balances', method: 'force_transfer'}, timestamp: timeAt(FAR, FAR - 1)}),
            ],
            referendums: [
                {...referenda[4], id: '123456', index: 123_456, proposalAmount: '199999999999999999999999'},
                {...referenda[8], id: '123455', index: 123_455},
            ],
            validators: 1_000,
            sessionLength: 14_400,
            windows: {
                accounts: [1_234_567_890, 98_765_432, 987_654_321],
                miners: [2_147_483_647, 99_999, 1_000_000],
                extrinsics: [0, 9_876_543, 987_654_321],
                transfers: [0, 1_234_567, 123_456_789],
                evm: [2_147_483_647, 98_765_432, 987_654_321],
            },
        })
    ),
    play: all(homeFits, async ({canvas}) => {
        for (const count of ['Extrinsics 1,234', 'Events 98,765']) await expect(canvas.getAllByText(count)).toHaveLength(5)
        await expect(canvas.getByText('Block 1,522 / 14,400')).toBeVisible()
        await expect(canvas.getByText('Session length').nextElementSibling).toHaveTextContent('14,400 blocks')
    }),
}
