import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {minedObject, topology} from '../../../mock/fixtures/blocks.js'
import {drawnMargins} from '../../.storybook/fit'
import Asteroid from './Asteroid'

const meta = {title: 'Components/Asteroid'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const PROTOCOL = 'poscan-v1'
const {faces} = topology(PROTOCOL)

// a block card draws its object 148px wide, the block page 290px
function Sizes({vertices}: {vertices: string}) {
    return (
        <div className="flex flex-wrap items-end gap-6">
            {[148, 290].map(size => (
                <div key={size} style={{width: size}}>
                    <Asteroid vertices={vertices} faces={faces} size={size} interactive />
                </div>
            ))}
        </div>
    )
}

// every canvas keeps blank pixels between its object and each of its edges
const framed: Story['play'] = async ({canvasElement}) => {
    for (const margins of await drawnMargins(canvasElement, 2)) expect(Object.entries(margins).filter(([, px]) => px === 0)).toEqual([])
}

export const Rock: Story = {render: () => <Sizes vertices={minedObject(9, PROTOCOL).vertices} />, play: framed}

// three times as tall as it is wide, its top leaning toward the camera
export const LongObject: Story = {render: () => <Sizes vertices={minedObject(3, PROTOCOL, [0.7, 2.2, 0.7]).vertices} />, play: framed}
