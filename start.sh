#!/usr/bin/env sh
# Starts the whole stack with one command: creates a .env with a strong signing
# key the first time, builds, and waits until the API answers before printing
# where to go. Everything it does is also written out in the README, so nothing
# here is required -- it only saves typing.
set -eu

cd "$(dirname "$0")"

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 36 | tr -d '\n'
  elif command -v node >/dev/null 2>&1; then
    node -e "process.stdout.write(require('crypto').randomBytes(36).toString('base64url'))"
  else
    printf ''
  fi
}

if [ ! -f .env ]; then
  secret=$(generate_secret)

  if [ -n "$secret" ]; then
    sed "s|^JWT_SECRET=.*|JWT_SECRET=$secret|" .env.example > .env
    echo "Created .env with a generated JWT_SECRET, so signing in survives a rebuild."
  else
    cp .env.example .env
    echo "Created .env. No openssl or node here, so JWT_SECRET is empty: the API"
    echo "generates one per boot and you will be signed out after each rebuild."
  fi
else
  echo "Using the .env already here."
fi

echo "Building and starting. The first run pulls images and takes a few minutes."
docker compose up --build -d --wait

cat <<'DONE'

The stack is up.

  Shop        http://localhost:3000
  Dashboard   http://localhost:3000/dashboard/product
  Swagger     http://localhost:4000/api/v1/docs

  Sign in     demo@demo.com / demo

The catalog is empty on purpose. Fill it from Dashboard -> Product -> Import CSV
with the file the challenge provided, committed here so the run is reproducible:

  docs/csv/LoanPro Code Challenge E-Commerce.csv

Expect 85 created, 10 rejected, 2 skipped. The rejections are the point: the file
is hostile on purpose and the report names every one with its line and reason.

Stop it with `docker compose down`, or `docker compose down -v` to wipe the data.
DONE
