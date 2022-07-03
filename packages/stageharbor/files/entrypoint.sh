#!/bin/bash
echo "Setting up proxy..."
bash update-dns.sh
echo "Applying proxy settings to the container..."
dnsmasq
echo "Preparing racerx"
containerIP=$(awk 'END{print $1}' /etc/hosts)
racerxScript="bash racerx.sh $@ -d $containerIP"
eval $racerxScript
