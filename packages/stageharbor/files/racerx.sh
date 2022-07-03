#!/bin/bash

#Racer X Usage, guide to use this script
showHelp() {
    echo
    echo "Usage: $0 [option...] [parameters]" >&2
    echo
    echo "  OPTIONS (At least one must be added):    "
    echo "  -s,    Measure Startup"
    echo
    echo "      Required parameters:    "
    echo "      -p,    Android Package Name (format com.company.packagename)"
    echo "      -a,    Android Activity Name (ex MainActivity)"
    echo
    echo "      Optional parameters"
    echo "      -t,    How many times will the app run (ex. 5)"
    echo "      -c,    Cold boot (Will close the app each run, Warm is default, can"\'"t be used with -h)"
    echo "      -h,    Hot boot (Will close the app each run, Warm is default, can"\'"t be used with -c)"
    echo
    echo " GLOBAL PARAMETERS:   "
    echo "      -o,    Output to a file (found on /sth/results/output.txt)"
    echo "      -g,    Show this guide"
    echo "      -d,    DNS Server ip"
    exit 1
}

#Regex Helpers
regexNumbers='^[0-9]+$'
regexPackageName='^[a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]+.*$'
regexIP='^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'

#Control Variables
hasFlags=0
optionSelected=0
startup=0
output=0
repeat=1
coldBoot=0
hotBoot=0
packageName=
activityName=
apkRoute="/mnt/files/debug.apk"
dnsip=

#Validate if we have an apk loaded, so we can run the tests
if ! [[ -f $apkRoute ]];
then
    echo "Apk not found, can"\'"t race without a car, aborting."
    exit 1
fi

#Retrieve the parameters and options provided by the user
while getopts "s o h g c p: a: t: d:" flag;
do
    case $flag in
    s)  startup=1
        optionSelected=1;;
    p)  if ! [[ $OPTARG =~ $regexPackageName ]];
        then
            echo "-p Must be followed by a valid package name in this format com.company.packagename"
            exit 1
        fi 
        packageName=$OPTARG;;
    a)  if ! [[ $OPTARG =~ $regexPackageName ]];
        then
            echo "-a Must be followed by an activity name in this format com.company.packagename.activityname"
            exit 1
        fi
        activityName=$OPTARG;;
    t)  if ! [[ $OPTARG =~ $regexNumbers ]];
        then
            echo "-t Must be followed by a valid numeric value"
            exit 1
        fi 
        repeat=$OPTARG;;
    o)  output=1;;
    h)  hotBoot=1;;
    g)  showHelp;;
    c)  coldBoot=1;;
    d)  if ! [[ $OPTARG =~ $regexIP ]];
        then
            echo "-d Must be followed by a valid IP Address x.x.x.x"
            exit 1
        fi
        dnsip=$OPTARG;;
    ?)  echo "Invalid flag found, race is over"
        exit 1;;
    esac
    hasFlags=1
done

#We verify that we have at least one option selected, otherwise we show the usage on the screen
if [[ $optionSelected -eq 0 ]];
then
    showHelp
fi

#Startup option validation for required parameters
if [[ $startup -eq 1 ]] && ( [[ -z $packageName ]] || [[ -z $activityName ]] );
then
    echo "Startup option requires -p and -a parameters to run properly"
    exit 1
fi

#Startup option validation for optional parameters
if [[ $startup -eq 1 ]] && ( [[ $coldBoot -eq 1 ]] && [[ $hotBoot -eq 1 ]] );
then
    echo "You must choose only one type of boot, either cold or hot or empty to default to warm)"
    exit 1
fi

#Setup adb server, emulator and installing apk prior to run any command. (We wait until the device is online).
echo "Warming up engine (Launching emulator, please wait)"

adb kill-server &>/dev/null &
screen -dm emulator -avd testAVD -no-audio -no-boot-anim -no-window -accel on -gpu off
sleep 5
adb wait-for-device

if [[ -n $dnsip ]];
then
    proxyconfig="adb shell settings put global http_proxy $dnsip"
    echo "Routing all DNS calls to $dnsip"
    eval $proxyconfig
fi

adb install -r $apkRoute

echo "Shooting star running!"

#If startup is the selected option, we run the startup tasks
if [[ $startup -eq 1 ]];
then 
    echo "Startup sequence activated"   

    #The command is built based on the provided options from the user
    startupSequence="adb shell am start -W -a android.intent.action.VIEW -n $packageName/$activityName"
    
    #This is the first run, will be discarded to let racepoint save data on cache
    discardedStartup=$startupSequence
    discardedStartup+=" -S "
    discardedStartup+=" &>/dev/null &"
    eval $discardedStartup

    if [[ $hotBoot -ne 1 ]];
    then

        if [[ $coldBoot -eq 1 ]];
        then
            startupSequence+=" -S "
        fi

        if [[ $repeat -gt 1 ]];
        then
            startupSequence+=" -R $repeat"
        fi

       
    fi
    
    if [[ $output -eq 1 ]];
    then
        > /sth/results/output.txt
        startupSequence+=" |& tee -a /sth/results/output.txt"
    fi

    #Cold and Warm runs can be triggered by the am command, for the hot start, we need to navigate to the homescreen (automated in the for loop)
    if [[ $hotBoot -ne 1 ]];
    then
        eval $startupSequence
    else
        for i in $(seq 1 $repeat);
        do
            sleep 2
            adb shell input keyevent KEYCODE_HOME
            eval $startupSequence
        done
    fi
fi

exit 0