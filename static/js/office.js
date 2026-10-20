/**
 * CyberApex - Hands-On Linux SysAdmin & 2D Office Arena Engine
 */

let state = {
    employees: [],
    rooms: {},
    stats: {},
    project_state: {},
    open_tickets: [],
    all_tickets: [],
    chat_messages: [],
    presets: [],
    phases: [],
    real_challenges: [],
    player_stats: { xp: 150, level: 1, rank: "Junior SysAdmin", badge: "🔰", coins: 200, unlocked_perks: [] },
    ranks: [],
    selected_ticket_id: null,
    focused_room: 'all',
    cmd_history: [],
    history_idx: -1
};

// Canvas & Animation
let canvas, ctx;
let hoveredBot = null;
let lastFrameTime = performance.now();
let fpsCounter = 0;
let lastFpsUpdate = performance.now();

// Audio Synthesis using Web Audio API
function playChime(success = true) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        if (success) {
            // Victorious ascending arpeggio
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
            osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
            osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.6);
        } else {
            // Warning buzzer
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, audioCtx.currentTime);
            osc.frequency.setValueAtTime(160, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.35);
        }
    } catch (e) {}
}

// Tab Switching
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');

    const content = document.getElementById(tabId);
    if (content) content.classList.add('active');
}

// Fetch Full Game & Office State
async function fetchState() {
    try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const data = await res.json();

        const hadZeroTickets = state.open_tickets.length === 0;

        // Merge incoming employee data while preserving render positions
        if (state.employees.length === 0) {
            state.employees = data.employees.map(e => ({
                ...e,
                renderX: e.x,
                renderY: e.y,
                animPhase: Math.random() * Math.PI * 2
            }));
        } else {
            const map = {};
            data.employees.forEach(e => { map[e.id] = e; });
            state.employees.forEach(bot => {
                const updated = map[bot.id];
                if (updated) {
                    bot.status = updated.status;
                    bot.task = updated.task;
                    bot.thought = updated.thought;
                    bot.x = updated.x;
                    bot.y = updated.y;
                    bot.room_id = updated.room_id;
                }
            });
        }

        state.rooms = data.rooms || {};
        state.stats = data.stats || {};
        state.project_state = data.project_state || {};
        state.open_tickets = data.open_tickets || [];
        state.all_tickets = data.all_tickets || [];
        state.chat_messages = data.chat_messages || [];
        state.presets = data.presets || [];
        state.phases = data.phases || [];
        state.real_challenges = data.real_challenges || [];
        state.player_stats = data.player_stats || state.player_stats;
        state.ranks = data.ranks || [];

        if (hadZeroTickets && state.open_tickets.length > 0) {
            playChime(false);
        }

        renderHeader(data.server_metrics);
        renderPlayerHUD();
        renderProjectHUD();
        renderIncidentBanner();
        renderTicketsView();
        renderClientProjectView();
        renderChatStream();
        updatePerksUI();

        if (window.Office3D) {
            window.Office3D.update(state.employees);
        }
        renderAgentReportsView();

    } catch (err) {
        console.error('Error fetching state:', err);
    }
}

// Render Player XP and Level HUD
function renderPlayerHUD() {
    const p = state.player_stats;
    document.getElementById('player-badge').textContent = p.badge || '🔰';
    document.getElementById('player-rank').textContent = p.rank || 'Junior SysAdmin';
    document.getElementById('player-level').textContent = p.level || 1;
    document.getElementById('player-coins').textContent = p.coins || 0;

    // Calculate XP Bar percentage
    let curMax = 300;
    let curMin = 0;
    if (state.ranks && state.ranks.length > 0) {
        const curRank = state.ranks.find(r => r.level === p.level) || state.ranks[0];
        curMin = curRank.min_xp;
        curMax = curRank.max_xp;
    }
    const needed = curMax - curMin;
    const currentInLevel = p.xp - curMin;
    const pct = Math.min(100, Math.max(5, Math.round((currentInLevel / needed) * 100)));

    document.getElementById('xp-bar-fill').style.width = `${pct}%`;
    document.getElementById('xp-numbers').textContent = `${p.xp} / ${curMax} XP`;
}

// Render Top System Header
function renderHeader(metrics) {
    if (metrics) {
        document.getElementById('server-ip').textContent = metrics.ip || '192.168.18.131';
        document.getElementById('server-ram').textContent = `${metrics.ram_used_mb}MB / ${metrics.ram_total_mb}MB`;
    }
    document.getElementById('lab-badge').textContent = state.open_tickets.length;
}

// Render Project HUD Bar
function renderProjectHUD() {
    const prj = state.project_state.project;
    const hudTitle = document.getElementById('hud-prj-title');
    const hudCustodian = document.getElementById('hud-custodian');
    const hudEta = document.getElementById('hud-eta');
    const hudBar = document.getElementById('hud-progress-bar');
    const hudPct = document.getElementById('hud-progress-pct');

    if (!prj) {
        hudTitle.textContent = 'No Active Project (Standby)';
        hudCustodian.textContent = 'Awaiting Client Order from Farman';
        hudEta.textContent = '--:--';
        hudBar.style.width = '0%';
        hudPct.textContent = '0%';
        return;
    }

    hudTitle.textContent = prj.title;
    hudCustodian.textContent = prj.current_custodian || 'Management';

    const pct = prj.progress_percent || 0;
    hudBar.style.width = `${pct}%`;
    hudPct.textContent = `${pct}%`;

    if (prj.is_delayed) {
        hudEta.textContent = '⚠️ DELAYED';
        hudEta.style.color = '#ef4444';
    } else if (prj.status === 'completed' || prj.status === 'accepted_by_client') {
        hudEta.textContent = '✅ DELIVERED';
        hudEta.style.color = '#10b981';
    } else {
        const eta = prj.eta_seconds || 0;
        const mins = Math.floor(eta / 60);
        const secs = eta % 60;
        hudEta.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        hudEta.style.color = '#f59e0b';
    }
}

// Incident Alert Banner
function renderIncidentBanner() {
    const banner = document.getElementById('incident-banner');
    if (state.open_tickets.length > 0) {
        const first = state.open_tickets[0];
        document.getElementById('banner-title').textContent = `🚨 REAL LINUX INCIDENT DETECTED ON ROCKY OS!`;
        document.getElementById('banner-desc').textContent = `${first.emp_name} (${first.emp_role}) is BLOCKED: ${first.title}`;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

// -------------------------------------------------------------
// 2D CANVAS ARENA (8 Cabins & 16 Specialists)
// -------------------------------------------------------------
function initCanvas() {
    canvas = document.getElementById('officeCanvas');
    if (!canvas || canvas.style.display === 'none') return;
    ctx = canvas.getContext('2d');

    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mouseleave', () => {
        hoveredBot = null;
        const tt = document.getElementById('bot-tooltip');
        if (tt) tt.classList.add('hidden');
    });

    requestAnimationFrame(renderCanvasLoop);
}

function handleCanvasMouseMove(e) {
    if (!canvas || canvas.style.display === 'none') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    hoveredBot = null;
    for (let bot of state.employees) {
        const dist = Math.hypot(bot.renderX - mouseX, bot.renderY - mouseY);
        if (dist < 20) {
            hoveredBot = bot;
            break;
        }
    }

    const tooltip = document.getElementById('bot-tooltip');
    if (!tooltip) return;

    if (hoveredBot) {
        const elAvatar = document.getElementById('tt-avatar');
        if (elAvatar) elAvatar.textContent = hoveredBot.avatar;
        const elName = document.getElementById('tt-name');
        if (elName) elName.textContent = hoveredBot.name;
        const elRole = document.getElementById('tt-role');
        if (elRole) elRole.textContent = hoveredBot.role;
        const elDot = document.getElementById('tt-dot');
        if (elDot) elDot.className = `status-dot ${hoveredBot.status}`;
        const elStatus = document.getElementById('tt-status-text');
        if (elStatus) elStatus.textContent = hoveredBot.status.toUpperCase();
        const elTask = document.getElementById('tt-task');
        if (elTask) elTask.textContent = hoveredBot.task;
        const elThought = document.getElementById('tt-thought');
        if (elThought) elThought.textContent = `"${hoveredBot.thought || 'Active'}"`;

        tooltip.style.left = `${Math.min(e.clientX - rect.left + 20, rect.width - 260)}px`;
        tooltip.style.top = `${Math.min(e.clientY - rect.top + 20, rect.height - 140)}px`;
        tooltip.classList.remove('hidden');
    } else {
        tooltip.classList.add('hidden');
    }
}

function handleCanvasClick(e) {
    if (hoveredBot) {
        openBotModal(hoveredBot);
    }
}

function focusRoom(roomId) {
    state.focused_room = roomId;
    if (window.Office3D) {
        window.Office3D.focusRoom(roomId);
    }
}

function renderCanvasLoop(timestamp) {
    if (!canvas || canvas.style.display === 'none' || canvas.offsetParent === null) {
        return;
    }

    const dt = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    fpsCounter++;
    if (timestamp - lastFpsUpdate > 1000) {
        const fpsElem = document.getElementById('canvas-fps');
        if (fpsElem) fpsElem.textContent = `${fpsCounter} FPS`;
        fpsCounter = 0;
        lastFpsUpdate = timestamp;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Floor Base
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cyberpunk Hexagonal Grid
    drawCyberGrid();

    // Draw 8 Cabins
    for (let rid in state.rooms) {
        drawCabin(state.rooms[rid], timestamp);
    }

    // Draw 16 Animated Specialists
    drawSpecialists(timestamp);

    requestAnimationFrame(renderCanvasLoop);
}

function drawCyberGrid() {
    ctx.strokeStyle = '#0a1020';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawCabin(cabin, timestamp) {
    const isFocused = state.focused_room === 'all' || state.focused_room === cabin.id;

    ctx.save();
    ctx.globalAlpha = isFocused ? 1.0 : 0.25;

    // Floor Tint
    ctx.fillStyle = cabin.color + '15';
    ctx.fillRect(cabin.x, cabin.y, cabin.w, cabin.h);

    // Glowing Walls
    ctx.strokeStyle = isFocused && state.focused_room === cabin.id ? '#38bdf8' : cabin.color + 'aa';
    ctx.lineWidth = isFocused && state.focused_room === cabin.id ? 2.5 : 1.5;
    ctx.strokeRect(cabin.x, cabin.y, cabin.w, cabin.h);

    // Cabin Tag
    ctx.fillStyle = cabin.color + 'dd';
    ctx.fillRect(cabin.x, cabin.y, Math.min(cabin.w, 210), 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText(`${cabin.icon} ${cabin.name.substring(0, 26)}`, cabin.x + 8, cabin.y + 15);

    // Furniture Details
    drawCabinFurniture(cabin, timestamp);

    ctx.restore();
}

function drawCabinFurniture(cabin, timestamp) {
    if (cabin.id === 'room_mgmt') {
        // Polished Conference Table
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cabin.x + 120, cabin.y + 95, 55, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#a5b4fc';
        ctx.font = 'bold 9px Orbitron, sans-serif';
        ctx.fillText('BOARD TABLE', cabin.x + 88, cabin.y + 98);
    } else if (cabin.id === 'room_noc') {
        // Server Racks with Blinking LEDs
        for (let i = 0; i < 3; i++) {
            const rx = cabin.x + cabin.w - 38;
            const ry = cabin.y + 35 + (i * 42);
            ctx.fillStyle = '#083344';
            ctx.fillRect(rx, ry, 28, 34);
            ctx.strokeStyle = '#06b6d4';
            ctx.strokeRect(rx, ry, 28, 34);

            const blink = Math.sin((timestamp / 180) + i) > 0;
            ctx.fillStyle = blink ? '#22c55e' : '#15803d';
            ctx.beginPath();
            ctx.arc(rx + 8, ry + 10, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = !blink ? '#06b6d4' : '#0e7490';
            ctx.beginPath();
            ctx.arc(rx + 18, ry + 10, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (cabin.id === 'room_admin') {
        // Farman's Root Master Station
        ctx.fillStyle = '#022c22';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(cabin.x + 60, cabin.y + 60, 110, 48);
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('[ROOT COMMAND DECK]', cabin.x + 65, cabin.y + 88);
    } else if (cabin.id === 'room_cafe') {
        // Espresso Bar
        ctx.fillStyle = '#451a03';
        ctx.fillRect(cabin.x + cabin.w - 40, cabin.y + 35, 30, 45);
        ctx.fillStyle = '#f59e0b';
        ctx.font = '16px sans-serif';
        ctx.fillText('☕', cabin.x + cabin.w - 34, cabin.y + 65);

        // Cafe Table
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.arc(cabin.x + 80, cabin.y + 90, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78716c';
        ctx.stroke();
    }
}

function drawSpecialists(timestamp) {
    for (let bot of state.employees) {
        const lerpSpeed = 0.08;
        bot.renderX += (bot.x - bot.renderX) * lerpSpeed;
        bot.renderY += (bot.y - bot.renderY) * lerpSpeed;

        const isHovered = hoveredBot && hoveredBot.id === bot.id;
        const isBlocked = bot.status === 'blocked';
        const isWorking = bot.status === 'working';

        ctx.save();

        // 1. Dual Monitor Desk
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bot.desk_x - 16, bot.desk_y - 10, 32, 20);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(bot.desk_x - 16, bot.desk_y - 10, 32, 20);

        // Screens
        ctx.fillStyle = isWorking ? '#38bdf8' : '#475569';
        ctx.fillRect(bot.desk_x - 14, bot.desk_y - 14, 12, 4);
        ctx.fillRect(bot.desk_x + 2, bot.desk_y - 14, 12, 4);

        const bx = bot.renderX;
        const by = bot.renderY;

        // Blocked Emergency Pulse
        if (isBlocked) {
            const pulse = (Math.sin(timestamp / 100) + 1) / 2;
            ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.4})`;
            ctx.beginPath();
            ctx.arc(bx, by, 22 + pulse * 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Selection Aura
        if (isHovered) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(bx, by, 18, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Character Avatar Circle
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(bx, by, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = getDeptColor(bot.dept);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Avatar Emoji
        ctx.font = '13px sans-serif';
        ctx.fillText(bot.avatar, bx - 7, by + 5);

        // Status Pip
        let pipColor = '#64748b';
        if (isWorking) pipColor = '#10b981';
        else if (isBlocked) pipColor = '#ef4444';
        else if (bot.status === 'meeting') pipColor = '#f59e0b';

        ctx.fillStyle = pipColor;
        ctx.beginPath();
        ctx.arc(bx + 9, by - 9, 4, 0, Math.PI * 2);
        ctx.fill();

        // Animated Typing Fingers when coding
        if (isWorking) {
            const typeOsc = Math.sin((timestamp / 90) + bot.animPhase);
            ctx.fillStyle = '#67e8f9';
            ctx.fillRect(bx - 4 + (typeOsc * 2), by + 10, 8, 2.5);
        }

        // Blocked Emergency Beacon Flag
        if (isBlocked) {
            ctx.font = '16px sans-serif';
            ctx.fillText('🚨', bx - 8, by - 18);
        }

        // Name Tag
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 9px Inter, sans-serif';
        const nameWidth = ctx.measureText(bot.name).width;
        ctx.fillText(bot.name, bx - (nameWidth / 2), by + 23);

        ctx.restore();
    }
}

function getDeptColor(dept) {
    const map = {
        management: '#6366f1',
        network: '#06b6d4',
        backend: '#3b82f6',
        frontend: '#8b5cf6',
        devops: '#ef4444',
        qa: '#14b8a6',
        support: '#10b981',
        admin: '#f59e0b'
    };
    return map[dept] || '#64748b';
}

function openBotModal(bot) {
    document.getElementById('modal-avatar').textContent = bot.avatar;
    document.getElementById('modal-name').textContent = bot.name;
    document.getElementById('modal-role').textContent = bot.role;
    document.getElementById('modal-room').textContent = state.rooms[bot.room_id] ? state.rooms[bot.room_id].name : bot.room_id;
    document.getElementById('modal-network').textContent = `${bot.ip} (${bot.hostname})`;
    document.getElementById('modal-specialty').textContent = bot.specialty || 'Full Stack Linux Engineering';
    document.getElementById('modal-bio').textContent = `"${bot.bio || 'Core Specialist'}"`;
    document.getElementById('modal-task').textContent = bot.task;

    document.getElementById('bot-modal').classList.remove('hidden');
}

function closeBotModal() {
    document.getElementById('bot-modal').classList.add('hidden');
}

// -------------------------------------------------------------
// REAL LINUX HANDS-ON LAB & OS VERIFICATION
// -------------------------------------------------------------
function renderTicketsView() {
    const list = document.getElementById('tickets-list');
    const tickets = state.all_tickets || [];

    if (tickets.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding:20px;"><p>No active incidents on Rocky Linux. Click "Spawn Challenge in OS" above to start a mission!</p></div>`;
        return;
    }

    if (!state.selected_ticket_id && state.open_tickets.length > 0) {
        state.selected_ticket_id = state.open_tickets[0].id;
    }

    list.innerHTML = tickets.map(t => `
        <div class="ticket-item ${t.status} ${t.id === state.selected_ticket_id ? 'selected' : ''}" onclick="selectTicket('${t.id}')">
            <div class="t-meta-row">
                <span class="badge" style="font-size:10px;">${t.id}</span>
                <span class="badge ${t.status === 'OPEN' ? 'badge-danger' : 'badge-success'}" style="font-size:10px;">${t.status}</span>
                <span class="badge highlight-amber" style="font-size:9px;">+${t.xp_reward || 150} XP</span>
            </div>
            <div class="t-title">${t.title}</div>
            <div class="t-reporter">👤 ${t.emp_name} (${t.emp_role})</div>
        </div>
    `).join('');

    renderSelectedTicketAction();
}

function selectTicket(tid) {
    state.selected_ticket_id = tid;
    renderTicketsView();
}

function renderSelectedTicketAction() {
    const noPanel = document.getElementById('no-ticket-selected');
    const actPanel = document.getElementById('ticket-action-panel');
    const t = state.all_tickets.find(x => x.id === state.selected_ticket_id);

    if (!t) {
        noPanel.classList.remove('hidden');
        actPanel.classList.add('hidden');
        return;
    }

    noPanel.classList.add('hidden');
    actPanel.classList.remove('hidden');

    document.getElementById('act-ticket-id').textContent = t.id;
    document.getElementById('act-ticket-sev').textContent = t.severity;
    document.getElementById('act-ticket-dept').textContent = t.emp_dept.toUpperCase();
    document.getElementById('act-xp-reward').textContent = `+${t.xp_reward || 150} XP`;
    document.getElementById('act-ticket-title').textContent = t.title;
    document.getElementById('act-emp-name').textContent = t.emp_name;
    document.getElementById('act-emp-role').textContent = t.emp_role;
    document.getElementById('act-emp-ip').textContent = t.emp_ip || '192.168.18.106';
    document.getElementById('act-emp-host').textContent = t.emp_hostname || 'be-python.corp.local';
    document.getElementById('act-emp-path').textContent = t.workstation_path || '/var/log/virtual_office';
    document.getElementById('act-error-log').textContent = t.error_log;

    // Real OS Verification Badge
    const verifBadge = document.getElementById('verif-status-badge');
    const verifDesc = document.getElementById('verif-desc-text');
    const btnVerify = document.getElementById('btn-verify-real-fix');

    if (t.status === 'RESOLVED') {
        verifBadge.className = 'verif-badge passing';
        verifBadge.textContent = '🟢 VERIFIED & SOLVED IN ROCKY LINUX OS!';
        verifDesc.textContent = `Resolved at ${t.resolved_at}. ${t.resolution_notes}`;
        btnVerify.classList.add('hidden');
    } else {
        verifBadge.className = 'verif-badge failing';
        verifBadge.textContent = '🔴 UNRESOLVED ON ROCKY LINUX';
        verifDesc.textContent = 'The problem actively exists on the Rocky Linux filesystem/kernel. Run commands in the terminal below, then verify!';
        btnVerify.classList.remove('hidden');
    }

    // Populate Knowledge Pill
    const kp = t.knowledge_pill || {};
    document.getElementById('kp-title').textContent = kp.title || 'SysAdmin Knowledge Pill: Understanding This Incident';
    document.getElementById('kp-explanation').textContent = kp.explanation || t.hint;
    const cmdBox = document.getElementById('kp-pro-commands');
    cmdBox.innerHTML = (kp.pro_commands || [t.solution_cmd]).map(c => `<code>${c}</code>`).join('');

    renderRemarksThread(t);
}

function toggleKnowledgePill() {
    const body = document.getElementById('kp-body');
    const btn = document.getElementById('kp-toggle-btn');
    if (body.style.display === 'none') {
        body.style.display = 'block';
        btn.textContent = '▲';
    } else {
        body.style.display = 'none';
        btn.textContent = '▼';
    }
}

// Check Real OS Fix
async function verifyRealOsFix() {
    if (!state.selected_ticket_id) return;
    try {
        const res = await fetch('/api/tickets/verify_real_fix', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                ticket_id: state.selected_ticket_id,
                admin_name: 'Farman (Chief Linux Architect)'
            })
        });
        const data = await res.json();
        if (data.success) {
            playChime(true);
            alert(`🎉 EXCELLENT WORK! Condition Verified on Rocky Linux!\n${data.message}\n+150 XP and +50 Credits Awarded!`);
            fetchState();
        } else {
            playChime(false);
            alert(`❌ Check Failed on Rocky Linux:\n${data.message}\n\nPlease run the proper Linux command to fix the issue, then try verifying again!`);
        }
    } catch (e) {
        alert('Network error verifying fix: ' + e);
    }
}

async function quickAutoFixTicket() {
    if (!state.selected_ticket_id) {
        alert('Please select an active ticket first!');
        return;
    }
    try {
        const res = await fetch('/api/tickets/verify_real_fix', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                ticket_id: state.selected_ticket_id,
                admin_name: 'Farman (Chief Linux Architect)',
                force_skip: true
            })
        });
        const data = await res.json();
        if (data.success) {
            playChime(true);
            alert(`⚡ Quick Auto-Remediate Applied!\n${data.message}\nWorkstation environment cleaned and tasks resuming.`);
            fetchState();
        } else {
            alert('Error applying quick fix: ' + data.message);
        }
    } catch (e) {
        alert('Network error applying quick fix: ' + e);
    }
}

async function triggerManualIncident() {
    const type = document.getElementById('sim-incident-type').value;
    try {
        const res = await fetch('/api/tickets/trigger', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({type})
        });
        const data = await res.json();
        if (data.success) {
            playChime(false);
            fetchState();
            state.selected_ticket_id = data.ticket.id;
            switchTab('tab-lab');
        }
    } catch (err) {
        alert('Error spawning challenge: ' + err);
    }
}

// -------------------------------------------------------------
// WORKSTATION TERMINAL WITH HISTORY & EXECUTION
// -------------------------------------------------------------
async function handleVdiSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('vdi-input');
    const cmd = input.value.trim();
    if (!cmd) return;

    state.cmd_history.push(cmd);
    state.history_idx = state.cmd_history.length;
    input.value = '';

    runVdiCmd(cmd);
}

// Arrow Key History Navigation
document.addEventListener('keydown', (e) => {
    const vdiInput = document.getElementById('vdi-input');
    if (document.activeElement === vdiInput) {
        if (e.key === 'ArrowUp') {
            if (state.history_idx > 0) {
                state.history_idx--;
                vdiInput.value = state.cmd_history[state.history_idx];
            }
        } else if (e.key === 'ArrowDown') {
            if (state.history_idx < state.cmd_history.length - 1) {
                state.history_idx++;
                vdiInput.value = state.cmd_history[state.history_idx];
            } else {
                state.history_idx = state.cmd_history.length;
                vdiInput.value = '';
            }
        }
    }
});

async function runVdiCmd(cmd) {
    const term = document.getElementById('vdi-terminal-output');

    if (cmd === 'clear') {
        term.textContent = '';
        return;
    }

    term.textContent += `\n[root@rocky ~]# ${cmd}\n`;
    term.scrollTop = term.scrollHeight;

    try {
        const res = await fetch('/api/admin/exec', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({command: cmd})
        });
        const data = await res.json();
        term.textContent += `${data.output}\n`;
        term.scrollTop = term.scrollHeight;
    } catch (err) {
        term.textContent += `Execution error: ${err}\n`;
        term.scrollTop = term.scrollHeight;
    }
}

function runVdiQuickCheck(action) {
    const t = state.all_tickets.find(x => x.id === state.selected_ticket_id);
    if (!t) return;
    const path = t.workstation_path || '/var/log/virtual_office';
    if (action === 'ls -la') {
        runVdiCmd(`ls -la ${path}`);
    } else if (action === 'cat') {
        if (t.target_file) {
            runVdiCmd(`head -n 20 ${t.target_file}`);
        } else {
            runVdiCmd(`ls -la ${path}`);
        }
    }
}

function runVdiApplySolution() {
    const t = state.all_tickets.find(x => x.id === state.selected_ticket_id);
    if (t && t.solution_cmd) {
        runVdiCmd(t.solution_cmd);
    }
}

// -------------------------------------------------------------
// TECH UPGRADES SHOP (Spend Credits)
// -------------------------------------------------------------
async function buyPerk(perkId) {
    try {
        const res = await fetch('/api/player/unlock_perk', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({perk_id: perkId})
        });
        const data = await res.json();
        if (data.success) {
            playChime(true);
            alert(`🎉 UPGRADE UNLOCKED!\nPurchased: ${data.perk.name}\n${data.perk.desc}`);
            fetchState();
        } else {
            alert('Cannot purchase: ' + data.error);
        }
    } catch (e) {
        alert('Purchase error: ' + e);
    }
}

function updatePerksUI() {
    const unlocked = state.player_stats.unlocked_perks || [];
    unlocked.forEach(pid => {
        const card = document.getElementById(`card-perk-${pid}`);
        if (card) {
            const btn = card.querySelector('button');
            if (btn) {
                btn.textContent = '✅ UNLOCKED & ACTIVE';
                btn.className = 'btn btn-success btn-sm';
                btn.disabled = true;
            }
        }
    });
}

// -------------------------------------------------------------
// REMARKS & CHAT
// -------------------------------------------------------------
function renderRemarksThread(ticket) {
    const thread = document.getElementById('remarks-thread-box');
    const remarks = ticket.remarks || [];

    if (remarks.length === 0) {
        thread.innerHTML = `<div class="empty-state" style="padding:10px;font-size:11px;">No remarks given yet. Type an instruction below to guide this engineer.</div>`;
        return;
    }

    thread.innerHTML = remarks.map(r => `
        <div class="remark-bubble ${r.sender}">
            <div class="remark-sender">
                <span>${r.sender === 'admin' ? '🛡️ ' + r.author_name : '🤖 ' + r.author_name}</span>
                <span class="remark-time">${r.time}</span>
            </div>
            <div class="remark-text">${r.text}</div>
        </div>
    `).join('');
    thread.scrollTop = thread.scrollHeight;
}

async function submitAdminRemark(e) {
    e.preventDefault();
    if (!state.selected_ticket_id) return;
    const input = document.getElementById('admin-remark-input');
    const remark = input.value.trim();
    if (!remark) return;

    try {
        const res = await fetch('/api/tickets/remark', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                ticket_id: state.selected_ticket_id,
                remark: remark,
                admin_name: 'Farman (Chief Linux Architect)'
            })
        });
        const data = await res.json();
        if (data.success) {
            input.value = '';
            fetchState();
        } else {
            alert('Error sending remark: ' + data.error);
        }
    } catch (err) {
        alert('Network error sending remark: ' + err);
    }
}

function renderChatStream() {
    const box = document.getElementById('chat-stream-box');
    if (!box) return;

    const isAtBottom = box.scrollHeight - box.clientHeight <= box.scrollTop + 50;

    box.innerHTML = state.chat_messages.map(m => {
        const isClient = m.sender_id === 'CLIENT' || m.sender_id === 'ADMIN';
        return `
            <div class="chat-msg ${isClient ? 'client' : ''}">
                <div class="chat-avatar">${m.avatar}</div>
                <div class="chat-content">
                    <div class="chat-header">
                        <span class="chat-sender" style="color:${isClient ? '#38bdf8' : '#67e8f9'}">${m.sender_name}</span>
                        <span class="chat-role">${m.role}</span>
                        <span class="chat-time">${m.time}</span>
                    </div>
                    <div class="chat-body">${m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
                </div>
            </div>
        `;
    }).join('');

    if (isAtBottom) {
        box.scrollTop = box.scrollHeight;
    }
}

// -------------------------------------------------------------
// CLIENT PROJECT PORTAL & DELIVERY
// -------------------------------------------------------------
function renderPresets() {
    const container = document.getElementById('preset-container');
    if (!container || container.children.length > 0) return;

    state.presets.forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-btn';
        btn.innerHTML = `<span class="preset-title">⚡ ${p.title}</span><br><span style="font-size:11px;color:#9ca3af;">${p.description.substring(0, 75)}...</span>`;
        btn.onclick = () => {
            document.getElementById('project-title').value = p.title;
            document.getElementById('project-desc').value = p.description;
        };
        container.appendChild(btn);
    });
}

function renderClientProjectView() {
    renderPresets();
    const prj = state.project_state.project;
    const noView = document.getElementById('no-project-view');
    const actView = document.getElementById('active-project-view');
    const statusBadge = document.getElementById('project-status-badge');

    if (!prj) {
        noView.classList.remove('hidden');
        actView.classList.add('hidden');
        statusBadge.textContent = 'STANDBY';
        statusBadge.className = 'badge badge-status';
        return;
    }

    noView.classList.add('hidden');
    actView.classList.remove('hidden');

    document.getElementById('current-prj-title').textContent = prj.title;
    document.getElementById('current-phase-name').textContent = prj.current_phase ? prj.current_phase.name : 'Phase In Progress';
    document.getElementById('custodian-detail').textContent = prj.current_custodian || 'Management';

    const clock = document.getElementById('delivery-clock');
    const eta = prj.eta_seconds || 0;
    const mins = Math.floor(eta / 60);
    const secs = eta % 60;
    clock.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const delayBox = document.getElementById('delivery-delay-alert');
    if (prj.is_delayed) {
        delayBox.classList.remove('hidden');
        delayBox.innerHTML = `⚠️ <strong>DELIVERY PAUSED:</strong> ${prj.delay_reason || 'Blocked by Linux Tech Issue'}`;
    } else {
        delayBox.classList.add('hidden');
    }

    const stepper = document.getElementById('phase-stepper-container');
    const curIdx = prj.current_phase_index || 0;
    stepper.innerHTML = (state.phases || []).map((ph, idx) => {
        let cls = 'step-box';
        if (idx < curIdx) cls += ' completed';
        else if (idx === curIdx) cls += ' active';

        return `
            <div class="${cls}">
                <div>${idx < curIdx ? '✅' : idx === curIdx ? '⚡' : '○'}</div>
                <div>Phase ${ph.num}</div>
            </div>
        `;
    }).join('');

    const pkgCard = document.getElementById('delivery-package-card');
    if (prj.status === 'completed' || prj.status === 'accepted_by_client') {
        pkgCard.classList.remove('hidden');
        statusBadge.textContent = 'DELIVERED TO CLIENT';
        statusBadge.className = 'badge badge-success';
        
        if (prj.delivery_package) {
            const list = document.getElementById('deliverables-list-box');
            list.innerHTML = `
                <strong>Delivered Production Artifacts:</strong>
                <ul>
                    ${prj.delivery_package.deliverables.map(d => `<li>• ${d}</li>`).join('')}
                </ul>
                <div style="margin-top:6px;font-size:11px;color:#38bdf8;">
                    Handed over by: Vikram Sharma (General Manager) at ${prj.delivery_package.delivered_at}
                </div>
            `;
        }
    } else {
        pkgCard.classList.add('hidden');
        statusBadge.textContent = 'IN PROGRESS';
        statusBadge.className = 'badge badge-danger';
    }

    const tbody = document.getElementById('tasks-table-body');
    const tasks = state.project_state.tasks || [];
    tbody.innerHTML = tasks.slice(0, 16).map(t => {
        let badgeClass = 'badge';
        if (t.status === 'completed') badgeClass = 'badge badge-success';
        else if (t.status === 'working') badgeClass = 'badge badge-status';
        else if (t.status === 'blocked') badgeClass = 'badge badge-danger';

        return `
            <tr>
                <td style="font-weight:600;">${t.title}</td>
                <td><span class="badge" style="font-size:10px;">${t.dept}</span></td>
                <td>${t.assignee_name}</td>
                <td><span class="${badgeClass}">${t.status.toUpperCase()}</span></td>
                <td>
                    <div style="background:#1f2937;height:6px;width:60px;border-radius:3px;overflow:hidden;">
                        <div style="background:#38bdf8;height:100%;width:${t.progress}%"></div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function submitClientProject(e) {
    e.preventDefault();
    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-desc').value.trim();
    const client_name = document.getElementById('client-name').value.trim();

    if (!title) return alert('Please enter project title');

    try {
        const res = await fetch('/api/client/project', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title, description, client_name})
        });
        const data = await res.json();
        if (data.success) {
            alert(`🎉 Project "${title}" received by General Manager Vikram Sharma! Team mobilized!`);
            switchTab('tab-map');
            fetchState();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (err) {
        alert('Network error: ' + err);
    }
}

async function acceptClientDelivery() {
    try {
        const res = await fetch('/api/client/accept_delivery', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({rating: 5})
        });
        const data = await res.json();
        if (data.success) {
            playChime(true);
            alert('⭐⭐⭐⭐⭐ Project Accepted & Signed Off by Client Farman! 5-Star contract completed!');
            fetchState();
        }
    } catch (e) {
        alert('Error: ' + e);
    }
}

// -------------------------------------------------------------
// FULLSCREEN MASTER LINUX SHELL
// -------------------------------------------------------------
async function handleShellSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('terminal-input');
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';
    runShellCmd(cmd);
}

async function runShellCmd(cmd) {
    const term = document.getElementById('terminal-output');

    if (cmd === 'clear') {
        term.textContent = '';
        return;
    }

    term.textContent += `\n[root@rocky ~]# ${cmd}\n`;
    term.scrollTop = term.scrollHeight;

    try {
        const res = await fetch('/api/admin/exec', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({command: cmd})
        });
        const data = await res.json();
        if (data.clear_screen) {
            term.textContent = '';
        } else {
            term.textContent += `${data.output}\n`;
        }
        term.scrollTop = term.scrollHeight;
    } catch (err) {
        term.textContent += `Connection error: ${err}\n`;
        term.scrollTop = term.scrollHeight;
    }
}

// -------------------------------------------------------------
// 3D AGENT INSPECTOR & REPORTS HELPERS
// -------------------------------------------------------------
window.show3DAgentCard = function(emp) {
    if (!emp) return;
    const card = document.getElementById('agent-3d-card');
    if (!card) return;

    document.getElementById('a3d-avatar').textContent = emp.avatar || '👨‍💻';
    document.getElementById('a3d-name').textContent = emp.name;
    document.getElementById('a3d-role').textContent = emp.role;
    document.getElementById('a3d-dept').textContent = (emp.dept || 'engineering').toUpperCase();
    document.getElementById('a3d-ip').textContent = emp.ip || '192.168.18.100';
    document.getElementById('a3d-host').textContent = emp.hostname || 'workstation.corp.local';
    document.getElementById('a3d-status').textContent = (emp.status || 'active').toUpperCase();
    document.getElementById('a3d-task').textContent = emp.task || 'Awaiting assignment';

    // Find if agent is working on any project task
    const tasks = (state.project_state && state.project_state.tasks) || [];
    const activeTask = tasks.find(t => t.assignee_id === emp.id && t.status === 'working');
    if (activeTask) {
        document.getElementById('a3d-step').textContent = `${activeTask.sop_step_name || 'Step 2: Technical Execution'}`;
    } else {
        document.getElementById('a3d-step').textContent = 'Step 1: Constraint & Rule Validation';
    }

    card.classList.remove('hidden');
    window._selected3DAgent = emp;
};

window.closeAgent3DCard = function() {
    const card = document.getElementById('agent-3d-card');
    if (card) card.classList.add('hidden');
    window._selected3DAgent = null;
};

window.launchAgentVDIFrom3D = function() {
    const emp = window._selected3DAgent;
    if (!emp) return;

    // Check if this employee has an active ticket
    const ticket = (state.open_tickets || []).find(t => t.emp_id === emp.id);
    if (ticket) {
        switchTab('tab-lab');
        selectTicket(ticket.id);
    } else {
        switchTab('tab-terminal');
        const termInput = document.getElementById('terminal-input');
        if (termInput) {
            termInput.value = `ping -c 3 ${emp.ip || '192.168.18.100'}`;
            termInput.focus();
        }
    }
};

window.toggleViewMode = function() {
    const webgl = document.getElementById('webgl-container');
    const canvas2d = document.getElementById('officeCanvas');
    const btn = document.getElementById('btn-toggle-view');

    if (webgl.style.display !== 'none') {
        webgl.style.display = 'none';
        canvas2d.style.display = 'block';
        btn.textContent = '🌐 Switch to 3D WebGL Mode';
    } else {
        webgl.style.display = 'block';
        canvas2d.style.display = 'none';
        btn.textContent = '📐 Switch to 2D Blueprint Mode';
    }
};

function renderAgentReportsView() {
    const feed = document.getElementById('agent-reports-feed');
    const badge = document.getElementById('reports-badge');
    const reports = (state.project_state && state.project_state.agent_reports) || [];

    if (badge) badge.textContent = reports.length;

    if (!feed) return;

    if (reports.length === 0) {
        feed.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🤖</div>
                <h3>Awaiting Agent Reports</h3>
                <p>When tasks are executed by specialists in the project pipeline, their formal signoff reports will stream here in real time.</p>
            </div>
        `;
        return;
    }

    feed.innerHTML = reports.map(r => `
        <div class="report-item">
            <div class="rep-header">
                <span class="rep-id">📋 ${r.id}</span>
                <span class="rep-time">🕒 ${r.timestamp}</span>
            </div>
            <div class="rep-title">${r.task_title}</div>
            <div class="rep-meta">
                <strong>Reporting Agent:</strong> ${r.agent_name} (${r.agent_role}) | <span class="highlight-cyan">${(r.department || 'dev').toUpperCase()}</span>
            </div>
            <div class="rep-compliance">
                ${(r.rule_compliance || []).map(rc => `<span class="rep-pill">✅ ${rc}</span>`).join('')}
            </div>
            <div>
                <strong>Generated Artifact:</strong> <span class="rep-artifact">📦 ${r.deliverable_artifact}</span>
            </div>
            <div class="rep-reviewer">
                ✍️ <em>Audit Verified & Approved by: <strong>${r.reviewer}</strong></em>
            </div>
        </div>
    `).join('');
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    if (window.Office3D) {
        window.Office3D.init('webgl-container');
    }
    fetchState();
    setInterval(fetchState, 2000);
});
