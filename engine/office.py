"""
Virtual Office Core 16 Characters Model & Cabin Layout
High-personality agents with distinct roles, skills, and spatial cabins.
"""

ROOMS = {
    "room_mgmt": {
        "id": "room_mgmt",
        "name": "Executive Boardroom",
        "icon": "👔",
        "x": 20, "y": 20, "w": 230, "h": 170,
        "color": "#6366f1",
        "desc": "Project Planning & Client SLA Review"
    },
    "room_noc": {
        "id": "room_noc",
        "name": "Network Operations Center (NOC)",
        "icon": "🌐",
        "x": 270, "y": 20, "w": 230, "h": 170,
        "color": "#06b6d4",
        "desc": "Subnets, DNS, NFS Storage & Firewalls"
    },
    "room_admin": {
        "id": "room_admin",
        "name": "Farman's Linux Command Deck",
        "icon": "🛡️",
        "x": 520, "y": 20, "w": 230, "h": 170,
        "color": "#10b981",
        "desc": "Root Master Station & Production Server Tower"
    },
    "room_cafe": {
        "id": "room_cafe",
        "name": "Cafeteria & Cyber Lounge",
        "icon": "☕",
        "x": 770, "y": 20, "w": 230, "h": 170,
        "color": "#f59e0b",
        "desc": "Espresso Machine & Recharge Station"
    },
    "room_backend": {
        "id": "room_backend",
        "name": "Backend & Database Engineering Bay",
        "icon": "⚙️",
        "x": 20, "y": 210, "w": 480, "h": 200,
        "color": "#3b82f6",
        "desc": "Python APIs, Microservices, MariaDB & Redis"
    },
    "room_frontend": {
        "id": "room_frontend",
        "name": "Frontend & UI Design Studio",
        "icon": "💻",
        "x": 520, "y": 210, "w": 480, "h": 200,
        "color": "#8b5cf6",
        "desc": "React Dashboards, WebSocket Streams & UI Architecture"
    },
    "room_devops": {
        "id": "room_devops",
        "name": "DevOps & Cloud War Room",
        "icon": "🚀",
        "x": 20, "y": 430, "w": 480, "h": 200,
        "color": "#ef4444",
        "desc": "Docker Containers, CI/CD Pipelines & Systemd Daemons"
    },
    "room_qa": {
        "id": "room_qa",
        "name": "QA & Security Penetration Lab",
        "icon": "🧪",
        "x": 520, "y": 430, "w": 480, "h": 200,
        "color": "#14b8a6",
        "desc": "Stress Tests, Selenium Suites & Security Auditing"
    }
}

CORE_CHARACTERS = [
    # 1. Management
    {
        "id": "EMP-001",
        "name": "Vikram Sharma",
        "role": "General Manager & Tech Director",
        "dept": "management",
        "room_id": "room_mgmt",
        "avatar": "👨‍💼",
        "status": "idle",
        "desk_x": 80, "desk_y": 90,
        "x": 80, "y": 90,
        "ip": "192.168.18.101",
        "hostname": "mgmt-director.corp.local",
        "specialty": "Client Deliverables & Technical Architecture",
        "bio": "15+ years managing enterprise IT teams. Oversees the 16 core engineers.",
        "thought": "Awaiting Client Project from Farman",
        "task": "Reviewing client SLAs and quarterly roadmap"
    },
    {
        "id": "EMP-002",
        "name": "Priya Patel",
        "role": "Operations & SLA Director",
        "dept": "management",
        "room_id": "room_mgmt",
        "avatar": "👩‍💼",
        "status": "idle",
        "desk_x": 170, "desk_y": 90,
        "x": 170, "y": 90,
        "ip": "192.168.18.102",
        "hostname": "mgmt-ops.corp.local",
        "specialty": "Budget & Resource Allocation",
        "bio": "Tracks uptime commitments, infrastructure costs, and delivery deadlines.",
        "thought": "All server licenses active and ready",
        "task": "Reviewing system capacity and team throughput"
    },

    # 2. Network Operations Center
    {
        "id": "EMP-003",
        "name": "Rohan Mehta",
        "role": "Network & Security Lead",
        "dept": "network",
        "room_id": "room_noc",
        "avatar": "🧑‍💻",
        "status": "idle",
        "desk_x": 330, "desk_y": 90,
        "x": 330, "y": 90,
        "ip": "192.168.18.103",
        "hostname": "noc-lead.corp.local",
        "specialty": "BGP, Firewalld, Subnetting & VoIP Trunks",
        "bio": "Network architect specialized in Rocky Linux networking, Asterisk SIP, and packet filtering.",
        "thought": "Gateway latency is 0.8ms, all clean",
        "task": "Monitoring ens160 interface routes and firewalld zones"
    },
    {
        "id": "EMP-004",
        "name": "Sameer Khan",
        "role": "Storage & NOC Systems Engineer",
        "dept": "network",
        "room_id": "room_noc",
        "avatar": "🌐",
        "status": "idle",
        "desk_x": 420, "desk_y": 90,
        "x": 420, "y": 90,
        "ip": "192.168.18.104",
        "hostname": "noc-storage.corp.local",
        "specialty": "NFS Storage, DNS Resolvers & Reverse Proxies",
        "bio": "Manages remote NFS storage mounts from 192.168.18.20 and internal DNS resolvers.",
        "thought": "NFS storage connection verified",
        "task": "Checking mount /var/log/test02 response latency"
    },

    # 3. Backend & Database Pod
    {
        "id": "EMP-005",
        "name": "Rahul Verma",
        "role": "Backend & Database Lead",
        "dept": "backend",
        "room_id": "room_backend",
        "avatar": "👨‍💻",
        "status": "idle",
        "desk_x": 80, "desk_y": 280,
        "x": 80, "y": 280,
        "ip": "192.168.18.105",
        "hostname": "be-lead.corp.local",
        "specialty": "API Architecture, Microservices & PostgreSQL",
        "bio": "Lead backend architect. Designs database schemas and high-throughput microservices.",
        "thought": "API database schemas optimized",
        "task": "Standby for sprint project assignment"
    },
    {
        "id": "EMP-006",
        "name": "Karan Verma",
        "role": "Senior Python & API Dev",
        "dept": "backend",
        "room_id": "room_backend",
        "avatar": "⚙️",
        "status": "idle",
        "desk_x": 200, "desk_y": 280,
        "x": 200, "y": 280,
        "ip": "192.168.18.106",
        "hostname": "be-python.corp.local",
        "specialty": "FastAPI, Flask, Celery & Background Workers",
        "bio": "Builds high-performance Python services. Writes async background workers.",
        "thought": "IDE ready, unit test suite prepared",
        "task": "Waiting for backend task assignment"
    },
    {
        "id": "EMP-007",
        "name": "Saanvi Mehta",
        "role": "Database Administrator (DBA)",
        "dept": "backend",
        "room_id": "room_backend",
        "avatar": "🗄️",
        "status": "idle",
        "desk_x": 340, "desk_y": 280,
        "x": 340, "y": 280,
        "ip": "192.168.18.107",
        "hostname": "be-mariadb.corp.local",
        "specialty": "MariaDB, Redis Caching & Query Optimization",
        "bio": "Specialized in relational database replication, connection pools, and Redis caching.",
        "thought": "MariaDB connection pool configured with 25 slots",
        "task": "Validating database indexing and query latency"
    },

    # 4. Frontend Studio
    {
        "id": "EMP-008",
        "name": "Sneha Gupta",
        "role": "Frontend Architecture Lead",
        "dept": "frontend",
        "room_id": "room_frontend",
        "avatar": "👩‍💻",
        "status": "idle",
        "desk_x": 600, "desk_y": 280,
        "x": 600, "y": 280,
        "ip": "192.168.18.108",
        "hostname": "fe-lead.corp.local",
        "specialty": "React Architecture, CSS Design Systems & State",
        "bio": "Lead frontend engineer. Builds modern, responsive UI applications.",
        "thought": "Figma wireframes aligned with client spec",
        "task": "Preparing web components and chart widgets"
    },
    {
        "id": "EMP-009",
        "name": "Aarav Gupta",
        "role": "UI & Realtime Data Dev",
        "dept": "frontend",
        "room_id": "room_frontend",
        "avatar": "💻",
        "status": "idle",
        "desk_x": 750, "desk_y": 280,
        "x": 750, "y": 280,
        "ip": "192.168.18.109",
        "hostname": "fe-react.corp.local",
        "specialty": "WebSocket Streams, Canvas & Telemetry Dashboards",
        "bio": "Connects browser clients to live backend streaming events.",
        "thought": "WebSocket connection listener initialized",
        "task": "Connecting frontend telemetry gauges to backend"
    },

    # 5. DevOps War Room
    {
        "id": "EMP-010",
        "name": "Arjun Nair",
        "role": "DevOps & Cloud Lead",
        "dept": "devops",
        "room_id": "room_devops",
        "avatar": "🧑‍🚀",
        "status": "idle",
        "desk_x": 80, "desk_y": 500,
        "x": 80, "y": 500,
        "ip": "192.168.18.110",
        "hostname": "ops-lead.corp.local",
        "specialty": "CI/CD Pipelines, Docker/Podman & Systemd",
        "bio": "DevOps lead. Builds automated deployment pipelines and Linux systemd services.",
        "thought": "Container runtime and systemd daemons ready",
        "task": "Reviewing build runners and deployment scripts"
    },
    {
        "id": "EMP-011",
        "name": "Vijay Sen",
        "role": "Site Reliability Engineer (SRE)",
        "dept": "devops",
        "room_id": "room_devops",
        "avatar": "🚀",
        "status": "idle",
        "desk_x": 200, "desk_y": 500,
        "x": 200, "y": 500,
        "ip": "192.168.18.111",
        "hostname": "ops-sre.corp.local",
        "specialty": "Logrotate, Disk Quotas, Umask & Permissions",
        "bio": "SRE focused on system resilience, disk quota management, and log rotation policies.",
        "thought": "Monitoring /var/log storage consumption",
        "task": "Checking logrotate configuration policies"
    },
    {
        "id": "EMP-012",
        "name": "Jyoti Das",
        "role": "Infrastructure Automation Eng",
        "dept": "devops",
        "room_id": "room_devops",
        "avatar": "👩‍🔧",
        "status": "idle",
        "desk_x": 340, "desk_y": 500,
        "x": 340, "y": 500,
        "ip": "192.168.18.112",
        "hostname": "ops-infra.corp.local",
        "specialty": "Nginx Reverse Proxy, SSL & Security Sandboxing",
        "bio": "Configures web servers, SSL termination, and security boundaries.",
        "thought": "Nginx reverse proxy upstream config checked",
        "task": "Validating port routing and process isolation"
    },

    # 6. QA & Security Lab
    {
        "id": "EMP-013",
        "name": "Ananya Sen",
        "role": "QA & Test Automation Lead",
        "dept": "qa",
        "room_id": "room_qa",
        "avatar": "👩‍🔬",
        "status": "idle",
        "desk_x": 600, "desk_y": 500,
        "x": 600, "y": 500,
        "ip": "192.168.18.113",
        "hostname": "qa-lead.corp.local",
        "specialty": "Automated Test Suites, Pytest & End-to-End Testing",
        "bio": "Leads automated quality assurance. Validates API contracts and integration tests.",
        "thought": "Test automation suites ready for execution",
        "task": "Preparing test coverage reports and assertions"
    },
    {
        "id": "EMP-014",
        "name": "Hamza Chauhan",
        "role": "Security & Stress Testing Eng",
        "dept": "qa",
        "room_id": "room_qa",
        "avatar": "🧪",
        "status": "idle",
        "desk_x": 750, "desk_y": 500,
        "x": 750, "y": 500,
        "ip": "192.168.18.114",
        "hostname": "qa-sec.corp.local",
        "specialty": "500-Thread Concurrency, Port Scans & Penetration Testing",
        "bio": "Runs intense load stress tests and port scanning to ensure zero production crashes.",
        "thought": "Stress test runners idle, ready for load simulation",
        "task": "Auditing open listening ports and security boundaries"
    },

    # 7. Admin Deck Liaison
    {
        "id": "EMP-015",
        "name": "Kavita Das",
        "role": "Senior SysAdmin Liaison",
        "dept": "support",
        "room_id": "room_admin",
        "avatar": "👩‍💻",
        "status": "idle",
        "desk_x": 580, "desk_y": 90,
        "x": 580, "y": 90,
        "ip": "192.168.18.115",
        "hostname": "admin-liaison.corp.local",
        "specialty": "Incident Triage & Admin Telemetry",
        "bio": "Liaison officer between engineering pods and Chief Linux Admin Farman.",
        "thought": "All 16 workstations connected to management bus",
        "task": "Triaging system alerts for Chief Admin Farman"
    },
    {
        "id": "EMP-016",
        "name": "Farman (You)",
        "role": "👑 Chief Linux Architect & Root Admin",
        "dept": "admin",
        "room_id": "room_admin",
        "avatar": "🛡️",
        "status": "working",
        "desk_x": 680, "desk_y": 90,
        "x": 680, "y": 90,
        "ip": "192.168.18.131",
        "hostname": "dialer-server.corp.local",
        "specialty": "Root Access, Kernel Management & High-Availability Operations",
        "bio": "The master administrator. Solves all infrastructure blockers and oversees company projects.",
        "thought": "Root console active. Monitoring virtual office infrastructure.",
        "task": "Chief Linux Administrator - Root Authority"
    }
]

DEPARTMENTS = {
    "management": {"name": "Executive Strategy", "color": "#6366f1", "icon": "👔"},
    "network": {"name": "Network & NOC", "color": "#06b6d4", "icon": "🌐"},
    "backend": {"name": "Backend & Database", "color": "#3b82f6", "icon": "⚙️"},
    "frontend": {"name": "Frontend & UI/UX", "color": "#8b5cf6", "icon": "💻"},
    "devops": {"name": "DevOps & Cloud SRE", "color": "#ef4444", "icon": "🚀"},
    "qa": {"name": "QA & Stress Testing", "color": "#14b8a6", "icon": "🧪"},
    "support": {"name": "SysAdmin Liaison", "color": "#10b981", "icon": "📊"},
    "admin": {"name": "Chief Linux Architect", "color": "#f59e0b", "icon": "🛡️"}
}

class OfficeState:
    def __init__(self):
        self.employees = [dict(c) for c in CORE_CHARACTERS]
        for e in self.employees:
            e["vdi_active"] = False
        self.emp_map = {e["id"]: e for e in self.employees}
        self.rooms = ROOMS

    def get_all(self):
        return self.employees

    def get(self, emp_id):
        return self.emp_map.get(emp_id)

    def set_status(self, emp_id, status, task=None, thought=None):
        emp = self.emp_map.get(emp_id)
        if not emp:
            return
        emp["status"] = status
        if task:
            emp["task"] = task
        if thought:
            emp["thought"] = thought

        # Location dynamics based on status
        if status == "meeting":
            # Move towards Boardroom table
            emp["x"] = 125 + (len(emp["name"]) % 5 * 15) - 30
            emp["y"] = 95 + (len(emp["id"]) % 4 * 12) - 20
        elif status == "idle":
            emp["x"] = emp["desk_x"]
            emp["y"] = emp["desk_y"]
        elif status == "coffee":
            emp["x"] = 820 + (len(emp["id"]) % 4 * 20)
            emp["y"] = 85 + (len(emp["name"]) % 3 * 20)
            emp["thought"] = "Recharging with espresso in cyber lounge ☕"
        elif status == "working":
            emp["x"] = emp["desk_x"]
            emp["y"] = emp["desk_y"]
        elif status == "blocked":
            emp["x"] = emp["desk_x"]
            emp["y"] = emp["desk_y"]
            emp["thought"] = "BLOCKED! Incident raised for Chief Linux Admin Farman!"

    def get_stats(self):
        total = len(self.employees)
        working = sum(1 for e in self.employees if e["status"] == "working")
        blocked = sum(1 for e in self.employees if e["status"] == "blocked")
        idle = sum(1 for e in self.employees if e["status"] == "idle")
        meeting = sum(1 for e in self.employees if e["status"] == "meeting")
        productivity = round((working / total) * 100) if total else 0
        return {
            "total": total,
            "working": working,
            "blocked": blocked,
            "idle": idle,
            "meeting": meeting,
            "productivity": productivity
        }
