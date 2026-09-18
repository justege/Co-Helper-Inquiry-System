#!/bin/sh
# Run Node without a broken parent node_modules/.bin/node shim
# (npm prepends those dirs to PATH).
set -e

if [ -n "$npm_node_execpath" ] && [ -x "$npm_node_execpath" ]; then
  exec "$npm_node_execpath" "$@"
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
  echo "Could not find a working node executable." >&2
  exit 1
fi

exec "$NODE" "$@"
