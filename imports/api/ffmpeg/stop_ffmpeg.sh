#!/bin/bash

ppid=$1

# The ffmpeg was launched by a timeout command by the parent process.
pid_timeout=`ps -u your_login_user -l | grep timeout | awk -v ppid=$ppid '{if ($5 == ppid) print $4}'`
pid=`ps -u your_login_user -l | grep ffmpeg | awk -v ppid=$pid_timeout '{if ($5 == ppid) print $4}'`

if [ -n "$pid" ] ; then
   echo Stopping $pid
   
   kill $pid
else
   echo "No ffmpeg running."
fi
