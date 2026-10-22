# Numen Explorer

Block explorer for the Numen chain. A Subsquid processor feeds Postgres, served over GraphQL, rendered by a Next.js SSR frontend.

```
archive node (WSS/RPC)
      │
      ▼
squid processor ──► Postgres ──┬──► GraphQL (4350) ──► Next.js SSR (3000)
                               │
                               └──► public GraphQL (4351)
```

The web never talks to the node. Chain properties and the chain head reach it through a row the processor keeps fresh, so GraphQL is its only dependency.

It covers blocks with their mined 3D objects, extrinsics with a chain wide call filter and the call tree under each one, events, accounts with identity and vesting, on chain identities and their registrars, transfers, EVM transactions and logs, ERC20 tokens, OpenGov referenda with decision curves, treasury spends, bounties, validators, a miner leaderboard, a charts section over the daily aggregates and global search.

## Layout

| path                 | role                                |
| -------------------- | ----------------------------------- |
| `squid/`             | indexer, migrations, GraphQL server |
| `web/`               | Next.js frontend                    |
| `mock/`              | GraphQL mock data and fake server   |
| `docker-compose.yml` | full stack orchestration            |

## Requirements

A numen archive node, `--state-pruning archive` is mandatory. Docker with the compose v2 plugin, on Ubuntu that is the `docker-compose-v2` package.

## Quick start

```bash
docker compose up -d --build
```

Brings up Postgres, the processor, both GraphQL servers and the web. The web and the public GraphQL are published on 3000 and 4351. Both bind to this machine only, so a reverse proxy decides what the world sees. Everything else stays on the compose network. The node is expected on the host. Environment overrides, all optional.

| var                    | default                          |
| ---------------------- | -------------------------------- |
| `RPC_ENDPOINT`         | `ws://host.docker.internal:9944` |
| `DB_NAME`              | `squid`                          |
| `DB_PASS`              | `squid`                          |
| `PUBLIC_GQL_POOL_SIZE` | `2`                              |

Switching networks means pointing the indexer at another node and using a fresh database. Postgres creates only `squid` on its first start, so any other `DB_NAME` has to exist before the processor can reach it, otherwise it restarts forever.

```bash
docker compose exec db psql -U squid -c "CREATE DATABASE squid_dev"
```

The software never knows which network it is on. Chain name, token symbol, decimals, ss58 prefix and EVM chain id are all read from the chain at runtime, the indexer parks them in the database for the web to read.

## Updating

```bash
git pull && docker compose up -d --build
```

Compose rebuilds only the images whose inputs changed. Migrations need no step of their own, the processor applies them on every start. When a single service is all that moved, name it and skip the rest.

```bash
docker compose up -d --build web
```

A runtime upgrade is the exception. Regenerate the typed accessors and commit them before the server pulls, the way Development describes.

## Reindexing

A processor change means indexing from genesis again. `reindex.sh` builds the new index next to the live one, so the site keeps serving while it catches up. It runs for hours, so detach it from the shell.

```bash
(nohup setsid ./reindex.sh > /tmp/explorer-reindex.log 2>&1 < /dev/null &)
```

Two compose projects take turns, `explorer` and `explorer-alt`. The script pulls, builds the idle one and starts its database, processor and internal GraphQL. Once the new index is within two blocks of the chain head, it moves the web and the public GraphQL to the new project on the same ports. Then it stops the rest of the old one. `COMPOSE_PROJECT_NAME` in `.env` records the new name, so plain `docker compose` follows it.

The old project stays stopped until the next reindex wipes it. Rolling back from `explorer-alt` to `explorer` takes four commands.

```bash
docker compose -p explorer-alt stop web graphql-public
docker compose -p explorer start
docker compose -p explorer-alt stop
sed -i 's/^COMPOSE_PROJECT_NAME=.*/COMPOSE_PROJECT_NAME=explorer/' .env
```

## Public GraphQL

`graphql-public` answers outside traffic from the same database through its own pool. Heavy queries stall that server, never the web. The web stays on the internal server because some of its queries fetch whole lists, which the public limits refuse.

| limit         | value                                                 |
| ------------- | ----------------------------------------------------- |
| request body  | 8 KB                                                  |
| root fields   | 10                                                    |
| response      | 10000 nodes, `vertices` weighs 1000 and `faces` 400   |
| SQL statement | 3 s                                                   |
| connections   | `PUBLIC_GQL_POOL_SIZE`, no parallel workers           |
| heap          | 1 GB                                                  |

The body cap and the in-memory cache keep Apollo's memory bounded. Drop either and a stream of unique queries runs the server out of heap in minutes. The cache also serves repeats for 5 s. Statements over a second land in the Postgres log.

`NODE_ENV=development` turns introspection on, since Apollo disables it in production. Errors then carry the SQL and a stack trace.

Rate limits belong to the reverse proxy.

## Development

Every service runs in docker, so a code change means a rebuild.

```bash
docker compose up -d --build
```

`squid/.env.example` lists every variable the processor reads. Compose passes them in, so nothing on disk has to hold them.

UI states. Storybook renders components and pages in every state they can be in. Page stories call the page in a loader and answer its GraphQL through MSW, so each story carries its own data. Stories read their schema and cases from `mock/`, so install it first.

```bash
cd mock && pnpm install
```

```bash
cd web && pnpm storybook
```

`pnpm test-storybook` renders every story in headless Chromium and fails on any that throws.

Mock data. `mock/engine.js` answers GraphQL from plain data keyed by root field. Its schema comes from `squid/schema.graphql` through openreader, the builder behind the squid GraphQL server. Stories and the fake server both run on it, and `mock/data.js` holds the cases they draw on. Arguments are ignored, so every query on a field gets the same answer. A field left out returns an empty list or null, and whatever an object leaves out gets a default. A field that has to answer differently per query can be a function that receives the query arguments.

The fake server runs the whole site without an index. It serves `mock/data.js` on 127.0.0.1:4350, where the web looks when `GQL_HTTP` is unset, and restarts on every save. GraphiQL on the same address lists the root fields.

```bash
cd mock && pnpm install && pnpm start
```

```bash
cd web && pnpm dev
```

After a runtime upgrade regenerate the typed accessors.

```bash
cd squid
pnpm exec squid-substrate-metadata-explorer --rpc ws://127.0.0.1:9944 --out specVersions.jsonl
pnpm run typegen && pnpm run build
```

The explorer refuses to append to a file that holds another chain, so delete `specVersions.jsonl` first when you point it at a different node. Generated accessors carry the spec version in their name, a chain on a different version renames every call site.

## Design notes

- Package manager is pnpm, pinned by the `packageManager` field and enabled through corepack in both images. Install scripts are denied by default, `squid/pnpm-workspace.yaml` records the ones that were looked at and rejected.
- Tabs live in the url, so the server builds only the panel being read and a tab can be linked. The account page carries this furthest, one query per tab plus a summary that fetches nothing but counts.
- Every table is a TanStack Table drawn with the shadcn table parts through `web/src/components/DataTable.tsx`. Column widths follow the content and a wide table scrolls sideways inside its card. Sorting and paging stay in the url, so the table registers no feature that could reorder the page it was handed. Rows open through TanStack row expanding rather than a details element, since a details cannot sit inside a table.
- UI parts are shadcn's generated files under `web/src/components/ui/`, pulled with the CLI and edited only for explorer tones and spacing. Icons come from lucide-react and simple-icons, which makes every icon in a server component a small client component of its own, a cost taken knowingly rather than copying SVG paths by hand.
- Finality lags the head by minutes on this chain, so the processor follows hot blocks and marks finality separately.
- Mined objects are not stored on chain. The processor regenerates each one from the node and stores gzipped f32 vertex arrays, topology is stored once per protocol version.
- ERC20 supply is derived purely from events, only token metadata goes through `eth_call`.
- Every call in an extrinsic gets a row, the root included. A batch, a proxy or a multisig is then an ordinary call that happens to have children, and the transfers and events underneath point at the call that really ran them.

## Things that must move together

`web/src/lib/gql.ts` mirrors `squid/schema.graphql`.

`mock/package.json` pins the `@subsquid/openreader` that `squid/pnpm-lock.yaml` resolves for the GraphQL server.
