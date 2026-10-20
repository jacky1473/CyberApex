"""
Client Project Manager: User acts as Client, gives projects to Manager (EMP-001)
Tracks project phases, current custodian/in-charge, live delivery ETA countdown, and handover
"""

import time
import random

PRESET_PROJECTS = [
    {
        "title": "Enterprise Asterisk Call Center with NFS Dialing Storage",
        "description": "Deploy Asterisk VoIP PBX with NFS audio recording storage on 192.168.18.20, SIP trunks, call queue engine, and agent dashboard.",
        "tech_stack": ["Asterisk 18", "NFS Storage", "Rocky Linux", "MariaDB", "Python/Flask", "SIP"],
        "est_seconds": 120
    },
    {
        "title": "High-Availability E-Commerce Microservices Platform",
        "description": "Build modern e-commerce platform with product catalog, cart microservices, Redis caching, and Nginx reverse proxy.",
        "tech_stack": ["Python", "Nginx", "Redis", "PostgreSQL", "Docker", "REST API"],
        "est_seconds": 130
    },
    {
        "title": "Corporate Zero-Trust Network & Firewall Hardening",
        "description": "Audit and harden all internal servers with Firewalld, fail2ban, SSH key policies, and isolated VLAN routing.",
        "tech_stack": ["Firewalld", "iptables", "OpenSSH", "Rocky Linux", "Syslog", "Fail2ban"],
        "est_seconds": 110
    }
]

PHASES = [
    {
        "num": 1,
        "name": "Phase 1: Architecture Planning & SLA Review",
        "owner": "Vikram Sharma (General Manager)",
        "room": "Executive Boardroom",
        "dept": "management",
        "desc": "Deconstructing client requirements into technical specifications."
    },
    {
        "num": 2,
        "name": "Phase 2: Network & NFS Storage Infrastructure",
        "owner": "Rohan Mehta (Network Lead)",
        "room": "NOC Room",
        "dept": "network",
        "desc": "Allocating subnets, configuring firewalls, and mounting remote storage."
    },
    {
        "num": 3,
        "name": "Phase 3: Core Backend & Database Implementation",
        "owner": "Rahul Verma (Backend Lead)",
        "room": "Backend Engineering Bay",
        "dept": "backend",
        "desc": "Developing microservices, database schemas, and API routes."
    },
    {
        "num": 4,
        "name": "Phase 4: Frontend UI & Client Dashboard",
        "owner": "Sneha Gupta (Frontend Lead)",
        "room": "Frontend & UI Studio",
        "dept": "frontend",
        "desc": "Connecting visual dashboards, live telemetry charts, and forms."
    },
    {
        "num": 5,
        "name": "Phase 5: DevOps Automation & QA Stress Testing",
        "owner": "Arjun Nair & Ananya Sen",
        "room": "DevOps War Room & QA Bay",
        "dept": "devops",
        "desc": "Containerizing services, running load tests, and security hardening."
    },
    {
        "num": 6,
        "name": "Phase 6: Final Packaging & Delivery to Client Farman",
        "owner": "Vikram Sharma (General Manager)",
        "room": "Executive Boardroom",
        "dept": "management",
        "desc": "Generating signoff report and handing over deployment keys to Farman."
    }
]

AGENT_RULES = [
    {
        "id": "RULE-01",
        "title": "Strict Zero-Loss & Non-Destructive Operations",
        "desc": "Agents must verify system state and never execute unvalidated destructive commands without automated dry-run."
    },
    {
        "id": "RULE-02",
        "title": "Least Privilege Security Enforcement",
        "desc": "Daemons and IPC sockets must run under non-root service accounts with secure octal permissions (e.g. 775/600)."
    },
    {
        "id": "RULE-03",
        "title": "Automated Smoke & Regression Testing",
        "desc": "Every implementation task must execute regression tests with 0 assertion failures before requesting merge."
    },
    {
        "id": "RULE-04",
        "title": "Immediate Escalation on SysAdmin Blocker",
        "desc": "If host resources or systemd units fail, pause task execution immediately and dispatch incident ticket to Linux Admin Farman."
    },
    {
        "id": "RULE-05",
        "title": "Mandatory Structured Progress Reporting",
        "desc": "Post formal milestone completion report to General Manager Vikram Sharma and Client Farman upon signoff."
    }
]

SOP_STEPS = [
    {"step": 1, "name": "Spec & Rule Compliance Audit", "desc": "Validating architecture parameters against enterprise rules"},
    {"step": 2, "name": "Technical Execution & Output Build", "desc": "Compiling source files, configuring services, and running scripts"},
    {"step": 3, "name": "Verification & Peer Review Signoff", "desc": "Running automated test suites and security boundary audits"},
    {"step": 4, "name": "Formal Milestone Delivery Report", "desc": "Generating signed deliverable report with artifact hashes"}
]

class ClientProjectManager:
    def __init__(self, office_state, chat_engine, incident_engine):
        self.office = office_state
        self.chat = chat_engine
        self.incident = incident_engine
        self.current_project = None
        self.tasks = []
        self.completed_tasks = []
        self.agent_reports = []
        self.is_active = False
        self.eta_seconds = 0
        self.start_timestamp = 0

    def create_project_from_client(self, title, description, client_name="Farman (Client)"):
        project_id = f"PRJ-{int(time.time())}"
        self.start_timestamp = time.time()
        self.eta_seconds = 120 # ~2 minutes of active simulated development

        tasks = []
        task_id = 1
        departments = ["network", "backend", "frontend", "devops", "qa", "support"]
        
        dept_task_templates = {
            "network": [
                ("Configure SIP Trunking & UDP 5060 Network Routing", 2),
                ("Mount Remote NFS Recording Storage from 192.168.18.20", 2),
                ("Audit Subnet 192.168.18.0/24 routes and DNS resolv.conf", 2)
            ],
            "backend": [
                ("Initialize MariaDB / PostgreSQL schema and connection pool", 3),
                ("Implement REST API endpoints and authentication middleware", 3),
                ("Build asynchronous Redis message broker and queue workers", 3),
                ("Integrate business logic service handlers", 3)
            ],
            "frontend": [
                ("Design responsive web application interface layout", 4),
                ("Connect live WebSocket real-time event listeners", 4),
                ("Build interactive operational telemetry dashboard widgets", 4)
            ],
            "devops": [
                ("Write systemd service unit files and auto-restart policy", 5),
                ("Configure logrotate and journalctl size quotas for /var/log", 5),
                ("Audit directory permissions and security sandboxing", 5)
            ],
            "qa": [
                ("Execute automated integration test suites", 5),
                ("Run high-concurrency stress test with 500 virtual threads", 5),
                ("Perform security boundary audit and port vulnerability check", 5)
            ],
            "support": [
                ("Validate production healthcheck endpoints", 5),
                ("Assemble release documentation package for Client Farman", 6)
            ]
        }

        for dept in departments:
            dept_emps = [e for e in self.office.get_all() if e["dept"] == dept]
            templates = dept_task_templates.get(dept, [])
            for t_title, phase_num in templates:
                assignee = random.choice(dept_emps) if dept_emps else None
                tasks.append({
                    "id": f"TSK-{task_id:03d}",
                    "title": t_title,
                    "dept": dept,
                    "phase": phase_num,
                    "assignee_id": assignee["id"] if assignee else "EMP-001",
                    "assignee_name": assignee["name"] if assignee else "Vikram Sharma",
                    "assignee_role": assignee["role"] if assignee else "Manager",
                    "status": "pending",
                    "progress": 0,
                    "sop_step": 1,
                    "sop_step_name": "Spec & Rule Compliance Audit",
                    "sop_status": "Validating parameters against Enterprise Rules (RULE-01 to RULE-05)",
                    "rule_audit": "100% Compliant (Pre-Flight PASS)"
                })
                task_id += 1

        self.current_project = {
            "id": project_id,
            "title": title,
            "description": description,
            "client_name": client_name,
            "started_at": time.strftime("%H:%M:%S"),
            "status": "in_progress",
            "current_phase": PHASES[0],
            "current_phase_index": 0,
            "current_custodian": "Vikram Sharma (GM) & Team Leads",
            "current_room": "Executive Boardroom",
            "total_tasks": len(tasks),
            "completed_tasks": 0,
            "progress_percent": 0,
            "eta_seconds": self.eta_seconds,
            "is_delayed": False,
            "delay_reason": None,
            "delivery_package": None
        }
        self.tasks = tasks
        self.completed_tasks = []
        self.is_active = True

        # Initial announcements
        self.office.set_status("EMP-001", "meeting", f"Briefing Leads on Client Project: {title}")
        self.office.set_status("EMP-002", "meeting", "Allocating sprint budget and milestone deliverables")

        self.chat.add_message(
            sender_id="CLIENT",
            sender_name=client_name,
            role="Client / Project Owner",
            dept="client",
            avatar="👑",
            text=f"📢 **CLIENT ORDER SUBMITTED:** Project **{title}**.\nRequirements: {description}.\nVikram Sharma, mobilize the team and provide live delivery updates!"
        )

        self.chat.add_message(
            sender_id="EMP-001",
            sender_name="Vikram Sharma",
            role="General Manager",
            dept="management",
            avatar="👨‍💼",
            text=f"Understood Farman! I have accepted project **{title}**. Leads: Rohan (NOC), Rahul (Backend), Sneha (Frontend), and Arjun (DevOps) - sprint kickoff in Boardroom!"
        )

        # Start phase 1 / 2 tasks
        self.activate_phase_tasks(2)

        return self.current_project

    def activate_phase_tasks(self, phase_num):
        for t in self.tasks:
            if t["phase"] == phase_num and t["status"] == "pending":
                t["status"] = "working"
                self.office.set_status(t["assignee_id"], "working", t["title"])

    def tick(self):
        if not self.is_active or not self.current_project:
            return

        # Check if any employee is currently blocked
        open_tickets = self.incident.get_open_tickets()
        is_blocked = len(open_tickets) > 0

        self.current_project["is_delayed"] = is_blocked
        if is_blocked:
            first_t = open_tickets[0]
            self.current_project["delay_reason"] = f"BLOCKED: {first_t['emp_name']} awaiting Linux Admin resolution on {first_t['id']} ({first_t['title']})"
            # Timer is paused when blocked!
            return
        else:
            self.current_project["delay_reason"] = None
            if self.eta_seconds > 5:
                self.eta_seconds -= 2
            self.current_project["eta_seconds"] = self.eta_seconds

        active_tasks = [t for t in self.tasks if t["status"] == "working"]

        # Advance active tasks with Enterprise AI Agent SOP Protocol
        for t in active_tasks:
            emp = self.office.get(t["assignee_id"])
            if emp and emp["status"] == "blocked":
                continue

            t["progress"] += random.randint(15, 26)
            if t["progress"] < 30:
                t["sop_step"] = 1
                t["sop_step_name"] = "Spec & Rule Compliance Audit"
                t["sop_status"] = "Validating architecture parameters against Enterprise Rulebook"
            elif t["progress"] < 70:
                t["sop_step"] = 2
                t["sop_step_name"] = "Technical Execution & Output Build"
                t["sop_status"] = "Compiling source files, configuring services & generating scripts"
            elif t["progress"] < 95:
                t["sop_step"] = 3
                t["sop_step_name"] = "Verification & Peer Review Signoff"
                t["sop_status"] = "Executing automated test suite and security regression audit"
            else:
                t["sop_step"] = 4
                t["sop_step_name"] = "Formal Milestone Delivery Report"
                t["sop_status"] = "Generating signed deliverable report with artifact hashes"

            if t["progress"] >= 100:
                t["progress"] = 100
                t["status"] = "completed"
                self.completed_tasks.append(t)
                self.office.set_status(t["assignee_id"], "idle", "Task finished, awaiting next assignment")

                # Generate Structured AI Agent Report
                report = {
                    "id": f"RPT-{len(self.agent_reports) + 101}",
                    "timestamp": time.strftime("%H:%M:%S"),
                    "agent_id": t["assignee_id"],
                    "agent_name": t["assignee_name"],
                    "agent_role": t["assignee_role"],
                    "department": t["dept"],
                    "task_id": t["id"],
                    "task_title": t["title"],
                    "phase": t["phase"],
                    "rule_compliance": [
                        "RULE-01 (Zero Downtime / Non-Destructive): VERIFIED",
                        "RULE-02 (Strict Least Privilege & Permissions): VERIFIED",
                        "RULE-03 (Automated Regression 0 Assert Failures): VERIFIED",
                        "RULE-05 (Structured Report Delivered): VERIFIED"
                    ],
                    "sop_steps_log": [
                        "Step 1: Constraint & Rule Validation - PASS",
                        "Step 2: Technical Execution & Artifact Compile - PASS",
                        "Step 3: Automated Regression & Peer Review - PASS",
                        "Step 4: Formal Milestone Delivery Handoff - PASS"
                    ],
                    "deliverable_artifact": f"{t['dept']}_{t['id'].lower()}_package.tar.gz",
                    "review_status": "APPROVED",
                    "reviewer": "Vikram Sharma (General Manager)"
                }
                self.agent_reports.insert(0, report)

                if random.random() < 0.40:
                    self.chat.add_message(
                        sender_id=t["assignee_id"],
                        sender_name=t["assignee_name"],
                        role=t["assignee_role"],
                        dept=t["dept"],
                        avatar=emp["avatar"] if emp else "🧑‍💻",
                        text=f"📋 **AGENT REPORT #{report['id']} FILED:** '{t['title']}' completed!\nRules: 100% Compliant | Artifact: `{report['deliverable_artifact']}` | Reviewed by GM Vikram."
                    )

        # Update Project Progress and Phases
        done_cnt = len(self.completed_tasks)
        tot_cnt = len(self.tasks)
        pct = round((done_cnt / tot_cnt) * 100) if tot_cnt > 0 else 0
        self.current_project["completed_tasks"] = done_cnt
        self.current_project["progress_percent"] = pct

        # Determine current phase & custodian based on progress
        if pct < 20:
            phase_idx = 1 # Network & Infra
            custodian = "Rohan Mehta (Network Lead) in [NOC Room]"
            room = "room_noc"
            self.activate_phase_tasks(2)
        elif pct < 50:
            phase_idx = 2 # Backend
            custodian = "Rahul Verma (Backend Lead) in [Backend Engineering Bay]"
            room = "room_backend"
            self.activate_phase_tasks(3)
        elif pct < 75:
            phase_idx = 3 # Frontend
            custodian = "Sneha Gupta (Frontend Lead) in [Frontend & UI Studio]"
            room = "room_frontend"
            self.activate_phase_tasks(4)
        elif pct < 95:
            phase_idx = 4 # DevOps & QA
            custodian = "Arjun Nair (DevOps Lead) & Ananya Sen (QA Lead)"
            room = "room_devops"
            self.activate_phase_tasks(5)
        else:
            phase_idx = 5 # Final Packaging
            custodian = "Vikram Sharma (General Manager) in [Executive Boardroom]"
            room = "room_mgmt"
            self.activate_phase_tasks(6)

        self.current_project["current_phase_index"] = phase_idx
        self.current_project["current_phase"] = PHASES[phase_idx]
        self.current_project["current_custodian"] = custodian
        self.current_project["current_room"] = room

        # Project Completion Handover
        if pct >= 100 and self.current_project["status"] == "in_progress":
            self.current_project["status"] = "completed"
            self.current_project["eta_seconds"] = 0
            self.is_active = False
            
            # Prepare Delivery Package
            self.current_project["delivery_package"] = {
                "delivered_at": time.strftime("%H:%M:%S"),
                "recipient": self.current_project["client_name"],
                "deliverables": [
                    "Full Production Source Code & Git Repository Repository",
                    "NFS Storage & Directory Mount Configuration on 192.168.18.20",
                    "MariaDB Database Migration Scripts & Seed Data",
                    "Nginx Reverse Proxy & SSL Configuration Files",
                    "Systemd Auto-Start Service Configuration (virtual-office.service)",
                    "Automated Test Report: 100% Passed (Stress tested with 500 concurrent threads)"
                ],
                "incidents_resolved_by_admin": self.incident.resolved_count,
                "client_rating": 5
            }

            self.office.set_status("EMP-001", "idle", "Project delivered to Client Farman!")
            self.chat.add_message(
                sender_id="EMP-001",
                sender_name="Vikram Sharma",
                role="General Manager",
                dept="management",
                avatar="👨‍💼",
                text=f"🎉 **PROJECT DELIVERED TO CLIENT FARMAN!**\nFarman, we have completed all {tot_cnt} tasks for **'{self.current_project['title']}'**! All services tested and ready for production handover. Please review and sign off in the **Client Project Portal**."
            )

    def get_project_state(self):
        return {
            "project": self.current_project,
            "tasks": self.tasks,
            "phases": PHASES,
            "agent_rules": AGENT_RULES,
            "sop_steps": SOP_STEPS,
            "agent_reports": self.agent_reports[:30],
            "completed_count": len(self.completed_tasks),
            "is_active": self.is_active
        }
