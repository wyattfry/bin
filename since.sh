#!/usr/bin/env bash

usage() {
  >&2 echo \
"$0 - filter kubernetes events by last seen time

Usage:  kubectl get events | $0 [b] <TIME>
 -b               buffer, e.g. 2m
 TIME             in the format ##m##s, e.g. 10s, 1m, 200m, 5m10s

Pipe the output of kubectl get events to this script then specific your
time parameters and sit back and enjoy. It expects the default events
view with the LAST SEEN column first."
}

while getopts ":b:" OPT; do
  case $OPT in
    b) buffer=$OPTARG ;;
    *)
      >&2 echo "$OPTARG"
      exit 1
      ;;
  esac
done
shift $((OPTIND - 1))

function toSeconds() {
  unparsed=$1
  seconds=$(echo "$unparsed" | grep -Eo '(\d+)s' | grep -Eo '\d+' || echo '0')
  minutes=$(echo "$unparsed" | grep -Eo '(\d+)m' | grep -Eo '\d+' || echo '0')
  echo $((minutes * 60 + seconds))
}

buffer_seconds=$(toSeconds "$buffer")

if [ -p /dev/stdin ]; then
  while IFS= read -r line; do
    if [ "$(echo "$line" | awk '{print $1}')" == 'LAST' ]; then
      echo "$line"
    else
      last_seen=$(echo "$line" | awk '{print $1}')
      last_seen_seconds=$(toSeconds "$last_seen")
      since_seconds=$(toSeconds "$1")
      since_seconds=$(( since_seconds + buffer_seconds ))
      [ "$last_seen_seconds" -lt "$since_seconds" ] && echo "$line"
    fi
  done
else
  >&2 echo "No input was found on stdin, exiting!"
  exit 1
fi
