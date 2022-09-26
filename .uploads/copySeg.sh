#!/bin/bash


# cat init.mp4 $(ls -vx seg*.mp4) > source.mp4     
# wget http://127.0.0.1:8888/room352/seg823.mp4  
#wget -qO- http://127.0.0.1:8888/room352/stream.m3u8
wget http://127.0.0.1:8888/room36/stream.m3u8
awk -F'[,]' '{for (i=1;i<=NF;i++) {printf "%s %s\n",$2,$i;}}' stream.m3u8 > testfile
web="http://127.0.0.1:8888/room36/"
#file="stream.m3u8"
while read -r line; do
    line=$(sed 's/.*,\(.*\)/\1/' $line)
    if [[ $line == *"mp4"* ]]; then
      echo $web
    fi

    
    #echo http://127.0.0.1:8888/room352/$line 
    #wget http://127.0.0.1:8888/room352/$line 


done < "$testfile"


#awk -F'[ ,]+' '{for (i=2;i<=NF;i++) {printf "%s %s\n",$1,$i;}}' file