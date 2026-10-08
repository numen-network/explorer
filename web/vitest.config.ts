import {fileURLToPath} from 'node:url'
import {storybookTest} from '@storybook/addon-vitest/vitest-plugin'
import {playwright} from '@vitest/browser-playwright'
import {defineConfig} from 'vitest/config'

// phones and tablets lay their scrollbars over the content, desktop browsers
// give them room of their own
const VIEWPORTS = {mobile1: false, tablet: false, laptop: true, desktop: true}

export default defineConfig({
    test: {
        projects: Object.entries(VIEWPORTS).map(([value, scrollbars]) => ({
            extends: true,
            plugins: [storybookTest({configDir: fileURLToPath(new URL('.storybook', import.meta.url)), initialGlobals: {viewport: {value, isRotated: false}}})],
            test: {
                name: `storybook-${value}`,
                testTimeout: 60_000,
                browser: {enabled: true, headless: true, provider: playwright(scrollbars ? {launchOptions: {ignoreDefaultArgs: ['--hide-scrollbars']}} : {}), instances: [{browser: 'chromium'}]},
            },
        })),
    },
})
