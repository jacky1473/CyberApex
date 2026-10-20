"""
Hands-On Real Linux Incident & Gamification Engine:
Creates REAL system incidents on the Rocky Linux host, tests real OS state,
awards XP, levels up the player's SysAdmin Rank, and teaches production Linux administration.
"""

import os
import time
import socket
import random
import subprocess

REAL_CHALLENGES = [
    {
        "type": "DISK_BLOAT",
        "title": "Disk Quota Alert: Unrotated Audit Log Bloat in /var/log/virtual_office",
        "severity": "CRITICAL",
        "emp_id": "EMP-006",
        "workstation_path": "/var/log/virtual_office",
        "target_file": "/var/log/virtual_office/app_debug_bloat.log",
        "error_log": "[FATAL] OSError: [Errno 28] No space left on device: '/var/log/virtual_office/app_debug_bloat.log'\nWorker process terminated due to write failure on disk partition.",
        "hint": "Inspect file sizes with 'du -sh /var/log/virtual_office/*' or find large files. Clear it with 'truncate -s 0 /var/log/virtual_office/app_debug_bloat.log'.",
        "solution_cmd": "truncate -s 0 /var/log/virtual_office/app_debug_bloat.log",
        "knowledge_pill": {
            "title": "Why 'truncate' is Better than 'rm' for Live Log Files",
            "explanation": "If a running process has a log file open, running 'rm' will delete the directory entry, but the Linux kernel keeps writing to the open inode until the process restarts! Disk space won't be freed! 'truncate -s 0' instantly frees the disk blocks without breaking the running process's open file descriptor.",
            "pro_commands": [
                "du -sh /var/log/virtual_office/*",
                "find /var/log -type f -size +50M -exec ls -lh {} \\;",
                "truncate -s 0 /var/log/virtual_office/app_debug_bloat.log"
            ]
        }
    },
    {
        "type": "ROGUE_PORT",
        "title": "Port Collision: Zombie Rogue Process Blocking TCP Port 8888",
        "severity": "HIGH",
        "emp_id": "EMP-007",
        "workstation_path": "/opt/virtual-office/sandbox",
        "target_file": "/opt/virtual-office/sandbox/rogue_worker.py",
        "error_log": "[CRITICAL] socket.error: [Errno 98] Address already in use: ('0.0.0.0', 8888)\nAPI Microservice failed to bind socket port 8888.",
        "hint": "Identify listening PID using 'ss -tlpn | grep 8888' or kill the rogue process using 'fuser -k 8888/tcp' or 'pkill -f rogue_worker'.",
        "solution_cmd": "fuser -k 8888/tcp",
        "knowledge_pill": {
            "title": "Hunting Zombie Port Collisions in Production",
            "explanation": "When web workers or microservices crash or restart uncleanly, orphaned child processes often keep listening on the port. Sysadmins use 'ss -tlpn' or 'lsof -i :port' to identify the process name and PID, then gracefully terminate it with SIGTERM or SIGKILL.",
            "pro_commands": [
                "ss -tlpn | grep 8888",
                "fuser -v 8888/tcp",
                "fuser -k 8888/tcp",
                "pkill -f rogue_worker"
            ]
        }
    },
    {
        "type": "PERMISSION_SOCKET",
        "title": "Permission Denied: Unix Socket Permissions Zeroed Out (000)",
        "severity": "HIGH",
        "emp_id": "EMP-009",
        "workstation_path": "/tmp/office_sandbox",
        "target_file": "/tmp/office_sandbox/production_app.sock",
        "error_log": "[ERROR] PermissionError: [Errno 13] Permission denied: '/tmp/office_sandbox/production_app.sock'\nWeb frontend unable to connect to backend IPC socket.",
        "hint": "Inspect file mode using 'ls -la /tmp/office_sandbox/production_app.sock'. Grant read/write permissions using 'chmod 775 /tmp/office_sandbox/production_app.sock'.",
        "solution_cmd": "chmod 775 /tmp/office_sandbox/production_app.sock",
        "knowledge_pill": {
            "title": "Unix File Permissions & Umask Principles",
            "explanation": "Every Linux file has 3 permission octets: Owner, Group, Others (r=4, w=2, x=1). Sockets require read/write access for both connecting users. Mode 000 completely locks out all non-root users. Mode 775 allows owner and group members full access.",
            "pro_commands": [
                "ls -l /tmp/office_sandbox/production_app.sock",
                "stat -c '%a %n' /tmp/office_sandbox/production_app.sock",
                "chmod 775 /tmp/office_sandbox/production_app.sock"
            ]
        }
    },
    {
        "type": "SYSTEMD_SERVICE",
        "title": "Service Failure: MariaDB Practice Unit (office-db.service) Dead",
        "severity": "CRITICAL",
        "emp_id": "EMP-011",
        "workstation_path": "/etc/systemd/system",
        "target_file": "office-db.service",
        "error_log": "[CRITICAL] Database connection refused. Systemd unit office-db.service is in failed / inactive state.",
        "hint": "Check service status with 'systemctl status office-db' and start it using 'systemctl start office-db' or 'systemctl restart office-db'.",
        "solution_cmd": "systemctl start office-db",
        "knowledge_pill": {
            "title": "Mastering Systemd Service Supervision",
            "explanation": "Systemd manages background daemons across Linux. When a critical database or API service stops, sysadmins use 'systemctl is-active' for automated health checks, 'journalctl -xeu <service>' to read crash stacktraces, and 'systemctl restart' to reload the daemon.",
            "pro_commands": [
                "systemctl status office-db",
                "journalctl -u office-db -n 25 --no-pager",
                "systemctl start office-db"
            ]
        }
    },
    {
        "type": "SSH_KEY_PERMISSIONS",
        "title": "Security Vulnerability: Deployment Key Permissions Too Open (0664)",
        "severity": "MEDIUM",
        "emp_id": "EMP-012",
        "workstation_path": "/tmp/office_sandbox",
        "target_file": "/tmp/office_sandbox/deploy_key.pem",
        "error_log": "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n@ WARNING: UNPROTECTED PRIVATE KEY FILE! @\nPermissions 0664 for '/tmp/office_sandbox/deploy_key.pem' are too open.\nIt is required that your private key files are NOT accessible by others.\nThis private key will be ignored. Load key failed: bad permissions.",
        "hint": "Tighten SSH key permissions using 'chmod 600 /tmp/office_sandbox/deploy_key.pem'.",
        "solution_cmd": "chmod 600 /tmp/office_sandbox/deploy_key.pem",
        "knowledge_pill": {
            "title": "OpenSSH Key Permission Hardening (Why 600 is Mandatory)",
            "explanation": "OpenSSH refuses to load private keys that have group or world read/write permissions (e.g. 644 or 664) because other system users could steal the cryptographic credential. Running 'chmod 600' ensures only the file owner can read or write the key.",
            "pro_commands": [
                "ls -l /tmp/office_sandbox/deploy_key.pem",
                "chmod 600 /tmp/office_sandbox/deploy_key.pem",
                "ssh -i /tmp/office_sandbox/deploy_key.pem user@host -o StrictHostKeyChecking=no"
            ]
        }
    }
]

RANKS = [
    {"level": 1, "title": "Junior SysAdmin", "min_xp": 0, "max_xp": 300, "badge": "🔰"},
    {"level": 2, "title": "Systems Engineer", "min_xp": 300, "max_xp": 700, "badge": "⚡"},
    {"level": 3, "title": "Senior SRE & DevOps Lead", "min_xp": 700, "max_xp": 1200, "badge": "🚀"},
    {"level": 4, "title": "Chief Linux Architect", "min_xp": 1200, "max_xp": 99999, "badge": "👑"}
]

class IncidentEngine:
    def __init__(self, office_state, chat_engine):
        self.office = office_state
        self.chat = chat_engine
        self.tickets = []
        self.ticket_counter = 101
        self.resolved_count = 0
        self.last_incident_time = time.time()

        # Gamification State
        self.player_stats = {
            "name": "Farman",
            "xp": 150,
            "level": 1,
            "rank": "Junior SysAdmin",
            "badge": "🔰",
            "coins": 200,
            "unlocked_perks": []
        }

    def _setup_real_os_incident(self, challenge):
        """Actually creates the real problem on the Linux OS!"""
        c_type = challenge["type"]
        try:
            if c_type == "DISK_BLOAT":
                # Create directory and a 50MB dummy file
                os.makedirs("/var/log/virtual_office", exist_ok=True)
                with open("/var/log/virtual_office/app_debug_bloat.log", "wb") as f:
                    f.write(b"AUDIT_DEBUG_DATA_BLOCK_" * 2000000) # ~50 MB bloat file
            elif c_type == "ROGUE_PORT":
                # Ensure rogue worker script is running on port 8888
                os.makedirs("/opt/virtual-office/sandbox", exist_ok=True)
                subprocess.run("pkill -f rogue_worker", shell=True)
                subprocess.Popen(["/bin/python3", "/opt/virtual-office/sandbox/rogue_worker.py"])
                time.sleep(0.5)
            elif c_type == "PERMISSION_SOCKET":
                os.makedirs("/tmp/office_sandbox", exist_ok=True)
                sock_file = "/tmp/office_sandbox/production_app.sock"
                with open(sock_file, "w") as f:
                    f.write("UNIX_SOCKET_DESCRIPTOR")
                os.chmod(sock_file, 0o000) # Lock it down completely!
            elif c_type == "SYSTEMD_SERVICE":
                # Stop practice service
                subprocess.run("systemctl stop office-db", shell=True)
            elif c_type == "SSH_KEY_PERMISSIONS":
                os.makedirs("/tmp/office_sandbox", exist_ok=True)
                pem_file = "/tmp/office_sandbox/deploy_key.pem"
                with open(pem_file, "w") as f:
                    f.write("-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA=\n-----END OPENSSH PRIVATE KEY-----")
                os.chmod(pem_file, 0o664) # Deliberately too open!
        except Exception as e:
            print(f"[ERROR setting up real incident {c_type}] {e}")

    def check_real_os_fix(self, ticket):
        """Inspects the Rocky Linux OS to see if the user actually fixed the issue!"""
        c_type = ticket["type"]
        try:
            if c_type == "DISK_BLOAT":
                path = "/var/log/virtual_office/app_debug_bloat.log"
                if not os.path.exists(path):
                    return True, "File removed or truncated to 0 bytes! Disk space freed."
                size = os.path.getsize(path)
                if size < 1024 * 1024: # Less than 1MB
                    return True, f"File successfully truncated to {size} bytes! Disk space recovered."
                return False, f"File size is still {round(size/(1024*1024), 1)} MB. Truncate it to free disk space."

            elif c_type == "ROGUE_PORT":
                # Check if port 8888 is free
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                try:
                    s.bind(('127.0.0.1', 8888))
                    s.close()
                    return True, "TCP Port 8888 is now FREE! Rogue worker terminated successfully."
                except Exception:
                    return False, "Port 8888 is still bound by rogue process! Run 'fuser -k 8888/tcp' or 'pkill -f rogue_worker'."

            elif c_type == "PERMISSION_SOCKET":
                path = "/tmp/office_sandbox/production_app.sock"
                if not os.path.exists(path):
                    return True, "Socket file recreated with accessible permissions."
                mode = os.stat(path).st_mode & 0o777
                if mode in (0o775, 0o777, 0o664, 0o666, 0o755):
                    return True, f"Permissions verified! File mode is now {oct(mode)}."
                return False, f"Current permission is {oct(mode)}. Needs 775 or 664 to allow application read/write."

            elif c_type == "SYSTEMD_SERVICE":
                res = subprocess.run("systemctl is-active office-db", shell=True, stdout=subprocess.PIPE)
                status = res.stdout.decode().strip()
                if status == "active":
                    return True, "Systemd unit office-db.service is ACTIVE and running!"
                return False, f"Service is currently '{status}'. Run 'systemctl start office-db'."

            elif c_type == "SSH_KEY_PERMISSIONS":
                path = "/tmp/office_sandbox/deploy_key.pem"
                if not os.path.exists(path):
                    return True, "Key file modified."
                mode = os.stat(path).st_mode & 0o777
                if mode == 0o600 or mode == 0o400:
                    return True, f"Security verified! Permissions locked down to {oct(mode)}."
                return False, f"Permissions are currently {oct(mode)}. Must be set to 600 ('chmod 600 {path}')."

            return True, "Condition verified."
        except Exception as e:
            return False, f"Check error: {str(e)}"

    def trigger_incident(self, specific_type=None, target_emp_id=None):
        template = None
        if specific_type:
            for t in REAL_CHALLENGES:
                if t["type"] == specific_type:
                    template = t
                    break
        if not template:
            template = random.choice(REAL_CHALLENGES)

        # Trigger on real OS
        self._setup_real_os_incident(template)

        emp = self.office.get(template["emp_id"]) or self.office.get("EMP-006")
        ticket_id = f"TICK-{self.ticket_counter}"
        self.ticket_counter += 1

        prev_task = emp["task"]
        self.office.set_status(emp["id"], "blocked", f"⚠️ BLOCKED: {template['title']}")

        ticket = {
            "id": ticket_id,
            "type": template["type"],
            "title": template["title"],
            "severity": template["severity"],
            "error_log": template["error_log"],
            "hint": template["hint"],
            "solution_cmd": template["solution_cmd"],
            "workstation_path": template.get("workstation_path", "/var/log/virtual_office"),
            "target_file": template.get("target_file", ""),
            "knowledge_pill": template.get("knowledge_pill", {}),
            "emp_id": emp["id"],
            "emp_name": emp["name"],
            "emp_role": emp["role"],
            "emp_dept": emp["dept"],
            "emp_ip": emp.get("ip", "192.168.18.106"),
            "emp_hostname": emp.get("hostname", "ws-be.corp.local"),
            "previous_task": prev_task,
            "status": "OPEN",
            "created_at": time.strftime("%H:%M:%S"),
            "resolved_at": None,
            "resolution_notes": None,
            "vdi_active": False,
            "vdi_session": None,
            "remarks": [],
            "xp_reward": 150
        }
        self.tickets.insert(0, ticket)

        self.chat.add_message(
            sender_id=emp["id"],
            sender_name=emp["name"],
            role=emp["role"],
            dept=emp["dept"],
            avatar="🚨",
            text=f"🆘 **INCIDENT ALERT!** Workstation **{emp['hostname']} ({emp['ip']})** is BLOCKED: *{template['title']}*.\nTicket **{ticket_id}** assigned to Chief Linux Admin Farman! Fix in OS terminal!"
        )

        return ticket

    def start_vdi_session(self, ticket_id):
        for t in self.tickets:
            if t["id"] == ticket_id:
                t["vdi_active"] = True
                t["vdi_session"] = {
                    "session_id": f"VDI-{t['emp_id']}-{int(time.time())}",
                    "ip": t["emp_ip"],
                    "hostname": t["emp_hostname"],
                    "os": "Rocky Linux 8.10 Minimal (Real Workstation Sandbox)",
                    "allocated_ram": "64 MB RAM (Allocated On-Demand)",
                    "started_at": time.strftime("%H:%M:%S"),
                    "workstation_path": t.get("workstation_path", "/var/log/virtual_office"),
                    "status": "ONLINE"
                }

                emp = self.office.get(t["emp_id"])
                if emp:
                    emp["vdi_active"] = True

                self.chat.add_message(
                    sender_id="SYS",
                    sender_name="VDI Remote Manager",
                    role="Infrastructure Service",
                    dept="system",
                    avatar="🔌",
                    text=f"🔌 **[VDI Connected]** Admin Farman opened remote session to **{t['emp_name']} ({t['emp_ip']})**. Sandbox active."
                )
                return True, t["vdi_session"]
        return False, None

    def stop_vdi_session(self, ticket_id):
        for t in self.tickets:
            if t["id"] == ticket_id and t.get("vdi_active"):
                t["vdi_active"] = False
                t["vdi_session"] = None

                emp = self.office.get(t["emp_id"])
                if emp:
                    emp["vdi_active"] = False

                self.chat.add_message(
                    sender_id="SYS",
                    sender_name="VDI Remote Manager",
                    role="Infrastructure Service",
                    dept="system",
                    avatar="⏹️",
                    text=f"⏹️ **[VDI Disconnected]** Powered down workstation on **{t['emp_hostname']}**. Host RAM freed."
                )
                return True, "VDI session terminated and host resources freed"
        return False, "VDI was not active"

    def add_admin_remark(self, ticket_id, remark_text, admin_name="Farman (Linux Admin)"):
        for t in self.tickets:
            if t["id"] == ticket_id:
                now_str = time.strftime("%H:%M:%S")
                admin_entry = {
                    "time": now_str,
                    "sender": "admin",
                    "author_name": admin_name,
                    "text": remark_text
                }
                t["remarks"].append(admin_entry)

                emp = self.office.get(t["emp_id"]) or {
                    "name": t["emp_name"],
                    "role": t["emp_role"],
                    "dept": t["emp_dept"]
                }
                bot_reply_text = self._generate_bot_reply(emp, t, remark_text)

                bot_entry = {
                    "time": time.strftime("%H:%M:%S"),
                    "sender": "bot",
                    "author_name": t["emp_name"],
                    "text": bot_reply_text
                }
                t["remarks"].append(bot_entry)

                self.chat.add_message(
                    sender_id="ADMIN",
                    sender_name=admin_name,
                    role="Chief Linux Admin",
                    dept="system",
                    avatar="🛡️",
                    text=f"📝 **[Admin Remark on {t['id']}]:** \"{remark_text}\""
                )
                self.chat.add_message(
                    sender_id=t["emp_id"],
                    sender_name=t["emp_name"],
                    role=t["emp_role"],
                    dept=t["emp_dept"],
                    avatar="💬",
                    text=f"🗣️ **[Reply from {t['emp_name']}]:** \"{bot_reply_text}\""
                )
                return True, admin_entry, bot_entry
        return False, None, None

    def _generate_bot_reply(self, emp, ticket, remark_text):
        remark_lower = remark_text.lower()
        t_type = ticket["type"]

        if any(w in remark_lower for w in ["log", "disk", "truncate", "rm", "du", "df"]) or t_type == "DISK_BLOAT":
            return f"Understood, Admin Farman! I ran truncate -s 0 and added a logrotate policy for /var/log/virtual_office. Thank you for resolving the disk quota!"
        elif any(w in remark_lower for w in ["port", "kill", "fuser", "pkill", "ss", "zombie"]) or t_type == "ROGUE_PORT":
            return f"Received, Admin Farman! Port 8888 is now clear. I added PID tracking to our startup script so orphan workers don't collide. Appreciate it!"
        elif any(w in remark_lower for w in ["permission", "chmod", "chown", "socket"]) or t_type == "PERMISSION_SOCKET":
            return f"Noted, Admin Farman! Verified socket ownership and permissions are 775. IPC communication between frontend and backend is smooth!"
        elif any(w in remark_lower for w in ["systemctl", "service", "start", "restart", "daemon"]) or t_type == "SYSTEMD_SERVICE":
            return f"Acknowledged, Admin Farman! Verified office-db.service is active. Reconnected database connection pool!"
        elif any(w in remark_lower for w in ["ssh", "600", "key", "pem"]) or t_type == "SSH_KEY_PERMISSIONS":
            return f"Fixed, Admin Farman! Permissions locked down to 600. Automated deployment script updated to enforce strict key modes. Thank you!"
        else:
            return f"Thank you for the guidance, Admin Farman! \"{remark_text}\" - Applied this instruction to our workstation environment. Resuming work!"

    def verify_and_resolve_ticket(self, ticket_id, admin_name="Farman (Chief Linux Architect)", force_skip=False):
        """Verifies the actual OS fix, awards XP, and resolves the ticket"""
        for t in self.tickets:
            if t["id"] == ticket_id and t["status"] == "OPEN":
                # Check real OS condition
                if not force_skip:
                    is_fixed, reason = self.check_real_os_fix(t)
                    if not is_fixed:
                        return False, reason, None
                else:
                    reason = "Manual override by Admin"

                # Stop VDI if active
                if t.get("vdi_active"):
                    self.stop_vdi_session(ticket_id)

                t["status"] = "RESOLVED"
                t["resolved_at"] = time.strftime("%H:%M:%S")
                t["resolution_notes"] = reason
                self.resolved_count += 1

                # Award XP and coins
                xp_gain = t.get("xp_reward", 150)
                self.player_stats["xp"] += xp_gain
                self.player_stats["coins"] += 50

                # Check level up
                for r in RANKS:
                    if r["min_xp"] <= self.player_stats["xp"] < r["max_xp"]:
                        self.player_stats["level"] = r["level"]
                        self.player_stats["rank"] = r["title"]
                        self.player_stats["badge"] = r["badge"]

                # Unblock employee
                emp = self.office.get(t["emp_id"])
                if emp:
                    self.office.set_status(t["emp_id"], "working", t["previous_task"])

                self.chat.add_message(
                    sender_id=t["emp_id"],
                    sender_name=t["emp_name"],
                    role=t["emp_role"],
                    dept=t["emp_dept"],
                    avatar="🎉",
                    text=f"🌟 **INCIDENT SOLVED IN LINUX OS!** Thank you {admin_name}! {reason}. Workstation healthy. +{xp_gain} XP awarded to Admin!"
                )

                return True, reason, t
        return False, "Ticket not found", None

    def tick(self, is_project_active):
        if not is_project_active:
            return

        now = time.time()
        open_tickets = [t for t in self.tickets if t["status"] == "OPEN"]
        # Trigger an incident every 45-60 seconds if less than 2 open
        if len(open_tickets) < 2 and (now - self.last_incident_time) > random.randint(45, 65):
            self.trigger_incident()
            self.last_incident_time = now

    def get_open_tickets(self):
        return [t for t in self.tickets if t["status"] == "OPEN"]

    def get_all_tickets(self):
        return self.tickets
