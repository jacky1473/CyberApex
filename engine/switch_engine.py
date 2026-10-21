"""
CyberApex Cisco Packet Tracer Style Switch & Network Engine
Simulates Cisco IOS-XE Catalyst 9300-48U Enterprise Core Switch
Fully interactive with port statistics, VLANs, MAC table, CLI commands, and real sandbox link control.
"""

import time
import random
import re
import subprocess

class CiscoSwitchEngine:
    def __init__(self, office_state, incident_engine=None):
        self.office = office_state
        self.incident = incident_engine
        self.hostname = "CyberApex-SW01"
        self.model = "Cisco Catalyst 9300-48UXM 10G Multi-Gigabit"
        self.ios_version = "17.09.03a (Amsterdam)"
        self.system_mac = "00:0c:29:bd:32:80"
        self.start_time = time.time() - 3600 * 24 * 42 # 42 days uptime

        # CLI state machine
        self.cli_mode = "privileged" # "privileged", "config", "config-if"
        self.current_interface = None # e.g. 1..16

        # VLAN Database
        self.vlans = {
            1: "default",
            10: "MANAGEMENT_DECK",
            20: "NOC_INFRASTRUCTURE",
            30: "BACKEND_DATABASES",
            40: "FRONTEND_UI_STUDIO",
            50: "DEVOPS_WAR_ROOM",
            60: "QA_SECURITY_LAB",
            100: "CORE_GATEWAY_TRUNK"
        }

        # Port mapping for 15 Specialist Bots + 1 Uplink
        self.port_vlans = {
            1: 10, 2: 10,
            3: 20, 4: 20,
            5: 30, 6: 30, 7: 30,
            8: 40, 9: 40,
            10: 50, 11: 50, 12: 50,
            13: 60, 14: 60, 15: 60,
            16: 100
        }

        # Dynamic port counters
        self.port_stats = {}
        for p in range(1, 17):
            self.port_stats[p] = {
                "rx_pkts": random.randint(45000, 180000),
                "tx_pkts": random.randint(52000, 210000),
                "rx_bytes": random.randint(15000000, 85000000),
                "tx_bytes": random.randint(22000000, 115000000),
                "crc_errors": 0,
                "admin_down": False
            }

    def set_port_link(self, port_num, is_up):
        """Applies real link state change to sandbox interface and incident tickets"""
        if 1 <= port_num <= 15:
            self.port_stats[port_num]["admin_down"] = not is_up
            emp_id = f"EMP-{port_num:03d}"
            emp = self.office.get(emp_id)
            if emp:
                emp["lan_connected"] = is_up
                ip = emp.get("ip")
                if is_up:
                    subprocess.run(f"sudo -n ip netns exec office-sandbox ip addr add {ip}/24 dev eth-office 2>/dev/null || true", shell=True)
                    emp["status"] = "working"
                    if self.incident:
                        self.incident.resolve_lan_disconnect_ticket(emp_id)
                else:
                    subprocess.run(f"sudo -n ip netns exec office-sandbox ip addr del {ip}/24 dev eth-office 2>/dev/null || true", shell=True)
                    emp["status"] = "blocked"
                    if self.incident:
                        self.incident.trigger_lan_disconnect_ticket(emp_id)
            return True
        return False

    def get_switch_data(self):
        """Returns structured JSON for UI Port Matrix and telemetry"""
        ports = []
        employees = self.office.get_all()

        for p in range(1, 16):
            emp = employees[p - 1] if p - 1 < len(employees) else None
            is_connected = emp.get("lan_connected", True) if emp else False
            admin_down = self.port_stats[p]["admin_down"]

            # Operational status
            if admin_down:
                oper_status = "administratively down"
                line_proto = "down"
            elif is_connected:
                oper_status = "up"
                line_proto = "up"
            else:
                oper_status = "down"
                line_proto = "down"

            # Increment simulated packets
            self.port_stats[p]["rx_pkts"] += random.randint(2, 12)
            self.port_stats[p]["tx_pkts"] += random.randint(3, 16)

            ports.append({
                "port_id": f"Gi1/0/{p}",
                "port_num": p,
                "name": f"GigabitEthernet1/0/{p}",
                "emp_id": emp["id"] if emp else "N/A",
                "emp_name": emp["name"] if emp else "Unassigned",
                "ip": emp["ip"] if emp else "0.0.0.0",
                "mac": f"52:54:00:18:10:{p:02x}",
                "vlan": self.port_vlans.get(p, 1),
                "vlan_name": self.vlans.get(self.port_vlans.get(p, 1), "default"),
                "admin_status": "down" if admin_down else "up",
                "status": oper_status,
                "protocol": line_proto,
                "speed": "1000",
                "duplex": "a-full",
                "type": "1000BaseTX",
                "rx_packets": self.port_stats[p]["rx_pkts"],
                "tx_packets": self.port_stats[p]["tx_pkts"]
            })

        # SFP+ 10G Core Uplink Port 16
        ports.append({
            "port_id": "Te1/1/1",
            "port_num": 16,
            "name": "TenGigabitEthernet1/1/1",
            "emp_id": "GATEWAY",
            "emp_name": "Core Default Gateway (192.168.18.2)",
            "ip": "192.168.18.254",
            "mac": "00:0c:29:bd:32:80",
            "vlan": 100,
            "vlan_name": "CORE_GATEWAY_TRUNK",
            "admin_status": "up",
            "status": "up",
            "protocol": "up",
            "speed": "10000",
            "duplex": "full",
            "type": "10GBase-SR",
            "rx_packets": self.port_stats[16]["rx_pkts"] + 1500,
            "tx_packets": self.port_stats[16]["tx_pkts"] + 2400
        })

        uptime_secs = int(time.time() - self.start_time)
        days = uptime_secs // 86400
        hours = (uptime_secs % 86400) // 3600
        mins = (uptime_secs % 3600) // 60

        return {
            "hostname": self.hostname,
            "model": self.model,
            "ios_version": self.ios_version,
            "system_mac": self.system_mac,
            "uptime_str": f"{days} days, {hours} hours, {mins} minutes",
            "total_ports": 16,
            "active_ports": len([p for p in ports if p["status"] == "up"]),
            "ports": ports,
            "vlans": self.vlans
        }

    def _get_prompt(self):
        if self.cli_mode == "config-if" and self.current_interface:
            return f"{self.hostname}(config-if)#"
        elif self.cli_mode == "config":
            return f"{self.hostname}(config)#"
        return f"{self.hostname}#"

    def execute_cisco_cli(self, command_str):
        """Processes real Cisco IOS command strings and returns formatted CLI output"""
        cmd = command_str.strip()
        cmd_lower = cmd.lower()

        if not cmd:
            return self._get_prompt()

        tokens = cmd_lower.split()

        # Handle 'do' prefix in config mode
        if tokens[0] == "do":
            tokens = tokens[1:]
            cmd_lower = " ".join(tokens)

        if cmd_lower in ("enable", "en"):
            self.cli_mode = "privileged"
            return self._get_prompt()

        if cmd_lower in ("configure terminal", "conf t", "config t", "conf term"):
            self.cli_mode = "config"
            return f"Enter configuration commands, one per line.  End with CNTL/Z or 'end'.\n{self._get_prompt()}"

        if cmd_lower in ("exit", "quit"):
            if self.cli_mode == "config-if":
                self.cli_mode = "config"
                self.current_interface = None
                return self._get_prompt()
            elif self.cli_mode == "config":
                self.cli_mode = "privileged"
                return self._get_prompt()
            return f"{self.hostname}#"

        if cmd_lower in ("end", "end"):
            self.cli_mode = "privileged"
            self.current_interface = None
            return f"{self.hostname}#"

        if cmd_lower in ("help", "?"):
            return (
                "Exec & Configuration commands:\n"
                "  show ip interface brief    Display brief summary of IP status\n"
                "  show mac address-table     Display the dynamic MAC address table\n"
                "  show vlan brief            Display brief summary of VLANs\n"
                "  show interfaces status     Display interface status, speed and duplex\n"
                "  show version               Display switch hardware and software version\n"
                "  show running-config        Display current active configuration\n"
                "  ping <ip-address>          Send ICMP echo messages to target IP\n"
                "  traceroute <ip-address>    Trace path to destination IP\n"
                "  interface <port-id>        Enter interface configuration (e.g. int gi1/0/3)\n"
                "  shutdown / no shutdown     Disable/Enable target interface\n"
                "  clear                      Clear terminal console"
            )

        # Parse interface selection (e.g. interface gi1/0/3 or int gi1/0/5 or int 5)
        if tokens[0] in ("interface", "int"):
            target_str = " ".join(tokens[1:])
            m = re.search(r"(?:(?:gi|gigabitethernet)?1/0/)?(\d+)", target_str)
            if m:
                port_num = int(m.group(1))
                if 1 <= port_num <= 16:
                    self.cli_mode = "config-if"
                    self.current_interface = port_num
                    return f"{self.hostname}(config-if)#"
            return "% Invalid interface. Valid ports are Gi1/0/1 through Gi1/0/15 and Te1/1/1."

        # Parse shutdown commands
        if tokens[0] in ("shutdown", "shut"):
            target_port = self.current_interface
            if len(tokens) > 1:
                m = re.search(r"(?:1/0/)?(\d+)", tokens[1])
                if m: target_port = int(m.group(1))

            if target_port and 1 <= target_port <= 15:
                self.set_port_link(target_port, False)
                pname = f"GigabitEthernet1/0/{target_port}"
                return (
                    f"%LINK-5-CHANGED: Interface {pname}, changed state to administratively down\n"
                    f"%LINEPROTO-5-UPDOWN: Line protocol on Interface {pname}, changed state to down\n"
                    f"{self._get_prompt()}"
                )
            elif target_port == 16:
                return "% Error: Core 10G Gateway Trunk (Te1/1/1) cannot be administratively shutdown."
            else:
                return "% Error: No interface selected. Use 'interface gi1/0/<num>' first or 'shutdown <num>'."

        # Parse no shutdown commands
        if tokens[0] == "no" and len(tokens) > 1 and tokens[1] in ("shutdown", "shut"):
            target_port = self.current_interface
            if len(tokens) > 2:
                m = re.search(r"(?:1/0/)?(\d+)", tokens[2])
                if m: target_port = int(m.group(1))

            if target_port and 1 <= target_port <= 15:
                self.set_port_link(target_port, True)
                pname = f"GigabitEthernet1/0/{target_port}"
                return (
                    f"%LINK-3-UPDOWN: Interface {pname}, changed state to up\n"
                    f"%LINEPROTO-3-UPDOWN: Line protocol on Interface {pname}, changed state to up\n"
                    f"{self._get_prompt()}"
                )
            elif target_port == 16:
                return f"{self._get_prompt()}"
            else:
                return "% Error: No interface selected. Use 'interface gi1/0/<num>' first or 'no shutdown <num>'."

        # Check SHOW commands flexibly
        if tokens[0] in ("show", "sh", "sho"):
            sub = " ".join(tokens[1:])
            # show ip interface brief
            if "ip" in sub and ("int" in sub or "interface" in sub):
                data = self.get_switch_data()
                lines = [
                    f"{self.hostname}# show ip interface brief",
                    "Interface                  IP-Address      OK? Method Status                Protocol",
                ]
                for p in data["ports"]:
                    pname = p["name"].ljust(26)
                    pip = p["ip"].ljust(15)
                    pstat = p["status"].ljust(21)
                    lines.append(f"{pname} {pip} YES manual {pstat} {p['protocol']}")
                lines.append("Vlan1                      unassigned      YES unset  administratively down down    ")
                return "\n".join(lines)

            # show interfaces status
            if ("int" in sub or "interface" in sub) and ("stat" in sub):
                data = self.get_switch_data()
                lines = [
                    f"{self.hostname}# show interfaces status",
                    "Port      Name               Status       Vlan       Duplex  Speed Type",
                    "--------- ------------------ ------------ ---------- ------- ----- ------------"
                ]
                for p in data["ports"]:
                    p_id = p["port_id"].ljust(9)
                    p_desc = p["emp_name"][:18].ljust(18)
                    p_stat = ("connected" if p["status"] == "up" else "notconnect").ljust(12)
                    p_vlan = str(p["vlan"]).ljust(10)
                    p_duplex = p["duplex"].ljust(7)
                    p_speed = (p["speed"] if p["status"] == "up" else "auto").ljust(5)
                    p_type = p["type"]
                    lines.append(f"{p_id} {p_desc} {p_stat} {p_vlan} {p_duplex} {p_speed} {p_type}")
                return "\n".join(lines)

            # show mac address-table
            if "mac" in sub:
                data = self.get_switch_data()
                lines = [
                    f"{self.hostname}# show mac address-table",
                    "          Mac Address Table",
                    "-------------------------------------------",
                    "Vlan    Mac Address       Type        Ports",
                    "----    -----------       --------    -----"
                ]
                for p in data["ports"]:
                    if p["status"] == "up":
                        vlan_str = str(p["vlan"]).rjust(4)
                        lines.append(f"{vlan_str}    {p['mac']} DYNAMIC     {p['port_id']}")
                lines.append(f"Total Mac Addresses for this criterion: {len([p for p in data['ports'] if p['status'] == 'up'])}")
                return "\n".join(lines)

            # show vlan brief
            if "vlan" in sub:
                lines = [
                    f"{self.hostname}# show vlan brief",
                    "VLAN Name                             Status    Ports",
                    "---- -------------------------------- --------- -------------------------------",
                    "1    default                          active    ",
                    "10   MANAGEMENT_DECK                  active    Gi1/0/1, Gi1/0/2",
                    "20   NOC_INFRASTRUCTURE               active    Gi1/0/3, Gi1/0/4",
                    "30   BACKEND_DATABASES                active    Gi1/0/5, Gi1/0/6, Gi1/0/7",
                    "40   FRONTEND_UI_STUDIO               active    Gi1/0/8, Gi1/0/9",
                    "50   DEVOPS_WAR_ROOM                  active    Gi1/0/10, Gi1/0/11, Gi1/0/12",
                    "60   QA_SECURITY_LAB                  active    Gi1/0/13, Gi1/0/14, Gi1/0/15",
                    "100  CORE_GATEWAY_TRUNK               active    Te1/1/1"
                ]
                return "\n".join(lines)

            # show version
            if "ver" in sub:
                data = self.get_switch_data()
                return (
                    f"{self.hostname}# show version\n"
                    f"Cisco IOS XE Software, Version {self.ios_version}\n"
                    "Cisco IOS Software [Amsterdam], Catalyst L3 Switch Software\n"
                    f"{self.model} with 8388608K/2097152K bytes of memory.\n"
                    "Processor board ID FJC2439A10X (Farman Enterprise Core)\n"
                    "48 Gigabit Ethernet interfaces\n"
                    "4 Ten Gigabit Ethernet interfaces\n"
                    f"Base Ethernet MAC Address: {self.system_mac}\n"
                    f"System uptime is {data['uptime_str']}\n"
                    "Configuration register is 0x102"
                )

            # show running-config
            if "run" in sub:
                lines = [
                    f"{self.hostname}# show running-config",
                    "Building configuration...",
                    "Current configuration : 3840 bytes",
                    "!",
                    f"hostname {self.hostname}",
                    "ip routing",
                    "!",
                    "vtp mode transparent",
                    "!"
                ]
                for p in range(1, 16):
                    vlan = self.port_vlans.get(p, 1)
                    is_admin_down = self.port_stats[p]["admin_down"]
                    lines.extend([
                        f"interface GigabitEthernet1/0/{p}",
                        f" description Connected to EMP-{p:03d}",
                        f" switchport access vlan {vlan}",
                        " switchport mode access",
                        " spanning-tree portfast"
                    ])
                    if is_admin_down:
                        lines.append(" shutdown")
                    lines.append("!")
                lines.extend([
                    "interface TenGigabitEthernet1/1/1",
                    " description 10G Core Uplink to Gateway",
                    " switchport mode trunk",
                    "!",
                    "end"
                ])
                return "\n".join(lines)

        # ping
        if tokens[0] == "ping":
            target_ip = tokens[1] if len(tokens) > 1 else "192.168.18.2"
            return (
                f"{self.hostname}# ping {target_ip}\n"
                f"Type escape sequence to abort.\n"
                f"Sending 5, 100-byte ICMP Echos to {target_ip}, timeout is 2 seconds:\n"
                "!!!!!\n"
                "Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/3 ms"
            )

        # traceroute
        if tokens[0] in ("traceroute", "trace"):
            target_ip = tokens[1] if len(tokens) > 1 else "192.168.18.2"
            return (
                f"{self.hostname}# traceroute {target_ip}\n"
                f"Tracing the route to {target_ip}...\n"
                f"  1  192.168.18.254 (Te1/1/1 Core Trunk) 0.821 msec 0.654 msec 0.512 msec\n"
                f"  2  {target_ip} 1.102 msec 1.054 msec 0.988 msec"
            )

        return f"% Invalid input detected at '^' marker.\n{self._get_prompt()} {cmd}"
