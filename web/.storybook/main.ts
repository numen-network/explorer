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
            // bundled up front, a dependency found halfway through a test run reloads every test file
            optimizeDeps: {
                include: [
                    '@icons-pack/react-simple-icons',
                    '@noble/hashes/blake2.js',
                    '@noble/hashes/utils.js',
                    '@subsquid/scale-codec',
                    '@subsquid/ss58',
                    '@tanstack/react-table',
                    '@zag-js/pagination',
                    '@zag-js/react',
                    'class-variance-authority',
                    'cn',
                    'echarts',
                    'lucide-react',
                    'msw-storybook-addon/csf3',
                    'next/dist/client/components/redirect',
                    'nuqs',
                    'nuqs/adapters/testing',
                    'nuqs/server',
                    'radix-ui',
                    'react-day-picker',
                    'shiki/core',
                    'shiki/engine/javascript',
                    'shiki/langs/json.mjs',
                    'shiki/langs/solidity.mjs',
                    'shiki/langs/vyper.mjs',
                    'shiki/themes/github-light.mjs',
                    'storybook/viewport',
                    'three',
                    'three/addons/controls/OrbitControls.js',
                    'zustand',
                ],
            },
            server: {fs: {allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(new URL('../../mock', import.meta.url))]}},
        }),
}

export default config
