import AccountLink from '@/components/AccountLink'
import {ArgsTable, ArgsToggle} from '@/components/ArgsTable'
import {counted, qualified} from '@/components/calls'
import {JsonBlock} from '@/components/Detail'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import {Tabs, TabsContent} from '@/components/ui/tabs'
import type {ArgNode} from '@/lib/args'
import type {ChainProps} from '@/lib/chain'
import {fmtCount} from '@/lib/format'
import type {AccountRef, CallRef, CallRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

function tally(refs: CallRef[]): string[] {
    const n = new Map<string, number>()
    for (const c of refs) n.set(qualified(c), (n.get(qualified(c)) ?? 0) + 1)
    return [...n].map(([name, count]) => counted(name, count))
}

// calls arrive in preorder, so the length of the address is all the tree there is to draw
export function CallTree({calls, chain, signer}: {calls: (CallRow & {view: ArgNode | null})[]; chain: ChainProps; signer: AccountRef | null}) {
    return (
        <Card size="flush" className="divide-y">
            {calls.length === 0 && <div className="px-5 py-5 text-sm text-muted-foreground">None</div>}
            {calls.map(c => {
                const raised = tally(c.events)
                const dispatched = c.origin && c.origin.id !== signer?.id ? c.origin : null
                const view = c.view
                return (
                    <Collapsible key={c.id} defaultOpen={c.address.length === 0} className="group py-2.5 pr-5" asChild>
                        <Tabs defaultValue={view ? 'table' : 'json'} className="gap-0">
                            <div className="flex flex-wrap items-start gap-x-3 gap-y-1" style={{paddingLeft: `${20 + c.address.length * 22}px`}}>
                                <CollapsibleTrigger className="flex min-h-6 min-w-0 grow cursor-pointer flex-wrap items-center gap-x-3 text-left text-sm">
                                    <span className="font-mono text-[13px] wrap-anywhere">{qualified(c)}</span>
                                    {!c.success && <Badge variant="neg">Failed</Badge>}
                                    {c.events.length > 0 && <span className="text-[11px] whitespace-nowrap text-dim">{fmtCount(c.events.length, 'event')}</span>}
                                </CollapsibleTrigger>
                                {view && <ArgsToggle className="ml-auto group-data-[state=closed]:hidden" />}
                            </div>
                            <CollapsibleContent className="mt-2 space-y-2" style={{paddingLeft: `${36 + c.address.length * 22}px`}}>
                                {dispatched && (
                                    <div className="flex gap-3 text-sm">
                                        <span className="text-muted-foreground">Dispatched as</span>
                                        <AccountLink full addr={ss58Encode(dispatched.id, chain.ss58)} acc={dispatched} />
                                    </div>
                                )}
                                {view && (
                                    <TabsContent value="table">
                                        <ArgsTable node={view} chain={chain} />
                                    </TabsContent>
                                )}
                                <TabsContent value="json">
                                    <JsonBlock value={c.args} />
                                </TabsContent>
                                {raised.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {raised.map(name => (
                                            <Tip key={name} text={name}>
                                                <Badge variant="outline" className="min-w-0 shrink truncate bg-background font-mono text-muted-foreground">
                                                    {name}
                                                </Badge>
                                            </Tip>
                                        ))}
                                    </div>
                                )}
                            </CollapsibleContent>
                        </Tabs>
                    </Collapsible>
                )
            })}
        </Card>
    )
}
