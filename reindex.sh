#!/bin/sh
set -e

touch .env
live=$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' .env)
live=${live:-explorer}
case $live in
    explorer-alt) next=explorer ;;
    *) next=explorer-alt ;;
esac

git pull --ff-only
docker compose -p "$next" down -v
docker compose -p "$next" build
docker compose -p "$next" up -d db processor graphql

lag() {
    docker compose -p "$next" exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT head - greatest(height, coalesce((SELECT max(height) FROM squid_processor.hot_block), 0)) FROM chain_info, squid_processor.status"' 2>/dev/null
}

while :; do
    behind=$(lag) || behind=
    [ -n "$behind" ] && [ "$behind" -le 2 ] && break
    echo "$(date -u +%FT%TZ) $next behind by ${behind:-?} blocks"
    sleep 60
done

docker compose -p "$live" stop web graphql-public
docker compose -p "$next" up -d
docker ps -q --filter "label=com.docker.compose.project=$live" | xargs -r docker stop
sed -i '/^COMPOSE_PROJECT_NAME=/d' .env
echo "COMPOSE_PROJECT_NAME=$next" >> .env
