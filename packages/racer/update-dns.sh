#!/bin/bash

# This script:
# * retrieves the ip address for the raceproxy
# * updates the dnsmasq config with that information
# * updates the /etc/resolv.conf with localhost, thus making it such that this system is its own dns server
echo "Updating ip address in order to treat local dnsmasq as our dns resolver and route all calls to raceproxy"
ip=$(nslookup raceproxy | awk '/Address:/ {split($2,d,":");print d[1]}' | tail -n 1)

echo "The ip in question is $ip"

echo "#Listen to localhost
listen-address=::1,127.0.0.1

#Resolve all dns calls to raceproxy
address=/#/$ip" >> /etc/dnsmasq.conf

echo "dnsmasq config updated. Replacing /etc/resolv.conf"

# rm /etc/resolv.conf
sed '1,2d' /etc/resolv.conf

echo "nameserver 127.0.0.1
options ndots:0" >> /etc/resolv.conf 
