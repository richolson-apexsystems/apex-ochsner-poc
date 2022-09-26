#!/bin/bash


# cat init.mp4 $(ls -vx seg*.mp4) > source.mp4     
# wget http://127.0.0.1:8888/room352/seg823.mp4  
#wget -qO- http://127.0.0.1:8888/room352/stream.m3u8
wget http://127.0.0.1:8888/room36/stream.m3u8
wget http://127.0.0.1:8888/room36/init.mp4
#awk -F'[,]' '{for (i=1;i<=NF;i++) {printf "%s %s\n",$2,$i;}}' stream.m3u8 > testfile
web="http://127.0.0.1:8888/room36/"

while read -ra words; do 
  for word in "${words[@]}"; do
    ./copySegment.sh "$web$word"
  done
done < stream.m3u8