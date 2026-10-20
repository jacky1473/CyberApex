# 🏢 CyberApex — 3D Virtual Office & Autonomous AI Agent Linux Admin Simulator

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Apache](https://img.shields.io/badge/Server-Apache%20HTTPD%20%2B%20mod__wsgi-red.svg)](https://httpd.apache.org/)
[![Three.js](https://img.shields.io/badge/Frontend-Three.js%20WebGL-black.svg)](https://threejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Rocky%20Linux%20%2F%20RHEL-green.svg)](https://rockylinux.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**CyberApex** is an interactive **3D WebGL Virtual Office RPG** and **Autonomous AI Agent Enterprise Simulator**. In this simulation, an enterprise team of **15 autonomous AI specialists** (Engineering Managers, Tech Leads, Network Engineers, Full-Stack Developers, QA Leads, NOC Operators) collaborate in real-time within an isometric virtual 3D office floor.

You take on a dual role:
1. **Client:** Issue real engineering projects, software goals, and feature deliverables to the Management team.
2. **Chief Linux Architect & System Administrator:** Resolve system-level failures, network drops, permission errors, and service crashes that agents encounter while building your projects.

---

## 📸 Live Demo & Screenshots

| 🎮 3D WebGL Operations Floor | 📊 Executive Dashboard & Ticketing |
| :---: | :---: |
| ![3D Office Floor Preview](docs/images/office_3d_floor.png) | ![Incident Console Preview](docs/images/admin_console.png) |

> *Tip: Experience real-time WebGL rendering, orbit camera controls, department zoom presets, and interactive raycasting to inspect any workstation on the floor.*

---

## 🌟 Key Features

### 🎮 1. 3D WebGL Office Floor (Three.js)
- **Interactive 3D Workspace:** Isometric 3D view of 8 specialized cabins (Boardroom, NOC Room, DevOps War Room, Backend Bay, Frontend Studio, QA Lab, Cyber Lounge, Linux Command Deck).
- **Orbit & Preset Controls:** Full 360° orbit rotation, pan, zoom, and instant camera presets for each department.
- **Agent Raycasting:** Click on any 3D animated agent to open their live dossier, workstation details, current tasks, and remote shell.

### 🤖 2. Autonomous Multi-Agent Hierarchy & SOP Protocol
- **Specialized Workforce:** 15 distinct bot agents across Leadership, Infra, Network, QA, and Development.
- **4-Step SOP Execution:** Agents follow strict Standard Operating Procedures:
  1. *Requirement & Architecture Analysis*
  2. *Development & Provisioning*
  3. *Testing & Quality Assurance*
  4. *Production Deployment & Sign-off*
- **Enterprise Rules:** Zero-loss guarantees, non-destructive operation validation, and least privilege security.

### 🎫 3. Dynamic IT Helpdesk & Incident Generator
- Real-world Linux engineering issues trigger organically during agent tasks (e.g., MySQL socket lock, port conflicts, disk space exhaustion, DNS misconfigurations, rogue worker processes).
- Tickets include error traces, affected agent, workstation IP, and priority levels.

### 💻 4. Live Web Terminal & On-Demand Sandbox
- Isolated web terminal for each workstation IP (`192.168.18.101` – `192.168.18.115`).
- Runs real Linux commands on host or sandbox environments.
- **Resource Optimization:** Sandbox sessions dynamically spawn when troubleshooting starts and spin down when the ticket is marked resolved to conserve host resources.

### 💬 5. Admin Remark & Verification Loop
- When resolving an incident, the Linux Admin enters technical remarks and resolution details.
- The reporting agent verifies the environment fix, replies to the admin's remarks, and resumes their workflow.

### 🌐 6. Native Apache HTTPD & Multi-IP Network Virtualization
- Deployed on **Apache `httpd` with `mod_wsgi`** on standard HTTP port 80.
- All 15 specialist workstations are bound as persistent secondary IP aliases on the physical interface (`ens160`) via a systemd unit (`virtual-office-network.service`), making them pingable and network-accessible.

---

## 🏗️ System Architecture

```mermaid
graph TD
    User["👑 User (Client & Chief Linux Admin)"]
    
    subgraph WebInterface ["🌐 CyberApex 3D Web Interface (Apache HTTPD :80)"]
        ThreeJS["🎮 3D WebGL Three.js Engine"]
        Dash["📊 Executive Dashboard & Live Feed"]
        TicketBoard["🎫 IT Incident Management Desk"]
        WebShell["💻 Interactive Workstation Terminal"]
    end

    subgraph CoreEngine ["⚙️ Python Core Engine (/opt/virtual-office)"]
        WSGI["mod_wsgi Application Handler"]
        Office["office.py (Org Hierarchy & Agent State)"]
        ProjMgr["project_manager.py (Task & Milestone Pipeline)"]
        Incidents["incident_engine.py (Fault Injection & Ticket Engine)"]
        Chat["chat_engine.py (Inter-Agent Dialogue)"]
    end

    subgraph NetworkStack ["🔌 Linux Network & Systemd Layer"]
        KernelNet["ens160 Interface (192.168.18.101 - 192.168.18.115)"]
        NetService["virtual-office-network.service"]
    end

    User -->|Project Specs / Terminal Fixes| WebInterface
    WebInterface <-->|REST API| CoreEngine
    CoreEngine --> NetworkStack
```

---

## 🛠️ Sample Linux Incidents & Troubleshooting Scenarios

CyberApex generates realistic Linux administration challenges during agent workflows. Below are typical enterprise failure scenarios and the recommended Linux troubleshooting toolchains:

| Scenario / Incident | Root Cause Description | Affected Area | Target Linux Diagnostic & Remediation Tools |
| :--- | :--- | :--- | :--- |
| **Disk & Inode Exhaustion** | Unchecked build artifacts or rogue logs consuming root filesystem inodes or disk space. | Storage / Root FS | `df -h`, `df -i`, `du -sh /var/log/*`, `find / -type f -size +100M -exec ls -lh {} +` |
| **SELinux Context & Port Lock** | Apache or WSGI blocked from binding sockets or reading application templates due to invalid context. | Security / SELinux | `journalctl -xe`, `audit2why -a`, `restorecon -Rv /opt/virtual-office`, `setsebool -P httpd_can_network_connect 1` |
| **Rogue Process CPU Spike** | Runaway background worker script looping infinitely and exhausting available CPU cycles. | Compute / Process | `top`, `ps aux --sort=-%cpu | head -10`, `lsof -p <PID>`, `strace -p <PID>`, `kill -15 <PID>` |
| **Database Socket Collision** | Stale PID or abandoned socket file preventing database service daemon from launching. | Services / MySQL | `systemctl status mariadb`, `lsof /var/lib/mysql/mysql.sock`, `fuser -v /var/lib/mysql/mysql.sock`, `rm -f /var/lib/mysql/mysql.sock.lock` |
| **Faulty Systemd Unit File** | Typo or missing dependency trigger in an enterprise service unit causing crash-loop status. | Systemd / Init | `systemctl status <unit>`, `journalctl -u <unit> -b -e --no-pager`, `systemd-analyze verify`, `systemctl daemon-reload` |
| **Secondary IP Alias Drop** | Workstation IP unreachable over LAN because kernel network alias unbinds after adapter reset. | Networking / ARP | `ip -br addr show ens160`, `arping -I ens160 <IP>`, `ip route show`, `systemctl restart virtual-office-network.service` |

---

## 📂 Project Structure

```
/opt/virtual-office/
├── app.py                      # Flask Application entry point & API endpoints
├── virtual_office.wsgi         # Apache mod_wsgi gateway script
├── LICENSE                     # MIT License
├── README.md                   # Project documentation
├── engine/
│   ├── __init__.py
│   ├── office.py               # Enterprise organization, agent specs & states
│   ├── project_manager.py      # Project lifecycles, milestones, & SOP engine
│   ├── incident_engine.py      # Real & simulated system incident generator
│   └── chat_engine.py          # Multi-agent chat & dialogue simulation
├── sandbox/
│   └── rogue_worker.py         # Sandbox test processes for incident simulation
├── static/
│   ├── css/
│   │   └── office.css          # Futuristic glassmorphism UI styles
│   └── js/
│       ├── office3d.js         # Three.js 3D scene, models, lights, controls
│       └── app.js              # Live polling, ticketing, terminal & UI logic
├── templates/
│   └── index.html              # Main CyberApex 3D Dashboard template
└── deploy/
    ├── apache/
    │   └── virtual-office.conf # Apache VirtualHost & mod_wsgi configuration
    ├── systemd/
    │   └── virtual-office-network.service # Network IP persistence service
    └── scripts/
        └── virtual-office-network.sh      # Secondary IP binding script
```

---

## 🚀 Quick Setup & Deployment (RHEL / Rocky Linux)

Follow these steps for an enterprise-ready deployment on **Rocky Linux 8/9, RHEL, CentOS Stream, or Fedora**.

### 1. Repository Installation & Python Virtual Environment
```bash
# Clone the repository
git clone https://github.com/jacky1473/CyberApex.git /opt/virtual-office
cd /opt/virtual-office

# Create and activate Python Virtual Environment
python3 -m venv venv
source venv/bin/activate

# Install required dependencies
pip install --upgrade pip
pip install flask
```

### 2. Multi-IP Network Virtualization Service
```bash
# Deploy persistent systemd secondary IP binding service
cp deploy/systemd/virtual-office-network.service /etc/systemd/system/
cp deploy/scripts/virtual-office-network.sh /usr/local/sbin/
chmod +x /usr/local/sbin/virtual-office-network.sh

# Reload systemd and start the service
systemctl daemon-reload
systemctl enable --now virtual-office-network.service

# Verify all 15 IPs are bound
ip -br addr show ens160
```

### 3. SELinux & Firewall Security Configuration
```bash
# Configure standard Apache ownership and permissions
chown -R apache:apache /opt/virtual-office
chmod -R 755 /opt/virtual-office

# Apply mandatory SELinux security context and network connect boolean
chcon -R -t httpd_sys_rw_content_t /opt/virtual-office
setsebool -P httpd_can_network_connect 1

# Configure Firewalld to permit HTTP traffic
firewall-cmd --permanent --add-service=http
firewall-cmd --reload
```

### 4. Apache HTTPD & mod_wsgi Deployment
```bash
# Install Apache configuration
cp deploy/apache/virtual-office.conf /etc/httpd/conf.d/

# Enable and start Apache HTTPD
systemctl daemon-reload
systemctl enable --now httpd

# Verify Apache service status
systemctl status httpd --no-pager
```

### 5. Access the Web Dashboard
Open your web browser and navigate to:
```
http://localhost/
# or across your corporate LAN:
http://<server-ip>/
```

---

## 👥 Agent Workforce

| Workstation IP | Specialist Name | Role | Department |
| :--- | :--- | :--- | :--- |
| `192.168.18.101` | **Aarav Sharma** | Chief Solutions Architect & Lead | Leadership |
| `192.168.18.102` | **Priya Patel** | Scrum Master & Agile Lead | Project Mgmt |
| `192.168.18.103` | **Vikram Malhotra** | Principal Network Architect | Network / NOC |
| `192.168.18.104` | **Sameer Khan** | NOC / Storage Engineer | Network / NOC |
| `192.168.18.105` | **Rohan Gupta** | Senior DevOps & CI/CD Lead | DevOps |
| `192.168.18.106` | **Kavita Desai** | Site Reliability Engineer (SRE) | DevOps |
| `192.168.18.107` | **Aditya Verma** | Lead Backend Engineer (Python/Go) | Backend |
| `192.168.18.108` | **Meera Iyer** | Database Administrator (DBA) | Backend |
| `192.168.18.109` | **Kunal Joshi** | Senior Microservices Specialist | Backend |
| `192.168.18.110` | **Neha Kapoor** | UI/UX & Frontend Architect | Frontend |
| `192.168.18.111` | **Rahul Singh** | React & WebGL Graphics Engineer | Frontend |
| `192.168.18.112` | **Tanvi Roy** | Mobile & Responsive Web Dev | Frontend |
| `192.168.18.113` | **Ananya Sen** | Quality Assurance (QA) Lead | QA & Testing |
| `192.168.18.114` | **Deepak Nair** | Performance & Security Tester | QA & Testing |
| `192.168.18.115` | **Farhan Siddiqui** | Cyber Security & SOC Analyst | InfoSec |

---

## 👨‍💻 Author & Architect

**Farman Ahmed**  
*Creator & Senior Linux System Administrator*  
* GitHub: [@jacky1473](https://github.com/jacky1473)  
* Project Repository: [jacky1473/CyberApex](https://github.com/jacky1473/CyberApex)

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
