#!/bin/bash

if [[ $# -ge 1 ]]
then
    files=$@
else
    files=$(zenity --file-selection --multiple --separator=' ' 2>/dev/null)
    if [[ -z $files ]]
    then
        echo "No file selected. Exiting."
        exit 1
    fi
fi

files_to_delete=""
form=""

for file in $files
do
    # Read STDIN if dash argument.
    if [ $file = "-" ]
    then
        file_path="/tmp/file$RANDOM"
        cat > $file_path
        files_to_delete="$files_to_delete $file_path"
        form="$form -F files=@$file_path"
    else
        if [ -f $file -a -r $file ]
        then
            form="$form -F files=@$file"
        else
            echo "Cannot upload '$file'. Skipping."
        fi
    fi
done

if [[ -z $form ]]
then
    echo "No file to upload. Exiting."
    exit 1
fi

curl -sL $form -F "short=1" https://file.scotow.com
echo

if [ -n "$files_to_delete" ]
then
    rm -f $files_to_delete
fi
