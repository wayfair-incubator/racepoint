#!/bin/bash
echo "Setting up proxy..."
bash update-dns.sh
echo "Applying proxy settings..."
dnsmasq
echo "Preparing racerx"
bash racerx.sh $@