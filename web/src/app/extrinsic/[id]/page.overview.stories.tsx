import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {chainInfo, person} from '../../../../../mock/fixtures.js'
import {batchInterrupted, evmTransact, mined, pick, signedCall, timestampSet, tipped, transfer} from '../../../../../mock/fixtures/blocks.js'
import {expectAddressForm, expectFits, expectTimesFit} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ExtrinsicPage from './page'
import {Spec, H, of, detail, expectCallRowsFit, wasm} from './page.stories.helpers'

export default {title: 'Pages/Extrinsic/Overview', ...pageMeta(ExtrinsicPage)}

// fmtBalance prints every digit, so a shown amount reads back to its planck
function planck(text: string) {
    const [whole, frac = ''] = text.replace(/[^\d.]/g, '').split('.')
    return BigInt(whole + frac.padEnd(chainInfo.decimals, '0'))
}

// the fee lines agree with the balance events of the same extrinsic. the sender
// gets back what it was charged over the fee and the tip, the fee splits
// between the miner and the treasury, and the tip reaches the miner whole
function feesAddUp(spec: Spec, options?: Parameters<typeof detail>[1]): StoryObj {
    const scene = mined(H, [timestampSet, spec])
    const picked = pick(scene, 1)
    const events: {pallet: string; method: string; args: unknown}[] = picked.events
    const balances = (method: string) => events.filter(e => e.pallet === 'Balances' && e.method === method).map(e => e.args as {who: string; amount: string})
    const moved = (method: string, who: string) => balances(method).filter(a => a.who === who).reduce((sum, a) => sum + BigInt(a.amount), 0n)
    const [{who: payer}] = balances('Withdraw')
    const author = scene.block.author.id
    const feePaid = events.find(e => e.method === 'TransactionFeePaid')?.args as {actualFee: string} | undefined
    const withdrawn = moved('Withdraw', payer)
    const paid = feePaid ? BigInt(feePaid.actualFee) : withdrawn - moved('Deposit', payer)
    const refund = withdrawn - paid
    return {
        ...detail(picked, options),
        play: async ({canvas}) => {
            const value = (label: string) => canvas.getByText(label).nextElementSibling as HTMLElement
            const fee = planck(value('Fee').firstChild!.textContent!)
            const toMiner = planck(within(value('Fee')).getByText(/^to miner/).textContent!)
            const toTreasury = planck(within(value('Fee')).getByText(/^to treasury/).textContent!)
            const tip = planck(value('Tip').firstChild!.textContent!)
            expect(fee + tip).toBe(paid)
            expect(toMiner + toTreasury).toBe(fee)
            expect(toMiner + tip + (payer === author ? refund : 0n)).toBe(moved('Deposit', author))
            expect(toTreasury).toBe(moved('Deposit', chainInfo.treasuryAccount))
            await expect(within(value('Tip')).getByText('to miner')).toBeVisible()
        },
    }
}

const whale = (height: number) => transfer(height, {fee: 987_654_321_987_654_321_987_654n, tip: 1_234_567_891_234_567_891_234_567n})

const applyUpgrade = (height: number) => signedCall(height, 'System.apply_authorized_upgrade', {code: wasm}, {fee: 0n, events: [['System.CodeUpdated', null]]})

// the signer keeps its full address and wraps it inside its row, the
// timestamp breaks after its age inside its own, and the call keeps its events
// inside its row
export const Transfer: StoryObj = {
    ...detail(of(transfer)),
    play: async ({canvasElement}) => {
        expectAddressForm(canvasElement)
        expectFits(canvasElement.querySelector('a[href^="/account/"]')!.closest('[data-slot=card] > *')!)
        expectTimesFit(canvasElement)
        expectCallRowsFit(canvasElement)
    },
}

export const TransferWithTip = feesAddUp(tipped)

export const Unsigned = detail(pick(mined(H, [timestampSet]), 0))

export const EvmTransact = feesAddUp(evmTransact, {evm: true})

// the miner pays for its own batch, so the refund for the items that never ran
// lands on the account its fee share and the tip go to
export const SignedByMiner = feesAddUp((height: number) => batchInterrupted(height, {from: person(height), tip: 5_000_000_000_000_003n, refund: 1_393_089_283_907_427n}))

export const RuntimeUpgradeFeeWaived = detail(of(applyUpgrade))

export const ExtremeFeeAndTip = feesAddUp(whale)
