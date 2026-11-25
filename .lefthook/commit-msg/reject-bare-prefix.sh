#!/bin/sh
# The scope prefix makes an otherwise empty message non-empty, so git would no longer abort when
# the editor is closed without writing anything. Restore that abort here.

body=$(grep -v '^#' "$1" | sed -E '1s/^\[[^]]+\] - ?//' | tr -d '[:space:]')

if [ -z "$body" ]; then
    echo 'Aborting commit due to empty commit message.' >&2
    exit 1
fi
