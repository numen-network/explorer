import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import Section from './Section'

const meta = {
    title: 'Components/Section',
    component: Section,
    args: {title: 'Latest blocks', children: <Card className="px-5 py-6 text-sm text-muted-foreground">Section body</Card>},
} satisfies Meta<typeof Section>
export default meta
type Story = StoryObj<typeof meta>

export const TitleOnly: Story = {args: {title: 'Network info'}}

export const WithViewAll: Story = {args: {more: '/blocks'}}
