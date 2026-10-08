import {fileURLToPath} from 'node:url'
import {storybookTest} from '@storybook/addon-vitest/vitest-plugin'
import {playwright} from '@vitest/browser-playwright'
import {defineConfig} from 'vitest/config'

const VIEWPORTS = ['mobile1', 'tablet', 'laptop', 'desktop']

export default defineConfig({
    test: {
        projects: VIEWPORTS.map(value => ({
            extends: true,
            plugins: [storybookTest({configDir: fileURLToPath(new URL('.storybook', import.meta.url)), initialGlobals: {viewport: {value, isRotated: false}}})],
            test: {
                name: `storybook-${value}`,
                testTimeout: 60_000,
                browser: {enabled: true, headless: true, provider: playwright({}), instances: [{browser: 'chromium'}]},
            },
        })),
    },
})
