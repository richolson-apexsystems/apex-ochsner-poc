#!/bin/sh

sleep 10
while true
do
    frameA=$(tail $( dirname -- "$( readlink -f -- "$0"; )"; )/ffmpeg.log -n 1 | sed -nr 's/.*frame=(.*)fps.*/\1/p')
    echo "$frameA"
    sleep 5
    frameB=$(tail $( dirname -- "$( readlink -f -- "$0"; )"; )/ffmpeg.log -n 1 | sed -nr 's/.*frame=(.*)fps.*/\1/p')
    echo "$frameB"

    if [ "$frameA" = "$frameB" ]
    then
        echo "Stream has hung"
	printf "%s - Stream has hung\n" "$(date)" >> stream.log
        pkill ffmpeg
        echo "killed ffmpeg..."
	printf "%s - Killed ffmpeg...\n" "$(date)" >> stream.log
        echo "Waiting 5 secs"
        sleep 5
        bash $( dirname -- "$( readlink -f -- "$0"; )"; )/startffmpeg.sh &
        echo "started ffpmeg.."
	printf "%s - Started ffmpeg..\n" "$(date)" >> stream.log
        echo "Waiting 15 secs"
        sleep 15
    else 
        echo "Stream looks ok."
    fi

    sleep 2
done