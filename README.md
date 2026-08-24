# Numen Explorer

Block explorer for the Numen chain. A Subsquid processor feeds Postgres, served over GraphQL, rendered by a Next.js SSR frontend.

```
archive node (WSS/RPC)
      │
      ▼
squid processor ──► Postgres ──► GraphQL (4350)
                                    │
Next.js SSR (3000) ◄────────────────┘
```

The web never talks to the node. Chain properties and the chain head reach it through a row the processor keeps fresh, so GraphQL is its only dependency.

It covers blocks with their mined 3D objects, extrinsics with a chain wide call filter and the call tree under each one, events, accounts with identity and vesting, on chain identities and their registrars, transfers, EVM transactions and logs, ERC20 tokens, OpenGov referenda with decision curves, treasury spends, bounties, validators, a miner leaderboard, a charts section over the daily aggregates and global search.

## Layout

| path                 | role                                |
| -------------------- | ----------------------------------- |
| `squid/`             | indexer, migrations, GraphQL server |
| `web/`               | Next.js frontend                    |
| `mock/`              | mock database seeding for UI work   |
| `docker-compose.yml` | full stack orchestration            |

## Requirements

A numen archive node, `--state-pruning archive` is mandatory. Docker with the compose v2 plugin, on Ubuntu that is the `docker-compose-v2` package.

## Quick start

```bash
docker compose up -d --build
```

Brings up Postgres, the processor, GraphQL and the web. Only the web is published, on 3000 and only to this machine, so everything else stays on the compose network. The node is expected on the host. Environment overrides, all optional.

| var            | default                            |
| -------------- | ---------------------------------- |
| `RPC_ENDPOINT` | `ws://host.docker.internal:9944`   |
| `DB_NAME`      | `squid`                            |
| `GQL_DB_NAME`  | same as `DB_NAME`                  |
| `DB_PASS`      | `squid`                            |

Switching networks means pointing the indexer at another node and using a fresh database. Postgres creates only `squid` on its first start, so any other `DB_NAME` has to exist before the processor can reach it, otherwise it restarts forever.

```bash
docker compose exec db psql -U squid -c "CREATE DATABASE squid_dev"
```

The software never knows which network it is on. Chain name, token symbol, decimals, ss58 prefix and EVM chain id are all read from the chain at runtime, the indexer parks them in the database for the web to read.

## Development

Every service runs in docker, so a code change means a rebuild.

```bash
docker compose up -d --build
```

`squid/.env.example` lists every variable the processor reads. Compose passes them in, so nothing on disk has to hold them.

Mock data. The seed script clones the live index into a `squid_mock` database and injects synthetic rows on top. It reads the source by its default name `squid`, so a run under any other `DB_NAME` clones an empty database. Real blocks, transfers and mined objects come with the clone, and injected heights all sit below the cloned tip so block links and timestamps resolve.

```bash
mock/seed.sh
echo "GQL_DB_NAME=squid_mock" > .env
docker compose up -d
```

GraphQL now serves the mock while the processor keeps indexing the real chain into the main database. The frontend needs no changes, it renders whatever GraphQL serves. Delete `.env` and `docker compose up -d` again to switch back. Rerun `mock/seed.sh` any time, it drops and rebuilds the whole mock database from a fresh clone.

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
- Tables are css grid because table auto layout cannot shrink an address column. Rows and sections are `display: contents`, so everything a row wants painted is written against its cells in the `.gtable` rules.
- Finality lags the head by minutes on this chain, so the processor follows hot blocks and marks finality separately.
- Mined objects are not stored on chain. The processor regenerates each one from the node and stores gzipped f32 vertex arrays, topology is stored once per protocol version.
- ERC20 supply is derived purely from events, only token metadata goes through `eth_call`.
- Every call in an extrinsic gets a row, the root included. A batch, a proxy or a multisig is then an ordinary call that happens to have children, and the transfers and events underneath point at the call that really ran them.

## Things that must move together

`web/src/lib/gql.ts` mirrors `squid/schema.graphql`.
