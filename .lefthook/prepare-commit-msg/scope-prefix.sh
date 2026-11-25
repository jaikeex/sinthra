#!/bin/sh
# Prefixes the commit message with the workspace the staged changes belong to:
# "[API] - " for one package, "[PROJECT] - " for several, "[ROOT] - " for root-only changes.
# Root files staged next to a package (lockfile, shared config) do not change the scope, since
# they are almost always a side effect of the package change.

msg_file=$1
source=$2

# Git writes merge and squash messages itself; leave them as they are.
case $source in merge | squash) exit 0 ;; esac

# Already prefixed (amend, reused message) or an autosquash marker that must stay first.
case $(head -n 1 "$msg_file") in
    '['*'] - '* | 'fixup! '* | 'squash! '* | 'amend! '*) exit 0 ;;
esac

scopes=$(git diff --cached --name-only |
    sed -nE 's#^(apps|packages)/([^/]+)/.*#\2#p' |
    sort -u)

case $(printf '%s' "$scopes" | grep -c .) in
    0) prefix='[ROOT] - ' ;;
    1) prefix="[$(printf '%s' "$scopes" | tr '[:lower:]' '[:upper:]')] - " ;;
    *) prefix='[PROJECT] - ' ;;
esac

{ printf '%s' "$prefix"; cat "$msg_file"; } >"$msg_file.tmp" && mv "$msg_file.tmp" "$msg_file"
