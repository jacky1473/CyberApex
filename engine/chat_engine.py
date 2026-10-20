"""
Live Office Slack / Teams Chat Stream Engine
Generates ambient chatter, task announcements, and incident discussions for the 16 core team members
"""

import time
import random

AMBIENT_CHATTER = [
    ("EMP-003", "Rohan Mehta", "Network & Security Lead", "network", "🧑‍💻", "Checking routing tables on ens160. Default gateway 192.168.18.2 responding with 0.8ms latency."),
    ("EMP-004", "Sameer Khan", "Storage & NOC Systems Engineer", "network", "🌐", "Auditing firewalld open ports. Port 80 and 5000 active, all rules green."),
    ("EMP-006", "Karan Verma", "Senior Python & API Dev", "backend", "⚙️", "API connection pool configured with 25 slots. Running stress test endpoint."),
    ("EMP-007", "Saanvi Mehta", "Database Administrator (DBA)", "backend", "🗄️", "MariaDB query execution plan cached. Slow query log is empty."),
    ("EMP-008", "Sneha Gupta", "Frontend Architecture Lead", "frontend", "👩‍💻", "UI wireframes and CSS component palette finalized for the sprint."),
    ("EMP-009", "Aarav Gupta", "UI & Realtime Data Dev", "frontend", "💻", "Updating UI layout with real-time WebSocket state listener."),
    ("EMP-010", "Arjun Nair", "DevOps & Cloud Lead", "devops", "🧑‍🚀", "Building multi-stage container image. Base layer cached successfully."),
    ("EMP-011", "Vijay Sen", "Site Reliability Engineer (SRE)", "devops", "🚀", "Auditing /var/log storage and journalctl max size limits."),
    ("EMP-013", "Ananya Sen", "QA & Test Automation Lead", "qa", "👩‍🔬", "Automated regression suite passed: 184 passed, 0 failures."),
    ("EMP-014", "Hamza Chauhan", "Security & Stress Testing Eng", "qa", "🧪", "Executing 500-thread concurrent stress test on authentication endpoint."),
    ("EMP-015", "Kavita Das", "Senior SysAdmin Liaison", "support", "👩‍💻", "Workstation telemetry synchronized with Farman's Linux command deck.")
]

class ChatEngine:
    def __init__(self):
        self.messages = []
        self.max_messages = 120
        self.last_ambient_time = time.time()
        
        # Add welcome messages
        self.add_message(
            sender_id="SYS",
            sender_name="CyberApex Virtual Office OS",
            role="System",
            dept="system",
            avatar="🏢",
            text="✨ **CyberApex Virtual Office Engine Online!** 16 Specialized Staff Active across 8 Cabins. Farman logged in as **👑 Chief Linux Architect & Project Owner**."
        )
        self.add_message(
            sender_id="EMP-001",
            sender_name="Vikram Sharma",
            role="General Manager",
            dept="management",
            avatar="👨‍💼",
            text="Welcome Farman! Our 16-member engineering squad is stationed in their respective cabins. Give us a project order from the **Client Portal** to mobilize production, or tackle real hands-on Linux incidents in the **SysAdmin Lab**!"
        )

    def add_message(self, sender_id, sender_name, role, dept, avatar, text):
        msg = {
            "id": f"MSG-{int(time.time()*1000)}",
            "time": time.strftime("%H:%M:%S"),
            "sender_id": sender_id,
            "sender_name": sender_name,
            "role": role,
            "dept": dept,
            "avatar": avatar,
            "text": text
        }
        self.messages.append(msg)
        if len(self.messages) > self.max_messages:
            self.messages.pop(0)
        return msg

    def tick(self, is_project_active):
        now = time.time()
        interval = random.randint(12, 22) if is_project_active else random.randint(25, 45)
        if now - self.last_ambient_time > interval:
            chatter = random.choice(AMBIENT_CHATTER)
            self.add_message(
                sender_id=chatter[0],
                sender_name=chatter[1],
                role=chatter[2],
                dept=chatter[3],
                avatar=chatter[4],
                text=chatter[5]
            )
            self.last_ambient_time = now

    def get_messages(self, limit=50):
        return self.messages[-limit:]
