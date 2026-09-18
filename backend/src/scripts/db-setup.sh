#!/bin/sh
# Run setupDb.js with a real Node binary, not a broken parent
# node_modules/.bin/node shim (npm prepends those dirs to PATH).
set -e

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
SETUP="$ROOT/src/scripts/setupDb.js"

if [ -n "$npm_node_execpath" ] && [ -x "$npm_node_execpath" ]; then
  exec "$npm_node_execpath" "$SETUP" "$@"
fi

NEWPATH=""
IFS=":"
for p in $PATH; do
  case "$p" in
    */node_modules/.bin) continue ;;
  esac
  if [ -z "$NEWPATH" ]; then
    NEWPATH="$p"
  else
    NEWPATH="$NEWPATH:$p"
  fi
done
unset IFS
PATH="$NEWPATH"
export PATH

NODE="$(command -v node || true)"
if [ -z "$NODE" ] || [ ! -x "$NODE" ]; then
  echo "Could not find a working node executable. Install Node 20+ or run:" >&2
  echo "  nvm use && node src/scripts/setupDb.js" >&2
  exit 1
fi

exec "$NODE" "$SETUP" "$@"
