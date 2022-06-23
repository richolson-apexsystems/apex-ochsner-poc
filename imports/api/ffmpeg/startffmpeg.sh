#!/bin/sh

sleep 5

ffmpeg -y -use_wallclock_as_timestamps 1 -rtsp_transport tcp -i rtsp://68.227.145.128:8554/profile2/media.smp  -c copy -f rtsp rtsp://localhost:8554/room352 2> $( dirname -- "$( readlink -f -- "$0"; )"; )/ffmpeg.log