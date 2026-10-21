import {expect} from 'storybook/test'
import {metadataAction} from '../../../../../mock/fixtures/governance.js'
import {pageMeta} from '../../../../.storybook/page'
import ReferendumPage from './page'
import {curated, story, curatedCase, withPlay} from './page.stories.helpers'

export default {title: 'Pages/Referendum/Overview', ...pageMeta(ReferendumPage)}

export const TimedOutWithoutTitle = curatedCase(3)

const markdownPitch = `Pays a pilot cohort of **three** community teams, see the [forum thread](https://forum.example.com/t/42).

## Budget

| Team | Amount |
| --- | ---: |
| Docs | 12,000 NUMN |
| Tooling | 30,000 NUMN |

- monthly reports
- unspent funds go back to the treasury`

// the description reads as markdown while the text history keeps the raw source
export const DescriptionMarkdown = withPlay(
    story({...curated(6), description: markdownPitch}, 'text', {}, [metadataAction(990_500, 4, 'MetadataSet', {title: curated(6).title, description: markdownPitch})]),
    async ({canvas}) => {
        expect(await canvas.findAllByRole('heading', {name: 'Budget'})).toHaveLength(1)
        expect(canvas.getAllByRole('table')).toHaveLength(1)
        expect(canvas.getAllByRole('link', {name: 'forum thread'})).toHaveLength(1)
        expect(canvas.getByText(content => content.includes('## Budget'))).toHaveTextContent(markdownPitch, {normalizeWhitespace: false})
    }
)
