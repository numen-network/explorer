import type {OnUrlUpdateFunction} from 'nuqs/adapters/testing'
import {fn} from 'storybook/test'

// every url update a story's controls ask for, cleared before each story
export const urlUpdates = fn<OnUrlUpdateFunction>()
