#!/bin/sh
set -e

git pull --ff-only
docker compose build
docker compose down -v
docker compose up -d
