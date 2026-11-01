import {fileURLToPath} from 'node:url'
import type {StorybookConfig} from '@storybook/nextjs-vite'
import {mergeConfig, searchForWorkspaceRoot} from 'vite'
import {nodePolyfills} from 'vite-plugin-node-polyfills'
import {sdl} from '../../mock/schema.js'
import {DISCUSSIONS_URL} from './discussions'

const config: StorybookConfig = {
    framework: '@storybook/nextjs-vite',
    stories: ['../src/**/*.stories.tsx'],
    addons: ['@storybook/addon-vitest', 'msw-storybook-addon'],
    staticDirs: ['./public'],
    viteFinal: vite =>
        mergeConfig(vite, {
            // Next polyfills these node modules for the browser bundle, Vite leaves them out
            plugins: [nodePolyfills({include: ['assert', 'buffer'], globals: {Buffer: true, global: false, process: false}})],
            define: {MOCK_SDL: JSON.stringify(sdl), 'process.env.DISCUSSIONS_URL': JSON.stringify(DISCUSSIONS_URL)},
            // bundled up front, a dependency found halfway through a test run reloads every test file
            optimizeDeps: {
                include: [
                    '@base-ui/react/button',
                    '@base-ui/react/collapsible',
                    '@base-ui/react/dialog',
                    '@base-ui/react/input',
                    '@base-ui/react/merge-props',
                    '@base-ui/react/popover',
                    '@base-ui/react/select',
                    '@base-ui/react/separator',
                    '@base-ui/react/switch',
                    '@base-ui/react/tabs',
                    '@base-ui/react/toggle',
                    '@base-ui/react/tooltip',
                    '@base-ui/react/use-render',
                    '@icons-pack/react-simple-icons',
                    '@noble/hashes/blake2.js',
                    '@noble/hashes/utils.js',
                    '@subsquid/scale-codec',
                    '@subsquid/ss58',
                    '@subsquid/substrate-runtime',
                    '@tanstack/react-table',
                    '@zag-js/pagination',
                    '@zag-js/react',
                    'class-variance-authority',
                    'cn',
                    'echarts',
                    'jdenticon',
                    'lucide-react',
                    'msw-storybook-addon/csf3',
                    'next/dist/client/components/redirect',
                    'nuqs',
                    'nuqs/adapters/testing',
                    'nuqs/server',
                    'qr',
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
                    'vite-plugin-node-polyfills/shims/buffer',
                    'zustand',
                ],
            },
            server: {fs: {allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(new URL('../../mock', import.meta.url)), fileURLToPath(new URL('../../squid/specVersions.jsonl', import.meta.url))]}},
        }),
}

export default config
