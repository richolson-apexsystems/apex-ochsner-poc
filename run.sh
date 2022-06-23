#!/bin/bash
# --allow-incompatible-update
export HTTP_FORWARDED_COUNT=1;
#export NODE_OPTIONS='--tls-min-v1.0';

until  meteor --port 3000 --allow-incompatible-update; do
    echo "Server 'meteor' crashed with exit code $?.  Respawning.." >&2
    sleep 1
done