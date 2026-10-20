#!/usr/bin/env python3
"""
CyberApex Virtual Office Web Application & REST API
User = Client (gives projects to Manager)
User = Linux Tech Support Admin (resolves employee technical issues)
"""

import os
import sys
import time
import psutil
import socket
import threading
import subprocess
from flask import Flask, render_template, jsonify, request

from engine.office import OfficeState, DEPARTMENTS, ROOMS
from engine.chat_engine import ChatEngine
from engine.incident_engine import IncidentEngine, REAL_CHALLENGES, RANKS
from engine.project_manager import ClientProjectManager, PRESET_PROJECTS, PHASES

app = Flask(__name__)

# Initialize singletons
office_state = OfficeState()
chat_engine = ChatEngine()
incident_engine = IncidentEngine(office_state, chat_engine)
project_manager = ClientProjectManager(office_state, chat_engine, incident_engine)

def get_server_metrics():
    try:
        mem = psutil.virtual_memory()
        cpu = psutil.cpu_percent(interval=None)
        disk = psutil.disk_usage('/')
        
        # Local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(('10.255.255.255', 1))
            ip = s.getsockname()[0]
        except Exception:
            ip = '127.0.0.1'
        finally:
            s.close()

        return {
            "ip": ip,
            "cpu_percent": cpu,
            "ram_used_mb": round(mem.used / (1024 * 1024)),
            "ram_total_mb": round(mem.total / (1024 * 1024)),
            "ram_percent": mem.percent,
            "disk_free_gb": round(disk.free / (1024**3), 1),
            "disk_percent": disk.percent
        }
    except Exception as e:
        return {"error": str(e), "ip": "127.0.0.1"}

# Background simulation worker
def simulation_worker():
    while True:
        try:
            is_active = project_manager.is_active
            project_manager.tick()
            incident_engine.tick(is_active)
            chat_engine.tick(is_active)
        except Exception as e:
            print(f"[ERROR in simulation worker] {e}", file=sys.stderr)
        time.sleep(2.0)

worker_thread = threading.Thread(target=simulation_worker, daemon=True)
worker_thread.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/state')
def get_state():
    return jsonify({
        "stats": office_state.get_stats(),
        "departments": DEPARTMENTS,
        "rooms": office_state.rooms,
        "employees": office_state.get_all(),
        "project_state": project_manager.get_project_state(),
        "open_tickets": incident_engine.get_open_tickets(),
        "all_tickets": incident_engine.get_all_tickets()[:20],
        "resolved_count": incident_engine.resolved_count,
        "chat_messages": chat_engine.get_messages(50),
        "presets": PRESET_PROJECTS,
        "phases": PHASES,
        "real_challenges": REAL_CHALLENGES,
        "player_stats": incident_engine.player_stats,
        "ranks": RANKS,
        "server_metrics": get_server_metrics()
    })

@app.route('/api/tickets/verify_real_fix', methods=['POST'])
def verify_real_fix():
    data = request.json or {}
    ticket_id = data.get("ticket_id")
    admin_name = data.get("admin_name", "Farman (Chief Linux Architect)")
    force_skip = data.get("force_skip", False)

    success, message, ticket = incident_engine.verify_and_resolve_ticket(ticket_id, admin_name, force_skip)
    return jsonify({
        "success": success,
        "message": message,
        "ticket": ticket,
        "player_stats": incident_engine.player_stats
    })

@app.route('/api/player/unlock_perk', methods=['POST'])
def unlock_perk():
    data = request.json or {}
    perk_id = data.get("perk_id")
    perks_catalog = {
        "espresso": {"id": "espresso", "name": "☕ Barista Espresso Machine", "cost": 100, "desc": "Recharges team focus, boosting productivity by +15%"},
        "monitors": {"id": "monitors", "name": "🖥️ Dual 4K Developer Displays", "cost": 150, "desc": "Improves code review speed and prevents syntax errors"},
        "nvme": {"id": "nvme", "name": "🚀 NVMe High-Speed Array", "cost": 250, "desc": "Decreases project build times by 40%"},
        "firewall_ai": {"id": "firewall_ai", "name": "🛡️ Automated Firewall AI Sentinel", "cost": 300, "desc": "Automatically suggests exact sysadmin commands for network tickets"}
    }
    perk = perks_catalog.get(perk_id)
    if not perk:
        return jsonify({"success": False, "error": "Perk not found"}), 404

    stats = incident_engine.player_stats
    if stats["coins"] < perk["cost"]:
        return jsonify({"success": False, "error": f"Need {perk['cost']} coins! You currently have {stats['coins']}."}), 400

    if perk_id in stats["unlocked_perks"]:
        return jsonify({"success": False, "error": "Perk already unlocked!"}), 400

    stats["coins"] -= perk["cost"]
    stats["unlocked_perks"].append(perk_id)
    chat_engine.add_message(
        sender_id="ADMIN",
        sender_name="Farman (Chief Linux Architect)",
        role="Chief Linux Architect",
        dept="admin",
        avatar="👑",
        text=f"🛒 **OFFICE UPGRADE UNLOCKED:** Farman purchased **{perk['name']}**! {perk['desc']}."
    )
    return jsonify({"success": True, "perk": perk, "player_stats": stats})

@app.route('/api/client/project', methods=['POST'])
def client_submit_project():
    data = request.json or {}
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    client_name = data.get("client_name", "Farman (Client)").strip()

    if not title:
        return jsonify({"success": False, "error": "Project title is required"}), 400

    proj = project_manager.create_project_from_client(title, description, client_name)
    return jsonify({"success": True, "project": proj})

@app.route('/api/client/accept_delivery', methods=['POST'])
def client_accept_delivery():
    data = request.json or {}
    rating = data.get("rating", 5)
    
    if project_manager.current_project:
        project_manager.current_project["status"] = "accepted_by_client"
        chat_engine.add_message(
            sender_id="CLIENT",
            sender_name="Farman (Client)",
            role="Client / Project Owner",
            dept="client",
            avatar="👑",
            text=f"⭐ **PROJECT ACCEPTED & SIGNED OFF!** Rating: {rating}/5 Stars. Outstanding work by the 100 bots and Linux Admin!"
        )
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "No project available to accept"}), 400

@app.route('/api/network/toggle_lan', methods=['POST'])
def toggle_lan():
    data = request.json or {}
    emp_id = data.get("emp_id")
    target_state = data.get("connected", None)

    emp = office_state.get(emp_id)
    if not emp:
        return jsonify({"success": False, "error": "Employee not found"}), 404

    current_state = emp.get("lan_connected", True)
    new_state = (not current_state) if target_state is None else bool(target_state)

    ip = emp.get("ip")
    emp["lan_connected"] = new_state

    # Physical Linux OS IP Alias management on ens160
    if ip and ip.startswith("192.168.18."):
        if not new_state:
            subprocess.run(f"sudo -n ip addr del {ip}/24 dev ens160 2>/dev/null || true", shell=True)
            emp["status"] = "blocked"
            emp["task"] = "⚠️ BLOCKED: LAN Cable Disconnected from Server Room Core Switch"
            # Trigger real incident ticket logged by the affected bot
            incident_engine.trigger_lan_disconnect_ticket(emp_id)
            chat_engine.add_message(
                sender_id="EMP-003",
                sender_name="Rohan Mehta",
                role="Network Lead",
                dept="network",
                avatar="🌐",
                text=f"🔌 **LAN CABLE UNPLUGGED:** Workstation `{ip}` ({emp['name']}) link DOWN! Port disconnected from Server Room Core Switch by Admin Farman."
            )
        else:
            subprocess.run(f"sudo -n ip addr add {ip}/24 dev ens160 2>/dev/null || true", shell=True)
            emp["status"] = "working"
            emp["task"] = "LAN Connected - 1000BASE-T link active with Core Switch"
            # Resolve network outage ticket and reward Farman XP
            incident_engine.resolve_lan_disconnect_ticket(emp_id)
            chat_engine.add_message(
                sender_id="EMP-003",
                sender_name="Rohan Mehta",
                role="Network Lead",
                dept="network",
                avatar="🌐",
                text=f"🟢 **LAN CABLE CONNECTED:** Workstation `{ip}` ({emp['name']}) link UP (1Gbps Full Duplex)! Connected to Server Room Core Switch."
            )

    return jsonify({
        "success": True,
        "emp_id": emp_id,
        "lan_connected": new_state,
        "ip": ip,
        "name": emp["name"],
        "status": emp["status"]
    })

@app.route('/api/network/lan_status')
def get_lan_status():
    status_list = []
    for e in office_state.get_all():
        if e.get("ip", "").startswith("192.168.18."):
            status_list.append({
                "id": e["id"],
                "name": e["name"],
                "role": e["role"],
                "ip": e["ip"],
                "lan_connected": e.get("lan_connected", True),
                "status": e.get("status", "idle")
            })
    return jsonify({"success": True, "stations": status_list})

@app.route('/api/tickets/resolve', methods=['POST'])
def resolve_ticket():
    data = request.json or {}
    ticket_id = data.get("ticket_id")
    admin_name = data.get("admin_name", "Farman (Linux Admin)")
    notes = data.get("notes", "Resolved in Linux environment by Admin")
    execute_command = data.get("execute_command", False)

    # Optional safe command execution
    exec_output = None
    if execute_command:
        cmd = None
        for t in incident_engine.tickets:
            if t["id"] == ticket_id:
                cmd = t.get("solution_cmd")
                break
        if cmd:
            try:
                res = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5)
                exec_output = res.stdout.decode() or res.stderr.decode() or "Command completed with code 0"
            except Exception as ex:
                exec_output = f"Execution error: {str(ex)}"

    success, ticket = incident_engine.resolve_ticket(ticket_id, admin_name, notes)
    if success:
        return jsonify({
            "success": True,
            "ticket": ticket,
            "exec_output": exec_output
        })
    else:
        return jsonify({"success": False, "error": "Ticket not found or already resolved"}), 404

@app.route('/api/tickets/trigger', methods=['POST'])
def trigger_incident_manually():
    data = request.json or {}
    specific_type = data.get("type")
    emp_id = data.get("emp_id")
    ticket = incident_engine.trigger_incident(specific_type, emp_id)
    return jsonify({"success": True, "ticket": ticket})

@app.route('/api/vdi/start', methods=['POST'])
def vdi_start():
    data = request.json or {}
    ticket_id = data.get("ticket_id")
    success, session = incident_engine.start_vdi_session(ticket_id)
    if success:
        return jsonify({"success": True, "session": session})
    return jsonify({"success": False, "error": "Ticket not found"}), 404

@app.route('/api/vdi/stop', methods=['POST'])
def vdi_stop():
    data = request.json or {}
    ticket_id = data.get("ticket_id")
    success, msg = incident_engine.stop_vdi_session(ticket_id)
    return jsonify({"success": success, "message": msg})

@app.route('/api/tickets/remark', methods=['POST'])
def ticket_add_remark():
    data = request.json or {}
    ticket_id = data.get("ticket_id")
    remark_text = data.get("remark", "").strip()
    admin_name = data.get("admin_name", "Farman (Linux Admin)")

    if not remark_text:
        return jsonify({"success": False, "error": "Remark text cannot be empty"}), 400

    success, admin_entry, bot_entry = incident_engine.add_admin_remark(ticket_id, remark_text, admin_name)
    if success:
        return jsonify({
            "success": True,
            "admin_entry": admin_entry,
            "bot_entry": bot_entry
        })
    return jsonify({"success": False, "error": "Ticket not found"}), 404

@app.route('/api/vdi/exec', methods=['POST'])
def vdi_exec():
    data = request.json or {}
    ticket_id = data.get("ticket_id")
    cmd = data.get("command", "").strip()

    if not cmd:
        return jsonify({"success": False, "error": "Command is empty"}), 400

    if cmd == "clear":
        return jsonify({"success": True, "output": "", "clear_screen": True})

    # Find ticket
    target_ticket = None
    for t in incident_engine.tickets:
        if t["id"] == ticket_id:
            target_ticket = t
            break

    if not target_ticket or not target_ticket.get("vdi_active"):
        return jsonify({"success": False, "error": "VDI is offline. Please launch VDI session first to save resources."}), 400

    emp_host = target_ticket.get("emp_hostname", "workstation.local")
    emp_ip = target_ticket.get("emp_ip", "192.168.18.100")
    ws_path = target_ticket.get("workstation_path", "/tmp/office_sandbox")
    if not os.path.exists(ws_path):
        ws_path = "/opt/virtual-office"

    try:
        proc = subprocess.run(
            ['sudo', '-n', 'bash', '-c', cmd],
            cwd=ws_path,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            close_fds=True,
            timeout=15
        )
        out = proc.stdout.decode('utf-8', errors='replace')
        err = proc.stderr.decode('utf-8', errors='replace')
        res_output = out if out else err if err else "(Command completed with exit code 0)"
        return jsonify({
            "success": True,
            "hostname": emp_host,
            "ip": emp_ip,
            "cwd": ws_path,
            "output": res_output
        })
    except subprocess.TimeoutExpired:
        return jsonify({"success": False, "output": "Command timed out after 15 seconds"})
    except Exception as e:
        return jsonify({"success": False, "output": f"Execution error: {str(e)}"})


@app.route('/api/admin/exec', methods=['POST'])
def admin_exec():
    """Allows Linux admin Farman to run ANY Linux command without restriction"""
    data = request.json or {}
    cmd = data.get("command", "").strip()
    
    if not cmd:
        return jsonify({"success": False, "error": "Command is empty"}), 400

    # Handle clear directly
    if cmd == "clear":
        return jsonify({"success": True, "output": "", "clear_screen": True})

    try:
        proc = subprocess.run(
            ['sudo', '-n', 'bash', '-c', cmd],
            cwd="/opt/virtual-office",
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            close_fds=True,
            timeout=15
        )
        out = proc.stdout.decode('utf-8', errors='replace')
        err = proc.stderr.decode('utf-8', errors='replace')
        return jsonify({
            "success": True,
            "returncode": proc.returncode,
            "output": out if out else err if err else "(Command executed with return code 0)"
        })
    except subprocess.TimeoutExpired:
        return jsonify({"success": False, "output": "Command timed out after 15 seconds"})
    except Exception as e:
        return jsonify({"success": False, "output": f"Execution error: {str(e)}"})

@app.route('/api/agent/reports')
def get_agent_reports():
    return jsonify({
        "success": True,
        "reports": project_manager.agent_reports[:50]
    })

if __name__ == '__main__':
    print("=" * 60)
    print("🏢 CyberApex Virtual Office - Starting Server")
    print("👑 User Role 1: CLIENT (Gives projects to Manager EMP-001)")
    print("🛡️ User Role 2: LINUX TECH SUPPORT (Solves employee tickets)")
    print("🌐 Listening on http://0.0.0.0:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
