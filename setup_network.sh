#!/bin/bash
# CyberApex Virtual Office - Bind all 15 Specialist Bot IPs to ens160
for i in $(seq 101 115); do
    ip addr add 192.168.18.$i/24 dev ens160 2>/dev/null || true
done
