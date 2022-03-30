#!/bin/bash

# This script:
# * retrieves the ip address for the raceproxy
# * updates the dnsmasq config with that information
# * updates the /etc/resolv.conf with localhost, thus making it such that this system is its own dns server
echo "Updating ip address in order to treat local dnsmasq as our dns resolver and route all calls to raceproxy"
# the next line after the 'Answer Section' contains the first match of the domain and its ip
ip=$(dig raceproxy | awk '/ANSWER SECTION/ {getline;print $5;}')

echo "The ip in question is $ip"

echo "#Listen to localhost
listen-address=::1,127.0.0.1

#Resolve all dns calls to raceproxy
address=/#/$ip" >> /etc/dnsmasq.conf

echo "dnsmasq config updated. Replacing /etc/resolv.conf"
# resolv.conf is actively used by a special mount created by the Docker environment. We cannot cp or rm the file, but we can
# replace all the text inside
echo "nameserver 127.0.0.1
options ndots:0" > /etc/resolv.conf 
