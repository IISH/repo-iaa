#!/bin/bash

API="http://localhost:3000/vfs"
NA='10622'

while read -r fullfile
do
	filename=$(basename -- "$fullfile")
	filename="${filename%.*}"

	CMD="/usr/bin/curl -X POST --header 'Content-Type: application/json' --data '@${fullfile}' '${API}/${NA}/${filename}'"
	echo "$CMD"
	eval "$CMD"
done <<< "$(find . -type f -name '*.json')"