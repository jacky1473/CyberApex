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
    },
    {
        "title": "AI Analytics & Real-Time Telemetry Pipeline",
        "description": "Deploy Apache Kafka stream processing cluster, Prometheus monitoring agents, and Grafana operations dashboard.",
        "tech_stack": ["Kafka", "Prometheus", "Grafana", "Python", "Docker", "Systemd"],
        "est_seconds": 120
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
        self.current_active_phase = 2

    def create_project_from_client(self, title, description, client_name="Farman (Client)"):
        project_id = f"PRJ-{int(time.time())}"
        self.start_timestamp = time.time()
        self.eta_seconds = 120 # ~2 minutes of active simulated development
        self.current_active_phase = 2

        tasks = []
        task_id = 1
        departments = ["network", "backend", "frontend", "devops", "qa", "support"]
        
        dept_task_templates = {
            "network": [
                ("Configure SIP Trunking & UDP 5060 Network Routing", 2),
                ("Mount Remote NFS Recording Storage from 192.168.18.20", 2),
                ("Audit sandbox virtual subnet 192.168.18.0/24 and isolated DNS resolver", 2)
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
            "current_phase": PHASES[1], # Start at Phase 2 (index 1)
            "current_phase_index": 1,
            "current_custodian": "Rohan Mehta (Network Lead) in [NOC Room]",
            "current_room": "room_noc",
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
            text=f"📢 **CLIENT ORDER SUBMITTED:** Project **'{title}'**.\nRequirements: {description}.\nVikram Sharma, mobilize the team and provide live delivery updates!"
        )

        self.chat.add_message(
            sender_id="EMP-001",
            sender_name="Vikram Sharma",
            role="General Manager",
            dept="management",
            avatar="👨‍💼",
            text=f"Understood Farman! I have accepted project **'{title}'**. Leads: Rohan (NOC), Rahul (Backend), Sneha (Frontend), and Arjun (DevOps) - sprint kickoff in Boardroom!"
        )

        # Start phase 2 tasks immediately
        self.activate_phase_tasks(2)

        return self.current_project

    def activate_phase_tasks(self, phase_num):
        self.current_active_phase = phase_num
        activated = 0
        for t in self.tasks:
            if t["phase"] == phase_num and t["status"] == "pending":
                t["status"] = "working"
                self.office.set_status(t["assignee_id"], "working", t["title"])
                activated += 1
        return activated

    def tick(self):
        if not self.is_active or not self.current_project or self.current_project["status"] != "in_progress":
            return

        # Check which employees have open blocker tickets
        open_tickets = self.incident.get_open_tickets()
        blocked_emp_ids = {t["emp_id"] for t in open_tickets}
        is_blocked = len(open_tickets) > 0

        self.current_project["is_delayed"] = is_blocked
        if is_blocked:
            first_t = open_tickets[0]
            self.current_project["delay_reason"] = f"⚠️ TICKET OPEN: {first_t['emp_name']} ({first_t['id']}: {first_t['title']}) awaiting SysAdmin resolution!"
        else:
            self.current_project["delay_reason"] = None

        active_tasks = [t for t in self.tasks if t["status"] == "working"]

        # If no tasks are currently working in this phase, check if we need to activate next phase
        if not active_tasks:
            self._evaluate_phase_transition()
            active_tasks = [t for t in self.tasks if t["status"] == "working"]
            if not active_tasks:
                return

        # Advance active tasks with Enterprise AI Agent SOP Protocol
        all_working_are_blocked = True
        for t in active_tasks:
            # If this specific employee is blocked by a ticket, pause their task
            if t["assignee_id"] in blocked_emp_ids:
                continue

            all_working_are_blocked = False
            emp = self.office.get(t["assignee_id"])
            if emp:
                if emp["status"] == "blocked" or not emp.get("lan_connected", True):
                    continue

            # Progress step
            t["progress"] += random.randint(12, 22)
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
                if t not in self.completed_tasks:
                    self.completed_tasks.append(t)
                self.office.set_status(t["assignee_id"], "idle", "Task finished, awaiting next milestone")

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

        # Decrement ETA countdown if not completely deadlocked
        if not all_working_are_blocked:
            if self.eta_seconds > 5:
                self.eta_seconds -= 2
            self.current_project["eta_seconds"] = self.eta_seconds

        # Update Project Progress percentage
        done_cnt = len(self.completed_tasks)
        tot_cnt = len(self.tasks)
        pct = round((done_cnt / tot_cnt) * 100) if tot_cnt > 0 else 0
        self.current_project["completed_tasks"] = done_cnt
        self.current_project["progress_percent"] = pct

        # Check phase transitions
        self._evaluate_phase_transition()

    def _evaluate_phase_transition(self):
        """Deterministically transitions between phases when all phase tasks are completed"""
        if not self.current_project or self.current_project["status"] != "in_progress":
            return

        # Check Phase 2 (Network)
        p2_tasks = [t for t in self.tasks if t["phase"] == 2]
        p2_done = all(t["status"] == "completed" for t in p2_tasks)

        # Check Phase 3 (Backend)
        p3_tasks = [t for t in self.tasks if t["phase"] == 3]
        p3_done = all(t["status"] == "completed" for t in p3_tasks)

        # Check Phase 4 (Frontend)
        p4_tasks = [t for t in self.tasks if t["phase"] == 4]
        p4_done = all(t["status"] == "completed" for t in p4_tasks)

        # Check Phase 5 (DevOps & QA)
        p5_tasks = [t for t in self.tasks if t["phase"] == 5]
        p5_done = all(t["status"] == "completed" for t in p5_tasks)

        # Check Phase 6 (Final Packaging)
        p6_tasks = [t for t in self.tasks if t["phase"] == 6]
        p6_done = all(t["status"] == "completed" for t in p6_tasks)

        if not p2_done:
            self._set_phase(1, "Rohan Mehta (Network Lead) in [NOC Room]", "room_noc")
            self.activate_phase_tasks(2)
        elif not p3_done:
            if self.current_active_phase < 3:
                self.chat.add_message(
                    sender_id="EMP-003",
                    sender_name="Rohan Mehta",
                    role="Network Lead",
                    dept="network",
                    avatar="🌐",
                    text="✅ **PHASE 2 COMPLETE:** Subnets, SIP routes & NFS storage verified! Handing over custodian keys to Rahul Verma in Backend Bay."
                )
            self._set_phase(2, "Rahul Verma (Backend Lead) in [Backend Engineering Bay]", "room_backend")
            self.activate_phase_tasks(3)
        elif not p4_done:
            if self.current_active_phase < 4:
                self.chat.add_message(
                    sender_id="EMP-005",
                    sender_name="Rahul Verma",
                    role="Backend Lead",
                    dept="backend",
                    avatar="⚙️",
                    text="✅ **PHASE 3 COMPLETE:** Microservices, schemas & Redis brokers operational! Handing over to Sneha Gupta in Frontend Studio."
                )
            self._set_phase(3, "Sneha Gupta (Frontend Lead) in [Frontend & UI Studio]", "room_frontend")
            self.activate_phase_tasks(4)
        elif not p5_done:
            if self.current_active_phase < 5:
                self.chat.add_message(
                    sender_id="EMP-008",
                    sender_name="Sneha Gupta",
                    role="Frontend Lead",
                    dept="frontend",
                    avatar="💻",
                    text="✅ **PHASE 4 COMPLETE:** Dashboards, WebSocket streams & client UI verified! Handing over to Arjun Nair & Ananya Sen in DevOps/QA."
                )
            self._set_phase(4, "Arjun Nair (DevOps Lead) & Ananya Sen (QA Lead)", "room_devops")
            self.activate_phase_tasks(5)
        elif not p6_done:
            if self.current_active_phase < 6:
                self.chat.add_message(
                    sender_id="EMP-010",
                    sender_name="Arjun Nair",
                    role="DevOps Lead",
                    dept="devops",
                    avatar="🚀",
                    text="✅ **PHASE 5 COMPLETE:** 500-thread stress tests passed (0 assert failures) & systemd unit files packaged! Handing over to GM Vikram Sharma."
                )
            self._set_phase(5, "Vikram Sharma (General Manager) in [Executive Boardroom]", "room_mgmt")
            self.activate_phase_tasks(6)
        else:
            # ALL PHASES COMPLETED! 100% COMPLETE!
            self._complete_project()

    def _set_phase(self, phase_idx, custodian, room):
        self.current_project["current_phase_index"] = phase_idx
        self.current_project["current_phase"] = PHASES[phase_idx]
        self.current_project["current_custodian"] = custodian
        self.current_project["current_room"] = room

    def _complete_project(self):
        if self.current_project["status"] == "completed":
            return

        self.current_project["status"] = "completed"
        self.current_project["progress_percent"] = 100
        self.current_project["completed_tasks"] = len(self.tasks)
        self.current_project["eta_seconds"] = 0
        self.current_project["is_delayed"] = False
        self.current_project["delay_reason"] = None
        self.is_active = False

        tot_cnt = len(self.tasks)
        self.current_project["delivery_package"] = {
            "delivered_at": time.strftime("%H:%M:%S"),
            "recipient": self.current_project["client_name"],
            "deliverables": [
                f"Full Production Source Code & Enterprise Build Package ({self.current_project['title']})",
                "NFS Storage & Directory Mount Configuration on 192.168.18.20",
                "MariaDB / PostgreSQL Database Migration Scripts & Seed Data",
                "Nginx Reverse Proxy, WebSocket Listeners & SSL Configuration Files",
                "Hardened Systemd Service Units (Auto-restart on failure, umask 027)",
                "Automated QA Regression Suite: 100% Passed (Stress tested with 500 concurrent threads)"
            ],
            "incidents_resolved_by_admin": self.incident.resolved_count,
            "client_rating": 5
        }

        self.office.set_status("EMP-001", "idle", f"Project '{self.current_project['title']}' delivered to Client Farman!")
        self.chat.add_message(
            sender_id="EMP-001",
            sender_name="Vikram Sharma",
            role="General Manager",
            dept="management",
            avatar="👨‍💼",
            text=f"🎉🎉 **PROJECT DELIVERED TO CLIENT FARMAN!**\nFarman, we have successfully finished all {tot_cnt} tasks across all 6 phases for **'{self.current_project['title']}'**! All enterprise tests passed. Please sign off on the deliverable package in the **Client Project Portal** to claim your 5-star contract!"
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
