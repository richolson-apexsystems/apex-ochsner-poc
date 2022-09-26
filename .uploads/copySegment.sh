#!/bin/bash


word=$1

if [[ $word == *"mp4"* ]]; then
      wget $word
fi


#ffmpeg -y -live_start_index -99999 -i http://127.0.0.1:8888/room36/stream.m3u8 -acodec copy -vcodec copy -hls_segment_type fmp4 -t 30 test.mp4