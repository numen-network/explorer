#!/bin/sh
# rebuild squid_mock from the live testnet index, then inject synthetic rows
# usage: mock/seed.sh, then point graphql at it with GQL_DB_NAME=squid_mock in .env
set -e
cd "$(dirname "$0")/.."

docker compose exec -T db psql -U squid -d squid -c "DROP DATABASE IF EXISTS squid_mock WITH (FORCE)"
docker compose exec -T db psql -U squid -d squid -c "CREATE DATABASE squid_mock"
docker compose exec -T db sh -c "pg_dump -U squid squid | psql -q -U squid squid_mock" >/dev/null
docker compose exec -T db psql -U squid -d squid_mock -q -v ON_ERROR_STOP=1 <mock/inject.sql
echo "squid_mock ready"
