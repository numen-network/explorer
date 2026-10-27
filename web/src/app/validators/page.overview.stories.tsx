import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {all, cardsFit, tileText} from '../../../.storybook/fit'
import {pageMeta} from '../../../.storybook/page'
import ValidatorsPage from './page'
import {exempt, inactive, kicked, released, U128_MAX, validator, validators} from './page.stories.helpers'

export default {title: 'Pages/Validators/Overview', ...pageMeta(ValidatorsPage)}

export const Empty: StoryObj = {
    ...validators([]),
    play: async ({canvasElement}) => {
        await expect(tileText(canvasElement, 'Validators')).toEqual(['Validators', '0 / 1,000', '0 · active0 · pending0 · known'])
        await expect(tileText(canvasElement, 'Total locked')).toEqual(['Total locked', '0 NUMN'])
    },
}

// the pending one counts toward MaxValidators, the kicked, exiting and released
// ones don't. a lock stays in the total until LockReleased, exempt ones lock nothing
export const EveryStatus: StoryObj = {
    ...validators([
        validator(1),
        validator(2, exempt),
        validator(3, kicked('Offline', 1)),
        validator(4, inactive('ExitRequested', 40)),
        validator(5, released(9_000)),
        validator(6, {active: false, lastActiveSession: null}),
    ]),
    play: async ({canvasElement}) => {
        await expect(tileText(canvasElement, 'Validators')).toEqual(['Validators', '3 / 1,000', '2 · active1 · pending6 · known'])
        await expect(tileText(canvasElement, 'Total locked')).toEqual(['Total locked', '400M NUMN'])
    },
}

export const RegistrationLock: StoryObj = {
    ...validators([validator(1)]),
    play: async ({canvasElement}) => expect(tileText(canvasElement, 'Registration lock')).toEqual(['Registration lock', 'By invitation', '180d · lock duration1d · renewal interval']),
}

// two locks at the u128 ceiling sum past what any one lock can hold
export const ExtremeLocks: StoryObj = {
    ...validators([validator(1, {lockedAmount: U128_MAX}), validator(2, {lockedAmount: U128_MAX})]),
    play: all(cardsFit),
}
