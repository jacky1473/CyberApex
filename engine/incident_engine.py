"""
Hands-On Real Linux Incident & Gamification Engine:
Creates REAL system incidents on the Rocky Linux host, tests real OS state,
awards XP, levels up the player's SysAdmin Rank, and teaches production Linux administration.
Features 15 unique production Linux incident scenarios and smart anti-repetition rotation.
"""

import os
import time
import socket
import random
import subprocess
import json

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
            "explanation": "If a running process has a log file open, running 'rm' deletes the directory entry, but the Linux kernel keeps writing to the open inode until the process restarts! Disk space won't be freed! 'truncate -s 0' instantly frees the disk blocks without breaking open file descriptors.",
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
            "explanation": "When web workers or microservices restart uncleanly, orphaned child processes often keep listening on the port. Sysadmins use 'ss -tlpn' or 'lsof -i :port' to identify the process name and PID, then gracefully terminate it with SIGTERM or SIGKILL.",
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
        "hint": "Check service status with 'systemctl status office-db' and start it using 'sudo systemctl start office-db' or 'sudo systemctl restart office-db'.",
        "solution_cmd": "sudo systemctl start office-db",
        "knowledge_pill": {
            "title": "Mastering Systemd Service Supervision",
            "explanation": "Systemd manages background daemons across Linux. When a critical database or API service stops, sysadmins use 'systemctl is-active' for automated health checks, 'journalctl -xeu <service>' to read crash stacktraces, and 'systemctl restart' to reload the daemon.",
            "pro_commands": [
                "systemctl status office-db",
                "journalctl -u office-db -n 25 --no-pager",
                "sudo systemctl start office-db"
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
    },
    {
        "type": "STALE_LOCK_FILE",
        "title": "Database Migration Blocked: Stale Lock File (migration.lock) Detected",
        "severity": "HIGH",
        "emp_id": "EMP-008",
        "workstation_path": "/tmp/office_sandbox",
        "target_file": "/tmp/office_sandbox/migration.lock",
        "error_log": "[ERROR] MigrationAborted: Stale lockfile detected: '/tmp/office_sandbox/migration.lock'. Previous runner crashed ungracefully. Aborting schema update to avoid corruption.",
        "hint": "Check the lockfile contents or age with 'cat /tmp/office_sandbox/migration.lock'. Remove the stale lock using 'rm -f /tmp/office_sandbox/migration.lock'.",
        "solution_cmd": "rm -f /tmp/office_sandbox/migration.lock",
        "knowledge_pill": {
            "title": "Managing Stale Lock Files in Enterprise Workflows",
            "explanation": "Applications use PID lockfiles to guarantee that only one schema migration or batch process runs at a time. If the server reboots or encounters OOM-killer mid-run, the lockfile remains orphaned. Removing it allows new processes to acquire the lock cleanly.",
            "pro_commands": [
                "cat /tmp/office_sandbox/migration.lock",
                "lsof /tmp/office_sandbox/migration.lock",
                "rm -f /tmp/office_sandbox/migration.lock"
            ]
        }
    },
    {
        "type": "INODE_EXHAUSTION",
        "title": "Filesystem Alert: Runaway Spool Queue Inodes Flooded in /tmp/office_sandbox/spool",
        "severity": "HIGH",
        "emp_id": "EMP-005",
        "workstation_path": "/tmp/office_sandbox/spool",
        "target_file": "/tmp/office_sandbox/spool",
        "error_log": "[FATAL] InodeExhaustion: Cannot create file in '/tmp/office_sandbox/spool'. File table overflow (100% Inodes consumed in spool queue).",
        "hint": "Check inode capacity with 'df -i /tmp' and clean up stale queue messages using 'rm -rf /tmp/office_sandbox/spool/*' or 'find /tmp/office_sandbox/spool -type f -delete'.",
        "solution_cmd": "find /tmp/office_sandbox/spool -type f -delete",
        "knowledge_pill": {
            "title": "Understanding Linux Inodes vs Disk Space",
            "explanation": "A disk partition can have gigabytes of free space, yet return 'No space left on device' if all inode pointers are exhausted! Millions of zero-byte files can exhaust inodes. Sysadmins check 'df -i' and use 'find ... -delete' for rapid batch removal.",
            "pro_commands": [
                "df -i /tmp",
                "find /tmp/office_sandbox/spool -type f | wc -l",
                "find /tmp/office_sandbox/spool -type f -delete"
            ]
        }
    },
    {
        "type": "BROKEN_SYMLINK",
        "title": "Runtime Link Failure: Broken Symbolic Link active_engine Points to Missing Target",
        "severity": "MEDIUM",
        "emp_id": "EMP-010",
        "workstation_path": "/tmp/office_sandbox",
        "target_file": "/tmp/office_sandbox/active_engine",
        "error_log": "[CRITICAL] FileNotFoundError: [Errno 2] No such file or directory: '/tmp/office_sandbox/active_engine'\nSymbolic link target '/opt/non_existent_engine_path' does not exist.",
        "hint": "Check symlink destination with 'ls -l /tmp/office_sandbox/active_engine'. Relink it to the valid engine directory using 'ln -sfn /opt/virtual-office/engine /tmp/office_sandbox/active_engine'.",
        "solution_cmd": "ln -sfn /opt/virtual-office/engine /tmp/office_sandbox/active_engine",
        "knowledge_pill": {
            "title": "Fixing Broken Symbolic Links in Linux",
            "explanation": "Symbolic links (soft links) act as pointers to other filesystem paths. If the target is moved or renamed, the link becomes a 'dangling symlink'. 'ln -sfn <target> <link>' creates or safely updates the link atomically.",
            "pro_commands": [
                "ls -l /tmp/office_sandbox/active_engine",
                "readlink -f /tmp/office_sandbox/active_engine",
                "ln -sfn /opt/virtual-office/engine /tmp/office_sandbox/active_engine"
            ]
        }
    },
    {
        "type": "CPU_RUNAWAY",
        "title": "Process Alert: Runaway Worker Process (runaway_task.py) Consuming High CPU",
        "severity": "CRITICAL",
        "emp_id": "EMP-014",
        "workstation_path": "/tmp/office_sandbox",
        "target_file": "/tmp/office_sandbox/runaway_task.py",
        "error_log": "[ALERT] Kernel CPU Alert: PID looping in userspace without yield. CPU throttling triggered on workstation 192.168.18.114.",
        "hint": "Find the high CPU PID using 'top' or 'ps aux | grep runaway_task'. Terminate it using 'pkill -f runaway_task.py'.",
        "solution_cmd": "pkill -f runaway_task.py",
        "knowledge_pill": {
            "title": "Taming Runaway Linux Processes",
            "explanation": "When asynchronous tasks loop without sleep statements, they consume 100% of a CPU core. Sysadmins use 'top', 'ps aux --sort=-%cpu', and 'pkill -f' or 'kill -9 <PID>' to terminate unresponsive runaway processes.",
            "pro_commands": [
                "ps aux | grep runaway_task",
                "pkill -f runaway_task.py"
            ]
        }
    },
    {
        "type": "WRONG_OWNERSHIP",
        "title": "Permission Denied: Workstation Config Owned by root:root (Non-Readable by Agent)",
        "severity": "HIGH",
        "emp_id": "EMP-012",
        "workstation_path": "/tmp/office_sandbox",
        "target_file": "/tmp/office_sandbox/workspace_config.json",
        "error_log": "[ERROR] PermissionError: [Errno 13] Permission denied: '/tmp/office_sandbox/workspace_config.json'\nFile is owned by root:root with mode 0600. Agent user cannot read configuration.",
        "hint": "Check file ownership with 'ls -la /tmp/office_sandbox/workspace_config.json'. Change owner to farman:farman using 'sudo chown farman:farman /tmp/office_sandbox/workspace_config.json'.",
        "solution_cmd": "sudo chown farman:farman /tmp/office_sandbox/workspace_config.json",
        "knowledge_pill": {
            "title": "Linux File Ownership & Least Privilege",
            "explanation": "Files created by root during setup scripts often retain root:root ownership. Service accounts running as standard users cannot read mode 600 root files. 'chown user:group file' reassigns proper ownership.",
            "pro_commands": [
                "ls -l /tmp/office_sandbox/workspace_config.json",
                "sudo chown farman:farman /tmp/office_sandbox/workspace_config.json",
                "chmod 644 /tmp/office_sandbox/workspace_config.json"
            ]
        }
    },
    {
        "type": "UNSET_ENV_VAR",
        "title": "Configuration Missing: CYBERAPEX_ENV Missing from /tmp/office_sandbox/app.env",
        "severity": "MEDIUM",
        "emp_id": "EMP-006",
        "workstation_path": "/tmp/office_sandbox",
        "target_file": "/tmp/office_sandbox/app.env",
        "error_log": "[FATAL] KeyError: 'CYBERAPEX_ENV' environment variable is undefined! Enterprise deployment policy requires CYBERAPEX_ENV=production.",
        "hint": "Append the missing variable to the env file: 'echo \"CYBERAPEX_ENV=production\" >> /tmp/office_sandbox/app.env'.",
        "solution_cmd": "echo 'CYBERAPEX_ENV=production' >> /tmp/office_sandbox/app.env",
        "knowledge_pill": {
            "title": "Environment Variable Injection in Modern Linux Apps",
            "explanation": "Twelve-factor applications store configuration in environment files (like .env). When mandatory deployment flags are missing, services refuse to boot. Appending key=value pairs restores the environment contract.",
            "pro_commands": [
                "cat /tmp/office_sandbox/app.env",
                "echo 'CYBERAPEX_ENV=production' >> /tmp/office_sandbox/app.env"
            ]
        }
    },
    {
        "type": "CORE_DUMP_TRASH",
        "title": "Storage Clutter: Uncleaned Core Dump File core.9999 Cluttering Sandbox",
        "severity": "LOW",
        "emp_id": "EMP-013",
        "workstation_path": "/tmp/office_sandbox",
        "target_file": "/tmp/office_sandbox/core.9999",
        "error_log": "[WARN] PostMortem: Crash dump /tmp/office_sandbox/core.9999 (15MB) left uncleared after previous assertion failure.",
        "hint": "Inspect core dump files and remove it with 'rm -f /tmp/office_sandbox/core.9999'.",
        "solution_cmd": "rm -f /tmp/office_sandbox/core.9999",
        "knowledge_pill": {
            "title": "Core Dumps & Linux Post-Mortem Cleanup",
            "explanation": "When C/C++ libraries or native Python extensions crash with SIGSEGV, the Linux kernel writes memory snapshots (core dumps). Once analyzed, sysadmins purge them to save disk capacity.",
            "pro_commands": [
                "file /tmp/office_sandbox/core.9999",
                "rm -f /tmp/office_sandbox/core.9999"
            ]
        }
    },
    {
        "type": "CORRUPT_JSON_CONFIG",
        "title": "JSON Syntax Error: Trailing Comma in /tmp/office_sandbox/api_routes.json",
        "severity": "HIGH",
        "emp_id": "EMP-011",
        "workstation_path": "/tmp/office_sandbox",
        "target_file": "/tmp/office_sandbox/api_routes.json",
        "error_log": "[ERROR] json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes: line 4 column 1 (char 65)\nAPI gateway parser crashed on invalid routes config.",
        "hint": "Fix the JSON file by writing valid JSON: 'echo \'{\"status\": \"ok\", \"routes\": [\"/api/v1\", \"/api/v2\"]}\' > /tmp/office_sandbox/api_routes.json'.",
        "solution_cmd": "echo '{\"status\": \"ok\", \"routes\": [\"/api/v1\", \"/api/v2\"]}' > /tmp/office_sandbox/api_routes.json",
        "knowledge_pill": {
            "title": "Validating JSON Configurations on Linux",
            "explanation": "Standard JSON does not permit trailing commas. Sysadmins validate JSON syntax on the CLI using 'jq .' or 'python3 -m json.tool file.json' before deploying configurations.",
            "pro_commands": [
                "python3 -m json.tool /tmp/office_sandbox/api_routes.json",
                "echo '{\"status\": \"ok\", \"routes\": [\"/api/v1\", \"/api/v2\"]}' > /tmp/office_sandbox/api_routes.json"
            ]
        }
    },
    {
        "type": "READONLY_DIRECTORY",
        "title": "Directory Lock: Build Cache Directory (/tmp/office_sandbox/build_cache) is Read-Only",
        "severity": "HIGH",
        "emp_id": "EMP-010",
        "workstation_path": "/tmp/office_sandbox/build_cache",
        "target_file": "/tmp/office_sandbox/build_cache",
        "error_log": "[ERROR] PermissionError: [Errno 13] Permission denied: '/tmp/office_sandbox/build_cache/manifest.lock'\nCannot write build manifest into read-only directory.",
        "hint": "Check directory permissions using 'ls -ld /tmp/office_sandbox/build_cache'. Grant write permission using 'chmod 775 /tmp/office_sandbox/build_cache'.",
        "solution_cmd": "chmod 775 /tmp/office_sandbox/build_cache",
        "knowledge_pill": {
            "title": "Directory Execution and Write Bits in Linux",
            "explanation": "To create or delete files inside a Linux directory, a user requires BOTH write ('w') and execute ('x') permissions on the directory. Mode 0555 allows read and search, but forbids write operations. Mode 775 allows team write access.",
            "pro_commands": [
                "ls -ld /tmp/office_sandbox/build_cache",
                "chmod 775 /tmp/office_sandbox/build_cache"
            ]
        }
    },
    {
        "type": "DNS_HOST_OVERRIDE",
        "title": "Name Resolution Failure: internal-db.local Missing from Sandbox Hosts Map",
        "severity": "HIGH",
        "emp_id": "EMP-003",
        "workstation_path": "/tmp/office_sandbox",
        "target_file": "/tmp/office_sandbox/hosts_override",
        "error_log": "[ERROR] socket.gaierror: [Errno -2] Name or service not known: 'internal-db.local'\nMicroservices cannot resolve local database hostname.",
        "hint": "Add the database IP mapping using 'echo \"192.168.18.107 internal-db.local\" >> /tmp/office_sandbox/hosts_override'.",
        "solution_cmd": "echo '192.168.18.107 internal-db.local' >> /tmp/office_sandbox/hosts_override",
        "knowledge_pill": {
            "title": "Static Host Resolution via /etc/hosts",
            "explanation": "Before querying upstream DNS servers, the Linux resolver checks static mappings (NSSwitch files). Adding IP-to-hostname entries resolves local microservices instantly without DNS query overhead.",
            "pro_commands": [
                "cat /tmp/office_sandbox/hosts_override",
                "echo '192.168.18.107 internal-db.local' >> /tmp/office_sandbox/hosts_override"
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
        self.recent_challenges = [] # Prevents repetitive challenges

        # Ensure sandbox exists
        os.makedirs("/tmp/office_sandbox", exist_ok=True)
        os.makedirs("/var/log/virtual_office", exist_ok=True)

        # Gamification State
        self.player_stats = {
            "name": "Farman",
            "xp": 350,
            "level": 2,
            "rank": "Systems Engineer",
            "badge": "⚡",
            "coins": 1500,
            "unlocked_perks": []
        }

    def _setup_real_os_incident(self, challenge):
        """Actually creates the real problem on the Linux OS!"""
        c_type = challenge["type"]
        try:
            os.makedirs("/tmp/office_sandbox", exist_ok=True)

            if c_type == "DISK_BLOAT":
                os.makedirs("/var/log/virtual_office", exist_ok=True)
                with open("/var/log/virtual_office/app_debug_bloat.log", "wb") as f:
                    f.write(b"AUDIT_DEBUG_DATA_BLOCK_" * 1500000) # ~35 MB bloat file
            
            elif c_type == "ROGUE_PORT":
                os.makedirs("/opt/virtual-office/sandbox", exist_ok=True)
                subprocess.run("pkill -f rogue_worker", shell=True)
                subprocess.Popen(["/bin/python3", "/opt/virtual-office/sandbox/rogue_worker.py"])
                time.sleep(0.5)

            elif c_type == "PERMISSION_SOCKET":
                sock_file = "/tmp/office_sandbox/production_app.sock"
                with open(sock_file, "w") as f:
                    f.write("UNIX_SOCKET_DESCRIPTOR")
                os.chmod(sock_file, 0o000)

            elif c_type == "LAN_CABLE_DISCONNECT":
                pass

            elif c_type == "SYSTEMD_SERVICE":
                subprocess.run("sudo -n systemctl stop office-db 2>/dev/null || true", shell=True)

            elif c_type == "SSH_KEY_PERMISSIONS":
                pem_file = "/tmp/office_sandbox/deploy_key.pem"
                with open(pem_file, "w") as f:
                    f.write("-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA=\n-----END OPENSSH PRIVATE KEY-----")
                os.chmod(pem_file, 0o664)

            elif c_type == "STALE_LOCK_FILE":
                lock_file = "/tmp/office_sandbox/migration.lock"
                with open(lock_file, "w") as f:
                    f.write(f"PID=9998; LOCKED_AT={time.time()}; STATUS=ABORTED_ON_OOM")

            elif c_type == "INODE_EXHAUSTION":
                spool_dir = "/tmp/office_sandbox/spool"
                os.makedirs(spool_dir, exist_ok=True)
                for i in range(120):
                    with open(os.path.join(spool_dir, f"msg_spool_{i:04d}.dat"), "w") as f:
                        f.write(f"QUEUE_ITEM_{i}")

            elif c_type == "BROKEN_SYMLINK":
                symlink = "/tmp/office_sandbox/active_engine"
                if os.path.islink(symlink) or os.path.exists(symlink):
                    os.unlink(symlink)
                os.symlink("/opt/non_existent_engine_path", symlink)

            elif c_type == "CPU_RUNAWAY":
                runaway_script = "/tmp/office_sandbox/runaway_task.py"
                with open(runaway_script, "w") as f:
                    f.write("import time\nwhile True:\n    x = sum([i*i for i in range(1000)])\n    time.sleep(0.01)\n")
                subprocess.run("pkill -f runaway_task.py", shell=True)
                subprocess.Popen(["/bin/python3", runaway_script])
                time.sleep(0.3)

            elif c_type == "WRONG_OWNERSHIP":
                cfg = "/tmp/office_sandbox/workspace_config.json"
                with open(cfg, "w") as f:
                    f.write('{"mode": "production", "workers": 4, "db": "mariadb"}')
                subprocess.run(f"sudo -n chown root:root {cfg} && sudo -n chmod 600 {cfg}", shell=True)

            elif c_type == "UNSET_ENV_VAR":
                env_file = "/tmp/office_sandbox/app.env"
                with open(env_file, "w") as f:
                    f.write("# CyberApex Enterprise Environment\nPORT=80\n")

            elif c_type == "CORE_DUMP_TRASH":
                dmp = "/tmp/office_sandbox/core.9999"
                with open(dmp, "wb") as f:
                    f.write(b"\x7fELF" + b"\x00" * 1024 * 500) # 500KB dummy dump

            elif c_type == "CORRUPT_JSON_CONFIG":
                jfile = "/tmp/office_sandbox/api_routes.json"
                with open(jfile, "w") as f:
                    f.write('{\n  "routes": [\n    "/api/v1",\n    "/api/v2",\n  ]\n}') # Trailing comma

            elif c_type == "READONLY_DIRECTORY":
                bdir = "/tmp/office_sandbox/build_cache"
                os.makedirs(bdir, exist_ok=True)
                os.chmod(bdir, 0o555)

            elif c_type == "DNS_HOST_OVERRIDE":
                hfile = "/tmp/office_sandbox/hosts_override"
                with open(hfile, "w") as f:
                    f.write("127.0.0.1 localhost\n")

        except Exception as e:
            print(f"[ERROR setting up real incident {c_type}] {e}")

    def check_real_os_fix(self, ticket):
        """Inspects the Rocky Linux OS to verify if the issue was solved!"""
        c_type = ticket["type"]
        try:
            if c_type == "DISK_BLOAT":
                path = "/var/log/virtual_office/app_debug_bloat.log"
                if not os.path.exists(path):
                    return True, "File removed or truncated to 0 bytes! Disk space recovered."
                size = os.path.getsize(path)
                if size < 1024 * 1024: # Less than 1MB
                    return True, f"File successfully truncated to {size} bytes! Disk space recovered."
                return False, f"File size is still {round(size/(1024*1024), 1)} MB. Truncate it to free disk space."

            elif c_type == "ROGUE_PORT":
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

            elif c_type == "LAN_CABLE_DISCONNECT":
                emp = self.office.get(ticket.get("emp_id"))
                if emp and emp.get("lan_connected", True):
                    ip = emp.get("ip")
                    res = subprocess.run(f"ip netns exec office-sandbox ip addr show eth-office | grep '{ip}'", shell=True, stdout=subprocess.PIPE)
                    if res.returncode == 0:
                        return True, f"Carrier detected! Link active and IP {ip} bound in office-sandbox (Host ens160 safe)."
                return False, f"Physical cable is unplugged or IP {ticket.get('emp_ip')} is down in office-sandbox. Plug cable back in [L]!"
                res = subprocess.run("systemctl is-active office-db", shell=True, stdout=subprocess.PIPE)
                status = res.stdout.decode().strip()
                if status == "active":
                    return True, "Systemd unit office-db.service is ACTIVE and running!"
                return False, f"Service is currently '{status}'. Run 'sudo systemctl start office-db'."

            elif c_type == "SSH_KEY_PERMISSIONS":
                path = "/tmp/office_sandbox/deploy_key.pem"
                if not os.path.exists(path):
                    return True, "Key file secured."
                mode = os.stat(path).st_mode & 0o777
                if mode in (0o600, 0o400):
                    return True, f"Security verified! Permissions locked down to {oct(mode)}."
                return False, f"Permissions are currently {oct(mode)}. Must be set to 600 ('chmod 600 {path}')."

            elif c_type == "STALE_LOCK_FILE":
                path = "/tmp/office_sandbox/migration.lock"
                if not os.path.exists(path):
                    return True, "Stale migration lock removed! Schema engine unlocked."
                return False, "Lock file /tmp/office_sandbox/migration.lock still exists. Run 'rm -f' to remove it."

            elif c_type == "INODE_EXHAUSTION":
                spool_dir = "/tmp/office_sandbox/spool"
                if not os.path.exists(spool_dir):
                    return True, "Spool directory purged."
                count = len(os.listdir(spool_dir))
                if count < 10:
                    return True, f"Spool queue cleaned up! Inodes recovered ({count} items remaining)."
                return False, f"Spool directory still contains {count} files. Run 'find /tmp/office_sandbox/spool -type f -delete'."

            elif c_type == "BROKEN_SYMLINK":
                symlink = "/tmp/office_sandbox/active_engine"
                if not os.path.islink(symlink):
                    return True, "Link updated."
                target = os.readlink(symlink)
                if os.path.exists(target):
                    return True, f"Symlink verified! Points to valid target '{target}'."
                return False, f"Symlink still broken, points to non-existent '{target}'. Relink to /opt/virtual-office/engine."

            elif c_type == "CPU_RUNAWAY":
                res = subprocess.run("pgrep -f runaway_task.py", shell=True, stdout=subprocess.PIPE)
                if not res.stdout.strip():
                    return True, "Runaway compute process terminated! CPU utilization normalized."
                return False, "Runaway process is still running! Run 'pkill -f runaway_task.py'."

            elif c_type == "WRONG_OWNERSHIP":
                cfg = "/tmp/office_sandbox/workspace_config.json"
                if not os.path.exists(cfg):
                    return True, "Config file replaced."
                st = os.stat(cfg)
                import pwd
                owner = pwd.getpwuid(st.st_uid).pw_name
                mode = st.st_mode & 0o777
                if owner == "farman" or mode in (0o644, 0o664, 0o775):
                    return True, f"Ownership verified: owned by '{owner}' with mode {oct(mode)}."
                return False, f"File is still owned by '{owner}' with mode {oct(mode)}. Run 'sudo chown farman:farman {cfg}'."

            elif c_type == "UNSET_ENV_VAR":
                path = "/tmp/office_sandbox/app.env"
                if not os.path.exists(path):
                    return False, f"File {path} not found."
                with open(path) as f:
                    content = f.read()
                if "CYBERAPEX_ENV" in content and "production" in content:
                    return True, "Environment variable CYBERAPEX_ENV=production configured!"
                return False, "CYBERAPEX_ENV=production not found in /tmp/office_sandbox/app.env."

            elif c_type == "CORE_DUMP_TRASH":
                path = "/tmp/office_sandbox/core.9999"
                if not os.path.exists(path):
                    return True, "Stale core dump cleared from sandbox."
                return False, "Core dump file still present. Run 'rm -f /tmp/office_sandbox/core.9999'."

            elif c_type == "CORRUPT_JSON_CONFIG":
                path = "/tmp/office_sandbox/api_routes.json"
                if not os.path.exists(path):
                    return True, "JSON config file re-generated."
                try:
                    with open(path) as f:
                        json.load(f)
                    return True, "JSON syntax validation PASSED! Valid JSON format."
                except Exception as e:
                    return False, f"JSON syntax still invalid: {str(e)}"

            elif c_type == "READONLY_DIRECTORY":
                bdir = "/tmp/office_sandbox/build_cache"
                if not os.path.exists(bdir):
                    return True, "Directory recreated."
                mode = os.stat(bdir).st_mode & 0o777
                if mode & 0o200: # Writable by owner
                    return True, f"Directory is now writable! Mode: {oct(mode)}."
                return False, f"Directory mode is {oct(mode)}. Run 'chmod 775 {bdir}' to make it writable."

            elif c_type == "DNS_HOST_OVERRIDE":
                path = "/tmp/office_sandbox/hosts_override"
                if not os.path.exists(path):
                    return False, f"{path} missing."
                with open(path) as f:
                    content = f.read()
                if "internal-db.local" in content:
                    return True, "Hostname mapping internal-db.local verified!"
                return False, "Mapping for internal-db.local missing. Run 'echo \"192.168.18.107 internal-db.local\" >> /tmp/office_sandbox/hosts_override'."

            return True, "Condition verified."
        except Exception as e:
            return False, f"Check error: {str(e)}"

    def _auto_remediate_on_os(self, challenge_type):
        """Executes the safe remediation command directly on the OS when auto-fixing"""
        try:
            if challenge_type == "DISK_BLOAT":
                p = "/var/log/virtual_office/app_debug_bloat.log"
                if os.path.exists(p):
                    with open(p, "w") as f:
                        pass
            elif challenge_type == "ROGUE_PORT":
                subprocess.run("pkill -f rogue_worker", shell=True)
            elif challenge_type == "PERMISSION_SOCKET":
                p = "/tmp/office_sandbox/production_app.sock"
                if os.path.exists(p):
                    os.chmod(p, 0o775)
            elif challenge_type == "SYSTEMD_SERVICE":
                subprocess.run("sudo -n systemctl start office-db 2>/dev/null || true", shell=True)
            elif challenge_type == "SSH_KEY_PERMISSIONS":
                p = "/tmp/office_sandbox/deploy_key.pem"
                if os.path.exists(p):
                    os.chmod(p, 0o600)
            elif challenge_type == "STALE_LOCK_FILE":
                p = "/tmp/office_sandbox/migration.lock"
                if os.path.exists(p):
                    os.remove(p)
            elif challenge_type == "INODE_EXHAUSTION":
                d = "/tmp/office_sandbox/spool"
                if os.path.exists(d):
                    for f in os.listdir(d):
                        try:
                            os.remove(os.path.join(d, f))
                        except Exception:
                            pass
            elif challenge_type == "BROKEN_SYMLINK":
                s = "/tmp/office_sandbox/active_engine"
                if os.path.islink(s) or os.path.exists(s):
                    os.unlink(s)
                os.symlink("/opt/virtual-office/engine", s)
            elif challenge_type == "CPU_RUNAWAY":
                subprocess.run("pkill -f runaway_task.py", shell=True)
            elif challenge_type == "WRONG_OWNERSHIP":
                p = "/tmp/office_sandbox/workspace_config.json"
                if os.path.exists(p):
                    subprocess.run(f"sudo -n chown farman:farman {p} && chmod 644 {p}", shell=True)
            elif challenge_type == "UNSET_ENV_VAR":
                p = "/tmp/office_sandbox/app.env"
                with open(p, "a") as f:
                    f.write("CYBERAPEX_ENV=production\n")
            elif challenge_type == "CORE_DUMP_TRASH":
                p = "/tmp/office_sandbox/core.9999"
                if os.path.exists(p):
                    os.remove(p)
            elif challenge_type == "CORRUPT_JSON_CONFIG":
                p = "/tmp/office_sandbox/api_routes.json"
                with open(p, "w") as f:
                    f.write('{"status": "ok", "routes": ["/api/v1", "/api/v2"]}')
            elif challenge_type == "READONLY_DIRECTORY":
                p = "/tmp/office_sandbox/build_cache"
                if os.path.exists(p):
                    os.chmod(p, 0o775)
            elif challenge_type == "DNS_HOST_OVERRIDE":
                p = "/tmp/office_sandbox/hosts_override"
                with open(p, "a") as f:
                    f.write("192.168.18.107 internal-db.local\n")
            elif challenge_type == "LAN_CABLE_DISCONNECT":
                for e in self.office.get_all():
                    if not e.get("lan_connected", True):
                        e["lan_connected"] = True
                        ip = e.get("ip")
                        if ip:
                            subprocess.run(f"sudo -n ip netns exec office-sandbox ip addr add {ip}/24 dev eth-office 2>/dev/null || true", shell=True)
        except Exception as e:
            print(f"[AutoRemediate Error] {e}")

    def trigger_incident(self, specific_type=None, target_emp_id=None):
        template = None
        if specific_type:
            for t in REAL_CHALLENGES:
                if t["type"] == specific_type:
                    template = t
                    break
        
        if not template:
            # Pick a challenge that hasn't run recently to guarantee variety
            available = [c for c in REAL_CHALLENGES if c["type"] not in self.recent_challenges[-6:]]
            if not available:
                available = REAL_CHALLENGES
            template = random.choice(available)

        # Update recent history
        self.recent_challenges.append(template["type"])
        if len(self.recent_challenges) > 12:
            self.recent_challenges.pop(0)

        # Trigger on real OS
        self._setup_real_os_incident(template)

        emp = self.office.get(template["emp_id"]) or self.office.get("EMP-006")
        ticket_id = f"TICK-{self.ticket_counter}"
        self.ticket_counter += 1

        prev_task = emp["task"]
        self.office.set_status(emp["id"], "blocked", f"⚠️ BLOCKED: {template['title']}")

        ticket = {
            "id": ticket_id,
            "created_at": time.strftime("%H:%M:%S"),
            "status": "OPEN",
            "type": template["type"],
            "title": template["title"],
            "severity": template["severity"],
            "emp_id": emp["id"],
            "emp_name": emp["name"],
            "emp_role": emp["role"],
            "emp_ip": emp["ip"],
            "emp_hostname": emp["hostname"],
            "emp_dept": emp["dept"],
            "previous_task": prev_task,
            "workstation_path": template.get("workstation_path", "/tmp/office_sandbox"),
            "target_file": template.get("target_file", ""),
            "error_log": template["error_log"],
            "hint": template["hint"],
            "solution_cmd": template["solution_cmd"],
            "knowledge_pill": template["knowledge_pill"],
            "xp_reward": 150,
            "vdi_active": False,
            "admin_remarks": []
        }

        self.tickets.insert(0, ticket)

        # Announce in Chat
        self.chat.add_message(
            sender_id=emp["id"],
            sender_name=emp["name"],
            role=emp["role"],
            dept=emp["dept"],
            avatar="⚠️",
            text=f"🆘 **NEW IT TICKET RAISED [{ticket_id} - {template['severity']}]:**\n'{template['title']}'\nWorkstation IP: `{emp['ip']}` | Host: `{emp['hostname']}`\nFarman, my task is blocked. Please inspect and resolve!"
        )

        return ticket

    def start_vdi_session(self, ticket_id):
        for t in self.tickets:
            if t["id"] == ticket_id:
                t["vdi_active"] = True
                return True, f"VDI session connected to {t['emp_hostname']} ({t['emp_ip']}). Terminal ready."
        return False, "Ticket not found"

    def stop_vdi_session(self, ticket_id):
        for t in self.tickets:
            if t["id"] == ticket_id:
                t["vdi_active"] = False
                return True, f"VDI disconnected from {t['emp_hostname']}. Host resources saved."
        return False, "Ticket not found"

    def add_admin_remark(self, ticket_id, remark_text, admin_name="Farman (Linux Admin)"):
        for t in self.tickets:
            if t["id"] == ticket_id:
                admin_entry = {
                    "id": f"REM-{int(time.time()*1000)}",
                    "timestamp": time.strftime("%H:%M:%S"),
                    "author": admin_name,
                    "role": "Chief Linux Admin",
                    "text": remark_text
                }
                t["admin_remarks"].append(admin_entry)

                bot_reply_text = self._generate_bot_reply(t, remark_text)
                bot_entry = {
                    "id": f"REM-{int(time.time()*1000)+1}",
                    "timestamp": time.strftime("%H:%M:%S"),
                    "author": t["emp_name"],
                    "role": t["emp_role"],
                    "text": bot_reply_text
                }
                t["admin_remarks"].append(bot_entry)

                self.chat.add_message(
                    sender_id="ADMIN",
                    sender_name=admin_name,
                    role="Chief Linux Architect",
                    dept="admin",
                    avatar="🛡️",
                    text=f"📝 **Admin Remark on {ticket_id}:** \"{remark_text}\""
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

    def _generate_bot_reply(self, ticket, remark_text):
        remark_lower = remark_text.lower()
        t_type = ticket["type"]

        if t_type == "DISK_BLOAT":
            return "Understood, Admin Farman! Verified disk space is recovered with truncate. Resuming log processing!"
        elif t_type == "ROGUE_PORT":
            return "Received, Admin Farman! Port 8888 is now clear of zombie processes. Resuming API worker!"
        elif t_type == "PERMISSION_SOCKET":
            return "Noted, Admin Farman! Socket permissions restored to 775. IPC communication active!"
        elif t_type == "SYSTEMD_SERVICE":
            return "Acknowledged, Admin Farman! Verified office-db.service is active. Connection pool reconnected!"
        elif t_type == "SSH_KEY_PERMISSIONS":
            return "Fixed, Admin Farman! Permissions locked down to 600. Key accepted by OpenSSH!"
        elif t_type == "STALE_LOCK_FILE":
            return "Thank you Admin Farman! Stale migration lock cleared. Database schema updated successfully!"
        elif t_type == "INODE_EXHAUSTION":
            return "Superb! Spool queue inodes cleared. New background messages are flowing smoothly!"
        elif t_type == "BROKEN_SYMLINK":
            return "Awesome! Broken symlink re-pointed to active engine. Dependency imports working!"
        elif t_type == "CPU_RUNAWAY":
            return "Great relief! Runaway thread killed. Workstation CPU load dropped back to normal!"
        elif t_type == "WRONG_OWNERSHIP":
            return "Thank you Admin Farman! Configuration ownership fixed, agent user can now read settings."
        elif t_type == "DNS_HOST_OVERRIDE":
            return "Host resolution verified! Microservice can resolve internal-db.local properly now."
        else:
            return f"Thank you for the guidance, Admin Farman! \"{remark_text}\" - Applied instructions and resuming task!"

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
                    self._auto_remediate_on_os(t["type"])
                    reason = "Auto-Remediation / SysAdmin Fast Override"

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
                    text=f"🌟 **INCIDENT RESOLVED [{t['id']}]!** Thank you {admin_name}! {reason}. Workstation healthy. +{xp_gain} XP awarded to Admin!"
                )

                return True, reason, t
        return False, "Ticket not found", None

    def tick(self, is_project_active):
        if not is_project_active:
            return

        now = time.time()
        open_tickets = [t for t in self.tickets if t["status"] == "OPEN"]
        # Trigger an incident every 50-70 seconds if less than 2 open
        if len(open_tickets) < 2 and (now - self.last_incident_time) > random.randint(50, 70):
            self.trigger_incident()
            self.last_incident_time = now

    def get_open_tickets(self):
        return [t for t in self.tickets if t["status"] == "OPEN"]

    def get_all_tickets(self):
        return self.tickets

    def trigger_lan_disconnect_ticket(self, emp_id):
        emp = self.office.get(emp_id)
        if not emp:
            return None
        
        # Check if already has an open LAN ticket
        for t in self.tickets:
            if t.get("emp_id") == emp_id and t.get("type") == "LAN_CABLE_DISCONNECT" and t.get("status") == "OPEN":
                return t
        
        ticket_id = f"TICK-{self.ticket_counter}"
        self.ticket_counter += 1
        
        prev_task = emp.get("task", "Awaiting assignment")
        self.office.set_status(emp["id"], "blocked", f"⚠️ BLOCKED: LAN Cable Disconnected from Core Switch")
        
        ticket = {
            "id": ticket_id,
            "created_at": time.strftime("%H:%M:%S"),
            "status": "OPEN",
            "type": "LAN_CABLE_DISCONNECT",
            "title": f"Physical LAN Cable Disconnected on Workstation {emp['ip']}",
            "severity": "CRITICAL",
            "emp_id": emp["id"],
            "emp_name": emp["name"],
            "emp_role": emp["role"],
            "emp_ip": emp["ip"],
            "emp_hostname": emp["hostname"],
            "emp_dept": emp["dept"],
            "previous_task": prev_task,
            "workstation_path": "/etc/netns/office-sandbox",
            "target_file": "eth-office",
            "error_log": f"[KERNEL]: eth carrier lost on sandbox interface eth-office alias {emp['ip']}\n[NETWORK]: 100% packet loss to default gateway 192.168.18.2\n[DIAGNOSTIC]: Physical RJ45 patch cord disconnected from Central 10G Core Switch rack in Server Room.\n[ISOLATION]: Isolated inside 'office-sandbox' namespace; host ens160 protected.",
            "hint": f"Walk to {emp['name']}'s workstation desk (or Server Room Core Switch rack) in Walk Mode and press [L] to reconnect the LAN cable, or bind IP via terminal.",
            "solution_cmd": f"sudo -n ip netns exec office-sandbox ip addr add {emp['ip']}/24 dev eth-office",
            "knowledge_pill": "Physical Layer (Layer 1 OSI) loss terminates all IP socket transport. Reconnecting the RJ45 cable restores PHY carrier detection and re-binds the Linux network alias inside the isolated sandbox namespace without touching host ens160.",
            "xp_reward": 120,
            "vdi_active": False,
            "admin_remarks": []
        }
        self.tickets.insert(0, ticket)
        
        self.chat.add_message(
            sender_id=emp["id"],
            sender_name=emp["name"],
            role=emp["role"],
            dept=emp["dept"],
            avatar="🔌",
            text=f"🚨 **HELP! NETWORK OUTAGE [{ticket_id} - CRITICAL]!** Workstation `{emp['ip']}` lost Ethernet link! 100% packet loss to 192.168.18.2! Farman, did someone pull my LAN cable?!"
        )
        return ticket

    def resolve_lan_disconnect_ticket(self, emp_id):
        emp = self.office.get(emp_id)
        if not emp:
            return False
        resolved_any = False
        for t in self.tickets:
            if t.get("emp_id") == emp_id and t.get("type") == "LAN_CABLE_DISCONNECT" and t.get("status") == "OPEN":
                t["status"] = "RESOLVED"
                t["resolved_at"] = time.strftime("%H:%M:%S")
                t["resolution_notes"] = "Physical LAN cable re-plugged into 10G Core Switch port; carrier link UP"
                self.resolved_count += 1
                resolved_any = True
                
                # Award XP and coins
                xp_gain = t.get("xp_reward", 120)
                self.player_stats["xp"] += xp_gain
                self.player_stats["coins"] += 40
                
                # Check level up
                for r in RANKS:
                    if r["min_xp"] <= self.player_stats["xp"] < r["max_xp"]:
                        self.player_stats["level"] = r["level"]
                        self.player_stats["rank"] = r["title"]
                        self.player_stats["badge"] = r["badge"]

                # Unblock employee
                self.office.set_status(emp_id, "working", t.get("previous_task", "Working on tasks"))

                self.chat.add_message(
                    sender_id=emp["id"],
                    sender_name=emp["name"],
                    role=emp["role"],
                    dept=emp["dept"],
                    avatar="🎉",
                    text=f"🟢 **NETWORK RESTORED [{t['id']}]:** Thank you Chief Admin Farman! LAN cable plugged back in. 1Gbps Full Duplex active on `{emp['ip']}`! +{xp_gain} XP awarded to Farman!"
                )
        return resolved_any
