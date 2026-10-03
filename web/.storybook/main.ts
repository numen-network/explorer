import {fileURLToPath} from 'node:url'
import type {StorybookConfig} from '@storybook/nextjs-vite'
import {mergeConfig, searchForWorkspaceRoot} from 'vite'
import {nodePolyfills} from 'vite-plugin-node-polyfills'
import {sdl} from '../../mock/schema.js'

const config: StorybookConfig = {
    framework: '@storybook/nextjs-vite',
    stories: ['../src/**/*.stories.tsx'],
    addons: ['@storybook/addon-vitest', 'msw-storybook-addon'],
    staticDirs: ['./public'],
    viteFinal: vite =>
        mergeConfig(vite, {
            // Next polyfills these node modules for the browser bundle, Vite leaves them out
            plugins: [nodePolyfills({include: ['assert', 'buffer'], globals: {Buffer: true, global: false, process: false}})],
            define: {MOCK_SDL: JSON.stringify(sdl)},
            server: {fs: {allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(new URL('../../mock', import.meta.url))]}},
        }),
}

export default config
