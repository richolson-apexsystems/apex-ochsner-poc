#!/bin/bash

# stream length in seconds
if [ -z $1 ]; then
   # If not given, set to 2 years, i.e., "no limit".
   stream_length=1051200
else
   stream_length=$1
fi

event_id=$(date '+%m%d-%H%M' --date="now")
start_time=$(date '+%H:%M %b %d' --date="now")

time_left=$stream_length
# Make sure monitor_stream.sh is not running.
m=`ps -u your_login_user | grep monitor_stream | awk '{print \$1}'`
if [ ! -z "$m" ]; then
   kill -9 $m
fi

/path_to_script/monitor_stream.sh $stream_length "$start_time" $event_id $$ &

ntries=1
maxtries=10
while true
do
   # Your ffmpeg command with a time limit added.

   ffmpeg -i rtsp://some.address -vcodec copy -an -t $time_left -f mp4 your_output >> /tmp/stream$event_id.log 2>&1
   
   # If this job ended prematurely, restart for up to maxtries=$maxtries times.
   time_left=$(( $stream_length - ($(date --date="now" +%s) - $(date --date="$start_time" +%s)) ))
   echo Time left: $time_left seconds >> /tmp/stream$event_id.log
   if [ $time_left -le 0 ] || [ $ntries -gt $maxtries ]; then
      exit
   else
      if [ -f /tmp/stop_$event_id ]; then
         echo Stopping event $event_id  >> /tmp/stream$event_id.log
         exit
      fi
      ntries=$(($ntries+1))
   fi
done
