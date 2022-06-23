#!/bin/bash

# This script checks the progress of the ffmpeg every 25 seconds. It kills the ffmpeg process
# if it is detected to be frozen.

stream_length=$1
at_start_time=$2
stream_id=$3
ppid=$4

# Wait for ffmpeg to produce some frames to generate statistics.
sleep 30s

time_left=$(( $stream_length - ($(date --date="now" +%s) - $(date --date="$at_start_time" +%s)) ))

# Number of Kbytes sent in a 2-second interval. This has to be fine-tuned to the complexity, quality and
# resolution of the video being produced.
cutoff=450
    
while [ $time_left -gt 0 ]
do

    # Check for override of the default cutoff.
    if [ -f /tmp/bitrate_cutoff ]; then
        cutoff=`cat /tmp/bitrate_cutoff`
    fi
    
    # Trigger a restart if the last three frame numbers are unchanged or the number of Kbytes sent is below a given threshold (cutoff).
    # The number of Kbytes sent in a 2-second interval must be > cutoff. 

    frozen=`sed 's/\r/\n/g' /tmp/stream$stream_id.log |  grep "frame=" | tail -6 | awk -v cutoff="$cutoff" 'BEGIN{f1=-1; ndup=0;}/frame=/{gsub("="," ",$0); split($0,f); f2 = f[2]; if (f1 == f2) ndup++; else f1 = f2; if (ndup > 1) print f2; f8[NR] = substr(f[8],1,length(f[8])-2); if (NR == 6) { if (f[10] > "00:00:10.00" && (f8[5] - f8[1]) < cutoff && (f8[6] - f8[2]) < cutoff) print "frozen_camera"}}'`
    
    #if [ "$t1" = "$t2" ] || [ "$s" = "frozen" ]
    if [ ! -z "$frozen" ]
    then
        /path_to_script/stop_ffmpeg.sh $ppid
        date >> /tmp/monitor_stream.log
        echo "Stream $stream_id restarted." >> /tmp/monitor_stream.log
    fi
    sleep 25s
    time_left=$(( $stream_length - ($(date --date="now" +%s) - $(date --date="$at_start_time" +%s)) ))
    
    # Exit if the main shell has exited.
    tt=`ps -u your_login_user | grep $ppid`
    if [ -z "$tt" ]; then
        exit
    fi
done
