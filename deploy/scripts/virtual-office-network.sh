#!/bin/bash
# CyberApex Virtual Office - Dedicated Sandbox Network Namespace
# Ensures 100% isolation so host physical interface (ens160) and host DNS (/etc/resolv.conf) are NEVER polluted or modified.
set -e

# 1. Clean up any leftover secondary IPs from physical host interface ens160
for i in $(seq 101 115); do
    ip addr del 192.168.18.$i/24 dev ens160 2>/dev/null || true
done

# 2. Ensure dedicated network namespace exists
if ! ip netns list | grep -q "office-sandbox"; then
    ip netns add office-sandbox
fi

# 3. Ensure loopback is UP inside sandbox namespace
ip netns exec office-sandbox ip link set lo up

# 4. Create and attach isolated virtual interface 'eth-office' inside sandbox namespace
if ! ip netns exec office-sandbox ip link show eth-office 2>/dev/null; then
    # Clean up from root namespace if already exists
    ip link del eth-office 2>/dev/null || true
    ip link add eth-office type dummy
    ip link set eth-office netns office-sandbox
fi

ip netns exec office-sandbox ip link set eth-office up

# 5. Bind all 15 Specialist Bot IPs inside the isolated namespace ONLY
for i in $(seq 101 115); do
    ip netns exec office-sandbox ip addr add 192.168.18.$i/24 dev eth-office 2>/dev/null || true
done

# 6. Ensure isolated sandbox DNS configuration exists
mkdir -p /etc/netns/office-sandbox
cat << 'EOF' > /etc/netns/office-sandbox/resolv.conf
# CyberApex Virtual Office Sandbox Isolated DNS Resolver
# Modifying this file DOES NOT affect the physical server / ens160 host DNS!
nameserver 192.168.18.2
nameserver 8.8.8.8
search corp.local
EOF

mkdir -p /tmp/office_sandbox/etc
cp -f /etc/netns/office-sandbox/resolv.conf /tmp/office_sandbox/etc/resolv.conf

echo "[CyberApex Virtual Office] Sandbox Network Namespace 'office-sandbox' configured with eth-office (15 IPs bound). Host ens160 is clean & protected."
