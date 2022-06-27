#!/bin/bash

showHelp() {
    echo "Here we should print how to use stage harbor :)"
}

#Regex Helpers
regexNumbers='^[0-9]+$'
regexPackageName='^[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]+$'
regexActivityName='^[a-zA-Z]+$'

#Variables to run the desired processes
hasFlags=0
startup=0
repeat=1
packagename=
activityname=
apkroute="/mnt/files/debug.apk"

if ! [[ -f $apkroute ]];
then
    echo "Apk not found, can"\'"t race without a car, aborting."
    exit 1
fi

while getopts "s p: a: t:" flag;
do
    case $flag in
    s)  startup=1;;
    p)  if ! [[ $OPTARG =~ $regexPackageName ]];
        then
            echo "-p Must be followed by a valid package name in this format com.company.packagename"
            exit 1
        fi 
        packagename=$OPTARG;;
    a)  if [[ -z $OPTARG ]];
        then
            echo "-a Must be followed by an activity name"
            exit 1
        fi
        activityname=$OPTARG;;
    t)  if ! [[ $OPTARG =~ $regexNumbers ]];
        then
            echo "-t Must be followed by a valid numeric value"
            exit 1
        fi 
        repeat=$OPTARG;;
    ?)  echo "Invalid flag found, race is over"
        exit 1;;
    esac
    hasFlags=1
done

if [[ hasFlags -eq 0 ]];
then
    showHelp
    exit 1
fi

#Check complementary variables for required process before running the emulator
if [[ startup -eq 1 ]] && ( [[ -z $packagename ]] || [[ -z $activityname ]] );
then
    echo "Startup option requires -p and -a parameters to run properly"
    exit 1
fi

echo "Warming up engine (Launching emulator, please wait)..."

#screen -dm emulator -avd testAVD -no-audio -no-boot-anim -no-window -accel on -gpu off
#adb wait-for-device
#adb install -r $apkroute

echo "Shooting star running!"

if [[ $startup -eq 1 ]];
then 
echo "Startup sequence activated..."

fi

exit 0