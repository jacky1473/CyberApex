/**
 * CyberApex Virtual Office 3D Engine (Pure RPG Walk Mode)
 * Three.js WebGL Interactive Corporate Cyberpunk Office Simulator
 * Features:
 *   - Corrected, intuitive RPG Walk Mode navigation (No inverted controls)
 *   - Structured Overhead & Wall Cabling with Industrial Yellow Trays & Glowing Cable Labels
 *   - Dynamic Purchased Perks 3D Rendering (Espresso Machine, Dual 4K Displays, NVMe Array, AI Drone, Trophy, Arcade)
 *   - Bot Meeting & Break Relocation (Boardroom all-hands conference & Cyber Lounge chill time)
 *   - Cisco Packet Tracer Style Core Switch & Server Integration
 *   - 100% Isolated Sandbox Network (All LAN cable unplugs operate strictly inside office-sandbox namespace)
 */

window.Office3D = (function () {
    'use strict';

    // Three.js Core Globals
    let scene = null;
    let camera = null;
    let renderer = null;
    let container = null;
    let animId = null;
    let clock = null;
    let isInitialized = false;

    // Camera & Viewport State (RPG Walk Mode)
    let currentMode = 'walk';
    let walkPerspective = 'third'; // 'third' or 'first'
    let camDistance = 7.0;
    let camPitch = 0.32; // Elevation angle
    let camYaw = Math.PI; // Azimuth angle (starts looking towards South/Lobby)
    let isPointerDown = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let isDraggingView = false;
    let pointerDownPos = new THREE.Vector2();

    // Player (Farman) State
    let player = null;
    const PLAYER_COLLISION_RADIUS = 0.55;
    const keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false
    };

    // World & Raycasting State
    let botsMap = new Map();
    let raycaster = null;
    let mouse = new THREE.Vector2(-999, -999);
    let selectionRing = null;
    let currentNearbyBot = null;
    let nearServerSwitch = false;

    // Physical LAN & Server Infrastructure
    let switchRack = null;
    let switchPorts = [];
    const SWITCH_WORLD_POS = new THREE.Vector3(0, 1.2, -26.5);
    let lanCablesMap = new Map();
    let serverLeds = [];
    let overheadLaddersGroup = null;

    // Purchased Perks 3D Objects Registry
    let unlockedPerksSet = new Set();
    let perkObjects = {}; // id -> Three.Group / Object3D
    let aiSecurityDrone = null; // Drone object for animation

    // Architectural Collision & Sliding Door Systems
    let staticObstacles = [];
    let doorsList = [];
    let teleportRings = [];

    // 8 Room Definitions (3D World Coordinates)
    const ROOM_DEFS = {
        room_mgmt:    { name: "Executive Boardroom",       x: -30, z: -20, w: 26, d: 20, color: 0xf59e0b, icon: "👔" },
        room_noc:     { name: "Network Ops Center (NOC)",  x: 0,   z: -20, w: 26, d: 20, color: 0x10b981, icon: "🌐" },
        room_admin:   { name: "Linux Command Deck",        x: 30,  z: -20, w: 26, d: 20, color: 0xef4444, icon: "🛡️" },
        room_cafe:    { name: "Cyber Lounge & Cafe",       x: -30, z: 6,   w: 26, d: 20, color: 0xfbbf24, icon: "☕" },
        room_backend: { name: "Backend Bay",               x: 0,   z: 6,   w: 26, d: 20, color: 0x3b82f6, icon: "⚙️" },
        room_frontend:{ name: "Frontend Studio",           x: 30,  z: 6,   w: 26, d: 20, color: 0x06b6d4, icon: "💻" },
        room_devops:  { name: "DevOps War Room",           x: -16, z: 27,  w: 28, d: 16, color: 0x8b5cf6, icon: "🚀" },
        room_qa:      { name: "QA & Penetration Lab",      x: 16,  z: 27,  w: 28, d: 16, color: 0x14b8a6, icon: "🧪" }
    };

    // Teleport Destinations for Rooms (Position, Facing Direction)
    const TELEPORT_POINTS = {
        all:           { pos: new THREE.Vector3(0, 0, -4),    yaw: 0 },
        room_mgmt:     { pos: new THREE.Vector3(-30, 0, -11), yaw: Math.PI },
        room_noc:      { pos: new THREE.Vector3(0, 0, -11),   yaw: Math.PI },
        room_admin:    { pos: new THREE.Vector3(30, 0, -11),  yaw: Math.PI },
        room_cafe:     { pos: new THREE.Vector3(-30, 0, -3),  yaw: 0 },
        room_backend:  { pos: new THREE.Vector3(0, 0, -3),    yaw: 0 },
        room_frontend: { pos: new THREE.Vector3(30, 0, -3),   yaw: 0 },
        room_devops:   { pos: new THREE.Vector3(-16, 0, 20),  yaw: 0 },
        room_qa:       { pos: new THREE.Vector3(16, 0, 20),   yaw: 0 }
    };

    // Department Color Palette
    const DEPT_COLORS = {
        management: 0xf59e0b,
        network:    0x10b981,
        admin:      0xef4444,
        backend:    0x3b82f6,
        frontend:   0x06b6d4,
        devops:     0x8b5cf6,
        qa:         0x14b8a6,
        support:    0x10b981
    };

    // -------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------
    function init(containerId) {
        container = document.getElementById(containerId);
        if (!container) return;

        clock = new THREE.Clock();

        // 1. Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050811);
        scene.fog = new THREE.FogExp2(0x050811, 0.007);

        // 2. Camera
        const aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 300);

        // 3. Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.style.touchAction = 'none';
        container.appendChild(renderer.domElement);

        // Reset state
        staticObstacles = [];
        doorsList = [];
        serverLeds = [];
        teleportRings = [];
        unlockedPerksSet = new Set();
        perkObjects = {};

        // 4. Lighting & Environment
        setupLighting();

        // 5. Structure & Infrastructure
        buildFloor();
        buildPerimeterWalls();
        buildCeiling();
        buildOverheadCableLadders();
        buildRooms();
        buildBiophilicPlants();
        buildSelectionRing();

        // 6. Build Farman's Player Avatar
        player = buildPlayerAvatar();
        player.pos.set(0, 0, -4);
        player.rotY = Math.PI;
        camYaw = Math.PI;
        camPitch = 0.28;

        // 7. Raycaster & Events
        raycaster = new THREE.Raycaster();
        window.addEventListener('resize', onWindowResize);

        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // Show Walk HUD
        const hud = document.getElementById('walk-hud');
        if (hud) hud.classList.remove('hidden');

        isInitialized = true;
        animate();
    }

    // -------------------------------------------------------------
    // Lighting Setup
    // -------------------------------------------------------------
    function setupLighting() {
        const ambLight = new THREE.AmbientLight(0x475569, 1.15);
        scene.add(ambLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
        dirLight.position.set(30, 55, 30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 120;
        dirLight.shadow.camera.left = -55;
        dirLight.shadow.camera.right = 55;
        dirLight.shadow.camera.top = 45;
        dirLight.shadow.camera.bottom = -45;
        scene.add(dirLight);

        for (const [key, r] of Object.entries(ROOM_DEFS)) {
            const pLight = new THREE.PointLight(r.color, 1.1, 24);
            pLight.position.set(r.x, 5.2, r.z);
            scene.add(pLight);
        }

        const nocFlood = new THREE.PointLight(0x06b6d4, 1.8, 22);
        nocFlood.position.set(0, 5.0, -20);
        scene.add(nocFlood);
    }

    // -------------------------------------------------------------
    // Architecture: Floor, Ceiling & Exterior
    // -------------------------------------------------------------
    function buildFloor() {
        const floorGeo = new THREE.PlaneGeometry(104, 84);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x090e1a,
            roughness: 0.65,
            metalness: 0.25
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.05;
        floor.receiveShadow = true;
        scene.add(floor);

        const grid = new THREE.GridHelper(104, 52, 0x06b6d4, 0x1e293b);
        grid.position.y = 0.01;
        scene.add(grid);

        // Walkway Guide Carpet Runners
        const runnerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.6 });
        const ewRunner = new THREE.Mesh(new THREE.PlaneGeometry(96, 4.4), runnerMat);
        ewRunner.rotation.x = -Math.PI / 2;
        ewRunner.position.set(0, 0.02, -5.5);
        scene.add(ewRunner);

        const nsRunner = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 76), runnerMat);
        nsRunner.rotation.x = -Math.PI / 2;
        nsRunner.position.set(0, 0.02, 3);
        scene.add(nsRunner);

        // Neon Trim Guide Stripes
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 });
        [-2.2, 2.2].forEach(off => {
            const stripe = new THREE.Mesh(new THREE.PlaneGeometry(96, 0.06), stripeMat);
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.set(0, 0.03, -5.5 + off);
            scene.add(stripe);
        });
    }

    function buildPerimeterWalls() {
        const wallH = 4.2;
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x070c17, roughness: 0.85, metalness: 0.3 });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x0369a1,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            metalness: 0.95
        });
        const mullionMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });

        const walls = [
            { pos: [0, wallH / 2, -42], size: [104, wallH, 0.8], normal: 'north' },
            { pos: [0, wallH / 2, 42],  size: [104, wallH, 0.8], normal: 'south' },
            { pos: [-52, wallH / 2, 0], size: [0.8, wallH, 84],  normal: 'west' },
            { pos: [52, wallH / 2, 0],  size: [0.8, wallH, 84],  normal: 'east' }
        ];

        walls.forEach(w => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(...w.size), wallMat);
            wall.position.set(...w.pos);
            wall.receiveShadow = true;
            scene.add(wall);

            staticObstacles.push({
                minX: w.pos[0] - w.size[0] / 2,
                maxX: w.pos[0] + w.size[0] / 2,
                minZ: w.pos[2] - w.size[2] / 2,
                maxZ: w.pos[2] + w.size[2] / 2,
                type: 'boundary',
                name: 'Office Exterior Wall'
            });

            const isHorizontal = w.size[0] > w.size[2];
            const span = isHorizontal ? 104 : 84;
            const numPanels = Math.floor(span / 8);

            for (let p = 0; p < numPanels; p++) {
                const centerOffset = -span / 2 + 4 + p * 8;
                const winW = 6.2;
                const winH = 2.4;
                const winY = 2.3;

                const glassGeo = isHorizontal ? new THREE.BoxGeometry(winW, winH, 0.12) : new THREE.BoxGeometry(0.12, winH, winW);
                const glass = new THREE.Mesh(glassGeo, glassMat);
                if (isHorizontal) glass.position.set(centerOffset, winY, w.pos[2]);
                else glass.position.set(w.pos[0], winY, centerOffset);
                scene.add(glass);

                const mullionGeo = isHorizontal ? new THREE.BoxGeometry(0.18, 4.0, 0.3) : new THREE.BoxGeometry(0.3, 4.0, 0.18);
                const mullion = new THREE.Mesh(mullionGeo, mullionMat);
                if (isHorizontal) mullion.position.set(centerOffset - winW / 2, 2.0, w.pos[2]);
                else mullion.position.set(w.pos[0], 2.0, centerOffset - winW / 2);
                scene.add(mullion);
            }
        });
    }

    function buildCeiling() {
        const ceilingGeo = new THREE.PlaneGeometry(104, 84);
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0x070c17,
            roughness: 0.9,
            metalness: 0.2,
            side: THREE.BackSide
        });
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 3.85;
        scene.add(ceiling);

        const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
        for (let x = -40; x <= 40; x += 20) {
            for (let z = -30; z <= 30; z += 15) {
                const strip = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.5), fixtureMat);
                strip.position.set(x, 3.82, z);
                scene.add(strip);
            }
        }
    }

    // -------------------------------------------------------------
    // Industrial Overhead Yellow Cable Ladders / Wire Trays
    // -------------------------------------------------------------
    function buildOverheadCableLadders() {
        overheadLaddersGroup = new THREE.Group();
        const trayMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.75, roughness: 0.25 });
        const rodMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });

        // Helper to build a ladder segment
        function buildLadder(x1, z1, x2, z2, y = 3.42) {
            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.hypot(dx, dz);
            const angle = Math.atan2(dx, dz);

            const group = new THREE.Group();
            group.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
            group.rotation.y = angle;

            const w = 0.85; // tray width
            const sideRailGeo = new THREE.BoxGeometry(0.06, 0.12, length);

            const railLeft = new THREE.Mesh(sideRailGeo, trayMat);
            railLeft.position.set(-w / 2, 0, 0);
            group.add(railLeft);

            const railRight = new THREE.Mesh(sideRailGeo, trayMat);
            railRight.position.set(w / 2, 0, 0);
            group.add(railRight);

            // Rungs every 1.2m
            const numRungs = Math.floor(length / 1.2);
            for (let i = 0; i <= numRungs; i++) {
                const rz = -length / 2 + i * 1.2;
                const rung = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.06), trayMat);
                rung.position.set(0, -0.04, rz);
                group.add(rung);
            }

            // Ceiling threaded drop rods
            const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6);
            [-length / 3, length / 3].forEach(rz => {
                [-w / 2, w / 2].forEach(rx => {
                    const rod = new THREE.Mesh(rodGeo, rodMat);
                    rod.position.set(rx, 0.23, rz);
                    group.add(rod);
                });
            });

            overheadLaddersGroup.add(group);
        }

        // Main East-West Corridor Backbone Ladder
        buildLadder(-46, -5.5, 46, -5.5);

        // North-South Central Trunk Ladder leading directly into Server Room NOC
        buildLadder(0, -5.5, 0, -25.5);

        // Branch into Boardroom (West)
        buildLadder(-30, -5.5, -30, -18.5);

        // Branch into Command Deck (East)
        buildLadder(30, -5.5, 30, -18.5);

        // Branch into Backend Bay (South)
        buildLadder(0, -5.5, 0, 16.5);

        // 3D Industrial Overhead Cable Ladder Labels on Ceiling (Chhath)
        const ladderLabels = [
            { text: "🏷️ CEILING CABLE TRAY // TRUNK-10G // VLAN 10-100", pos: [0, 3.25, -6.0], scale: [6.5, 0.75, 1], color: 0xfacc15 },
            { text: "🏷️ NOC TRUNK // SERVER ROOM CORE // 40Gbps BACKBONE", pos: [0, 3.25, -15.5], scale: [7.0, 0.8, 1], color: 0x38bdf8 },
            { text: "🏷️ WEST RUN // BOARDROOM RISER // CAT6A", pos: [-22, 3.25, -5.5], scale: [5.5, 0.75, 1], color: 0x4ade80 },
            { text: "🏷️ EAST RUN // COMMAND DECK RISER // CAT6A", pos: [22, 3.25, -5.5], scale: [5.5, 0.75, 1], color: 0x4ade80 },
            { text: "🏷️ SOUTH BAY RUN // BACKEND & DEVOPS // CAT6A", pos: [0, 3.25, 8.5], scale: [6.0, 0.75, 1], color: 0x38bdf8 }
        ];

        ladderLabels.forEach(lbl => {
            const tag = createTextSprite(lbl.text, lbl.color);
            tag.position.set(lbl.pos[0], lbl.pos[1], lbl.pos[2]);
            tag.scale.set(lbl.scale[0], lbl.scale[1], lbl.scale[2]);
            overheadLaddersGroup.add(tag);
        });

        scene.add(overheadLaddersGroup);
    }

    // -------------------------------------------------------------
    // Structured Cabling with 3D Cable Labels Along Walls & Ceiling
    // -------------------------------------------------------------
    function createOrUpdateLanCable(emp, botPos, index) {
        if (!emp || !emp.id.startsWith("EMP-") || emp.id === "EMP-016") return;

        let cableEntry = lanCablesMap.get(emp.id);
        const isConnected = emp.lan_connected !== false;

        if (!cableEntry) {
            // Enterprise Structured Cabling Path:
            // 1. Desk PC RJ45 Port
            const pDesk = new THREE.Vector3(botPos.x - 0.35, 1.05, botPos.z - 0.40);
            // 2. Desk Baseboard Conduit Drop
            const pFloorDrop = new THREE.Vector3(botPos.x - 0.35, 0.25, botPos.z - 0.45);
            // 3. Wall Baseboard Raceway to Room Wall Riser
            const roomRiserX = (botPos.x < 0) ? (botPos.x - 2.5) : (botPos.x + 2.5);
            const pWallRiserBottom = new THREE.Vector3(roomRiserX, 0.25, botPos.z);
            // 4. Vertical Conduit Riser UP to Overhead Cable Ladder
            const pWallRiserTop = new THREE.Vector3(roomRiserX, 3.42, botPos.z);
            // 5. Overhead Corridor Cable Ladder Entry
            const pLadderEntry = new THREE.Vector3(roomRiserX, 3.42, -5.5);
            // 6. NOC Server Room Ceiling Trunk
            const pNocTrunk = new THREE.Vector3((index % 6 - 2.5) * 0.25, 3.42, -22.5);
            // 7. Ceiling Drop down into 24-Port Patch Panel above Core Switch
            const portCol = (index % 8);
            const portRow = Math.floor(index / 8);
            const portX = -0.55 + portCol * 0.38;
            const patchY = 4.15 - portRow * 0.20;
            const pPatchDrop = new THREE.Vector3(portX, patchY, SWITCH_WORLD_POS.z + 0.95);

            const curve = new THREE.CatmullRomCurve3([
                pDesk, pFloorDrop, pWallRiserBottom, pWallRiserTop, pLadderEntry, pNocTrunk, pPatchDrop
            ]);

            const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.055, 8, false);
            const mat = new THREE.MeshStandardMaterial({
                color: isConnected ? 0x00f0ff : 0xef4444,
                roughness: 0.25,
                metalness: 0.8,
                emissive: isConnected ? 0x004466 : 0x550000,
                emissiveIntensity: 0.8
            });
            const tubeMesh = new THREE.Mesh(tubeGeo, mat);
            scene.add(tubeMesh);

            // RJ45 Boot Collar
            const boot = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12),
                new THREE.MeshBasicMaterial({ color: isConnected ? 0x10b981 : 0xff0033 })
            );
            boot.position.copy(pDesk);
            scene.add(boot);

            // Data Packet Pulse
            const packet = new THREE.Mesh(
                new THREE.SphereGeometry(0.14, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
            );
            packet.visible = isConnected;
            scene.add(packet);

            // 3D Cable Labels (At Desk and at Patch Panel)
            const deskTag = createTextSprite(`🏷️ CAT6A: ${emp.id}`, isConnected ? 0x00f0ff : 0xef4444);
            deskTag.position.set(botPos.x - 0.35, 1.45, botPos.z - 0.40);
            deskTag.scale.set(2.2, 0.55, 1);
            scene.add(deskTag);

            const patchTag = createTextSprite(`P${index + 1}: ${emp.ip}`, isConnected ? 0x10b981 : 0xef4444);
            patchTag.position.set(portX, patchY + 0.35, SWITCH_WORLD_POS.z + 1.05);
            patchTag.scale.set(1.8, 0.45, 1);
            scene.add(patchTag);

            cableEntry = {
                mesh: tubeMesh,
                mat: mat,
                curve: curve,
                packet: packet,
                boot: boot,
                deskTag: deskTag,
                patchTag: patchTag,
                packetProgress: Math.random(),
                connected: isConnected,
                emp: emp
            };
            lanCablesMap.set(emp.id, cableEntry);
        } else {
            if (cableEntry.connected !== isConnected) {
                cableEntry.connected = isConnected;
                cableEntry.mat.color.setHex(isConnected ? 0x00f0ff : 0xef4444);
                cableEntry.mat.emissive.setHex(isConnected ? 0x004466 : 0x550000);
                cableEntry.boot.material.color.setHex(isConnected ? 0x10b981 : 0xff0033);
                cableEntry.packet.visible = isConnected;
            }
        }
    }

    // -------------------------------------------------------------
    // Dynamic Perks Purchased 3D Assets Rendering
    // -------------------------------------------------------------
    function syncPurchasedPerks(perksList) {
        if (!perksList) return;
        perksList.forEach(perkId => {
            if (!unlockedPerksSet.has(perkId)) {
                unlockedPerksSet.add(perkId);
                spawnPerk3D(perkId);
            }
        });
    }

    function spawnPerk3D(perkId) {
        if (perkObjects[perkId]) return;

        if (perkId === "espresso") {
            // ☕ Luxury Italian Barista Espresso Machine on Cafe Bar
            const cafeGroup = new THREE.Group();
            cafeGroup.position.set(-32.5, 2.2, 0.5);

            const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.1 });
            const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.2 });

            const boiler = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 1.4), chromeMat);
            cafeGroup.add(boiler);

            // Brass Top Dome
            const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.4, 16), brassMat);
            dome.position.y = 0.9;
            cafeGroup.add(dome);

            // Dual Portafilters
            [-0.55, 0.55].forEach(px => {
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), chromeMat);
                handle.rotation.x = Math.PI / 2;
                handle.position.set(px, -0.2, 0.8);
                cafeGroup.add(handle);

                // Ceramic Coffee Cup
                const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
                cup.position.set(px, -0.55, 0.7);
                cafeGroup.add(cup);
            });

            // Glowing Neon Banner
            const banner = createTextSprite("☕ CAFE FARMAN: BINDAS ESPRESSO", 0xf59e0b);
            banner.position.set(0, 2.2, 0);
            banner.scale.set(5.5, 1.2, 1);
            cafeGroup.add(banner);

            scene.add(cafeGroup);
            perkObjects[perkId] = cafeGroup;

        } else if (perkId === "monitors") {
            // 🖥️ Upgrade all desks with glowing animated dual screens & RGB underglow
            botsMap.forEach(bot => {
                if (bot.scrFace) {
                    bot.scrFace.material = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
                }
                // Add RGB LED strip under desk
                const ledStrip = new THREE.Mesh(
                    new THREE.BoxGeometry(2.6, 0.04, 0.06),
                    new THREE.MeshBasicMaterial({ color: 0x00f0ff })
                );
                ledStrip.position.set(0, 0.94, 0.7);
                bot.group.add(ledStrip);
            });
            perkObjects[perkId] = true;

        } else if (perkId === "nvme") {
            // 🚀 2U All-Flash NVMe Array in Server Room Rack
            const nvmeGroup = new THREE.Group();
            nvmeGroup.position.set(0, 1.8, -25.55);

            const chassis = new THREE.Mesh(
                new THREE.BoxGeometry(4.2, 0.65, 0.22),
                new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.9 })
            );
            nvmeGroup.add(chassis);

            // 24 Blinking NVMe Drive Sleds
            const nvmeLedMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            for (let i = 0; i < 24; i++) {
                const nx = -1.8 + (i % 12) * 0.32;
                const ny = (i < 12 ? 0.12 : -0.15);
                const sled = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.04), new THREE.MeshStandardMaterial({ color: 0x334155 }));
                sled.position.set(nx, ny, 0.12);
                nvmeGroup.add(sled);

                const led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), nvmeLedMat);
                led.position.set(nx, ny, 0.15);
                nvmeGroup.add(led);
                serverLeds.push({ mesh: led, mat: nvmeLedMat, colorHex: 0x00f0ff, phase: Math.random() * Math.PI, speed: 12 + Math.random() * 8 });
            }

            const badge = createTextSprite("🚀 100TB ALL-FLASH NVMe STORAGE ARRAY", 0x38bdf8);
            badge.position.set(0, 0.6, 0.15);
            badge.scale.set(4.8, 0.9, 1);
            nvmeGroup.add(badge);

            scene.add(nvmeGroup);
            perkObjects[perkId] = nvmeGroup;

        } else if (perkId === "firewall_ai") {
            // 🛡️ Autonomous AI Security Sentinel Drone Hovering in Lobby
            const droneGroup = new THREE.Group();
            droneGroup.position.set(0, 3.1, -4);

            const droneBody = new THREE.Mesh(
                new THREE.SphereGeometry(0.55, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 })
            );
            droneGroup.add(droneBody);

            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.24, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0x00f0ff })
            );
            eye.position.set(0, 0, -0.45);
            droneGroup.add(eye);

            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.85, 0.06, 8, 24),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
            );
            droneGroup.add(ring);

            // Scanning Laser Spotlight Cone
            const laser = new THREE.Mesh(
                new THREE.ConeGeometry(1.6, 3.0, 16, 1, true),
                new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
            );
            laser.rotation.x = Math.PI;
            laser.position.y = -1.5;
            droneGroup.add(laser);

            const badge = createTextSprite("🛡️ AI SENTINEL ACTIVE", 0x10b981);
            badge.position.set(0, 1.2, 0);
            badge.scale.set(3.2, 0.8, 1);
            droneGroup.add(badge);

            scene.add(droneGroup);
            aiSecurityDrone = { group: droneGroup, ring: ring, timer: 0 };
            perkObjects[perkId] = droneGroup;

        } else if (perkId === "trophy") {
            // 🏆 Golden Linux Penguin SysAdmin Trophy on Farman's Desk
            const trophyGroup = new THREE.Group();
            trophyGroup.position.set(30 - 0.35, 1.6, -20 - 0.35);

            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(0.25, 0.32, 0.25, 16),
                new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2 })
            );
            trophyGroup.add(base);

            const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.1 });
            const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.1, 0.5, 16), goldMat);
            cup.position.y = 0.35;
            trophyGroup.add(cup);

            const tag = createTextSprite("🏆 FARMAN: LINUX GRANDMASTER", 0xf59e0b);
            tag.position.set(0, 1.0, 0);
            tag.scale.set(3.4, 0.75, 1);
            trophyGroup.add(tag);

            scene.add(trophyGroup);
            perkObjects[perkId] = trophyGroup;

        } else if (perkId === "arcade") {
            // 🕹️ Retro Cyberpunk Arcade Cabinet in Cafe
            const arcGroup = new THREE.Group();
            arcGroup.position.set(-23.5, 1.8, 9.5);
            arcGroup.rotation.y = -Math.PI / 2;

            const cab = new THREE.Mesh(
                new THREE.BoxGeometry(1.6, 3.6, 1.4),
                new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 })
            );
            arcGroup.add(cab);

            const crt = new THREE.Mesh(
                new THREE.PlaneGeometry(1.2, 0.9),
                new THREE.MeshBasicMaterial({ color: 0x10b981 })
            );
            crt.position.set(0, 0.6, 0.71);
            arcGroup.add(crt);

            const marquee = createTextSprite("🕹️ CYBER-ARCADE", 0xec4899);
            marquee.position.set(0, 1.8, 0.71);
            marquee.scale.set(2.4, 0.6, 1);
            arcGroup.add(marquee);

            scene.add(arcGroup);
            perkObjects[perkId] = arcGroup;
        }
    }

    // -------------------------------------------------------------
    // Rooms, Cabins, Walls & Sliding Doors
    // -------------------------------------------------------------
    function buildRooms() {
        for (const [roomId, r] of Object.entries(ROOM_DEFS)) {
            const roomGroup = new THREE.Group();
            roomGroup.position.set(r.x, 0, r.z);

            const width = r.w - 1;
            const depth = r.d - 1;
            const hw = width / 2;
            const hd = depth / 2;

            const isNoc = (roomId === "room_noc");
            const tileMat = new THREE.MeshStandardMaterial({
                color: isNoc ? 0x06111f : 0x0f182c,
                roughness: isNoc ? 0.35 : 0.6,
                metalness: isNoc ? 0.65 : 0.25
            });
            const tile = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), tileMat);
            tile.rotation.x = -Math.PI / 2;
            tile.position.y = 0.02;
            tile.receiveShadow = true;
            roomGroup.add(tile);

            const edges = new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, depth)),
                new THREE.LineBasicMaterial({ color: r.color, linewidth: 2 })
            );
            edges.rotation.x = -Math.PI / 2;
            edges.position.y = 0.04;
            roomGroup.add(edges);

            const isTopRow = (roomId === "room_mgmt" || roomId === "room_noc" || roomId === "room_admin");
            const doorFace = isTopRow ? "south" : "north";

            buildRoomWallsAndDoors(roomGroup, roomId, r, width, depth, hw, hd, doorFace);

            if (roomId === "room_mgmt") {
                buildBoardroomTable(roomGroup);
            } else if (roomId === "room_noc" || roomId === "room_admin") {
                buildServerRacks(roomGroup, roomId === "room_admin" ? 0xef4444 : 0x10b981, isNoc);
                if (isNoc) {
                    buildCoreSwitchRack(roomGroup);
                    buildServerRoomCooling(roomGroup);
                }
            } else if (roomId === "room_cafe") {
                buildCafeBar(roomGroup);
            }

            scene.add(roomGroup);
        }
    }

    function buildRoomWallsAndDoors(roomGroup, roomId, r, width, depth, hw, hd, doorFace) {
        const wallH = 2.85;
        const dadoH = 0.95;
        const glassH = wallH - dadoH;
        const wallThick = 0.22;
        const doorW = 4.4;
        const doorH = 2.45;

        const dadoMat = new THREE.MeshStandardMaterial({ color: 0x0a101d, roughness: 0.7, metalness: 0.45 });
        const glassMat = new THREE.MeshStandardMaterial({
            color: r.color,
            transparent: true,
            opacity: 0.32,
            roughness: 0.08,
            metalness: 0.92
        });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
        const neonMat = new THREE.MeshBasicMaterial({ color: r.color });

        const roomX = roomGroup.position.x;
        const roomZ = roomGroup.position.z;

        function buildFullWall(length, isHorizontal, posX, posZ) {
            const wGroup = new THREE.Group();
            wGroup.position.set(posX, 0, posZ);

            const sizeDado = isHorizontal ? [length, dadoH, wallThick] : [wallThick, dadoH, length];
            const dado = new THREE.Mesh(new THREE.BoxGeometry(...sizeDado), dadoMat);
            dado.position.y = dadoH / 2;
            wGroup.add(dado);

            const sizeGlass = isHorizontal ? [length, glassH, wallThick * 0.5] : [wallThick * 0.5, glassH, length];
            const glass = new THREE.Mesh(new THREE.BoxGeometry(...sizeGlass), glassMat);
            glass.position.y = dadoH + glassH / 2;
            wGroup.add(glass);

            const sizeLintel = isHorizontal ? [length, 0.14, wallThick * 1.1] : [wallThick * 1.1, 0.14, length];
            const lintel = new THREE.Mesh(new THREE.BoxGeometry(...sizeLintel), trimMat);
            lintel.position.y = wallH;
            wGroup.add(lintel);

            const sizeNeon = isHorizontal ? [length, 0.04, 0.06] : [0.06, 0.04, length];
            const neon = new THREE.Mesh(new THREE.BoxGeometry(...sizeNeon), neonMat);
            neon.position.y = wallH + 0.08;
            wGroup.add(neon);

            roomGroup.add(wGroup);

            const halfX = (isHorizontal ? length : wallThick) / 2;
            const halfZ = (isHorizontal ? wallThick : length) / 2;
            staticObstacles.push({
                minX: roomX + posX - halfX,
                maxX: roomX + posX + halfX,
                minZ: roomZ + posZ - halfZ,
                maxZ: roomZ + posZ + halfZ,
                type: 'wall',
                name: `${r.name} Partition`
            });
        }

        if (doorFace === "south") {
            buildFullWall(width, true, 0, -hd);
            buildFullWall(depth, false, -hw, 0);
            buildFullWall(depth, false, hw, 0);
        } else {
            buildFullWall(width, true, 0, hd);
            buildFullWall(depth, false, -hw, 0);
            buildFullWall(depth, false, hw, 0);
        }

        const doorWallZ = (doorFace === "south") ? hd : -hd;
        const flankW = (width - doorW) / 2;

        [-hw + flankW / 2, hw - flankW / 2].forEach(fx => {
            const fGroup = new THREE.Group();
            fGroup.position.set(fx, 0, doorWallZ);

            const dado = new THREE.Mesh(new THREE.BoxGeometry(flankW, dadoH, wallThick), dadoMat);
            dado.position.y = dadoH / 2;
            fGroup.add(dado);

            const glass = new THREE.Mesh(new THREE.BoxGeometry(flankW, glassH, wallThick * 0.5), glassMat);
            glass.position.y = dadoH + glassH / 2;
            fGroup.add(glass);

            const lintel = new THREE.Mesh(new THREE.BoxGeometry(flankW, 0.14, wallThick * 1.1), trimMat);
            lintel.position.y = wallH;
            fGroup.add(lintel);

            roomGroup.add(fGroup);

            staticObstacles.push({
                minX: roomX + fx - flankW / 2,
                maxX: roomX + fx + flankW / 2,
                minZ: roomZ + doorWallZ - wallThick / 2,
                maxZ: roomZ + doorWallZ + wallThick / 2,
                type: 'wall',
                name: `${r.name} Doorway Flank`
            });
        });

        const archGeo = new THREE.BoxGeometry(doorW + 0.4, wallH - doorH, wallThick * 1.1);
        const archMesh = new THREE.Mesh(archGeo, dadoMat);
        archMesh.position.set(0, doorH + (wallH - doorH) / 2, doorWallZ);
        roomGroup.add(archMesh);

        const rfidLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const rfidLed = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), rfidLedMat);
        rfidLed.position.set(doorW / 2 + 0.35, 1.54, doorWallZ + (doorFace === "south" ? 0.20 : -0.20));
        roomGroup.add(rfidLed);

        const signSprite = createTextSprite(`${r.icon} ${r.name.toUpperCase()}`, r.color);
        signSprite.position.set(0, wallH + 0.85, doorWallZ);
        signSprite.scale.set(6.4, 1.4, 1);
        roomGroup.add(signSprite);

        const leafW = (doorW / 2) + 0.1;
        const leafH = doorH - 0.08;
        const leafThick = 0.06;
        const leafGeo = new THREE.BoxGeometry(leafW, leafH, leafThick);
        const leafMat = new THREE.MeshStandardMaterial({
            color: r.color,
            transparent: true,
            opacity: 0.45,
            roughness: 0.1,
            metalness: 0.9
        });
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.95 });

        const leftLeafGroup = new THREE.Group();
        const leftLeaf = new THREE.Mesh(leafGeo, leafMat);
        leftLeaf.position.set(-leafW / 2, leafH / 2, 0);
        leftLeafGroup.add(leftLeaf);
        const leftHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), handleMat);
        leftHandle.position.set(-0.15, leafH / 2, 0.06);
        leftLeafGroup.add(leftHandle);
        leftLeafGroup.position.set(0, 0, doorWallZ);
        roomGroup.add(leftLeafGroup);

        const rightLeafGroup = new THREE.Group();
        const rightLeaf = new THREE.Mesh(leafGeo, leafMat);
        rightLeaf.position.set(leafW / 2, leafH / 2, 0);
        rightLeafGroup.add(rightLeaf);
        const rightHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), handleMat);
        rightHandle.position.set(0.15, leafH / 2, 0.06);
        rightLeafGroup.add(rightHandle);
        rightLeafGroup.position.set(0, 0, doorWallZ);
        roomGroup.add(rightLeafGroup);

        const doorObstacle = {
            minX: roomX - doorW / 2,
            maxX: roomX + doorW / 2,
            minZ: roomZ + doorWallZ - wallThick / 2,
            maxZ: roomZ + doorWallZ + wallThick / 2,
            type: 'door',
            name: `${r.name} Sliding Door`,
            doorRef: null
        };
        staticObstacles.push(doorObstacle);

        const doorEntry = {
            roomId: roomId,
            worldX: roomX,
            worldZ: roomZ + doorWallZ,
            leftGroup: leftLeafGroup,
            rightGroup: rightLeafGroup,
            obstacle: doorObstacle,
            rfidLedMat: rfidLedMat,
            openDist: leafW * 0.95,
            currentOpen: 0,
            targetOpen: 0
        };
        doorObstacle.doorRef = doorEntry;
        doorsList.push(doorEntry);
    }

    // -------------------------------------------------------------
    // High-Fidelity Server Room & NOC Graphics
    // -------------------------------------------------------------
    function buildServerRacks(group, ledColor, isNoc) {
        const rackGeo = new THREE.BoxGeometry(2.4, 4.6, 1.35);
        const rackMat = new THREE.MeshStandardMaterial({ color: 0x070b14, roughness: 0.35, metalness: 0.85 });
        const glassDoorMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            transparent: true,
            opacity: 0.32,
            roughness: 0.08,
            metalness: 0.92
        });
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.95 });
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
        const caddyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.5 });

        const roomX = group.position.x;
        const roomZ = group.position.z;

        for (let i = -1; i <= 1; i += 2) {
            const posX = i * 9;
            const posZ = -6.5;

            staticObstacles.push({
                minX: roomX + posX - 1.35,
                maxX: roomX + posX + 1.35,
                minZ: roomZ + posZ - 0.8,
                maxZ: roomZ + posZ + 0.8,
                type: 'rack',
                name: '42U Server Rack'
            });

            const rackGroup = new THREE.Group();
            rackGroup.position.set(posX, 2.3, posZ);

            const rack = new THREE.Mesh(rackGeo, rackMat);
            rack.castShadow = true;
            rackGroup.add(rack);

            const door = new THREE.Mesh(new THREE.BoxGeometry(2.32, 4.42, 0.04), glassDoorMat);
            door.position.set(0, 0, 0.69);
            rackGroup.add(door);

            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 12), chromeMat);
            handle.position.set(0.98, 0, 0.73);
            rackGroup.add(handle);

            for (let b = 0; b < 6; b++) {
                const bladeY = -1.65 + b * 0.65;
                const blade = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.15), bladeMat);
                blade.position.set(0, bladeY, 0.05);
                rackGroup.add(blade);

                for (let c = 0; c < 4; c++) {
                    const caddy = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.04), caddyMat);
                    caddy.position.set(-0.75 + c * 0.45, bladeY, 0.64);
                    rackGroup.add(caddy);

                    const pwrLed = new THREE.Mesh(
                        new THREE.BoxGeometry(0.04, 0.04, 0.02),
                        new THREE.MeshBasicMaterial({ color: 0x10b981 })
                    );
                    pwrLed.position.set(-0.85 + c * 0.45, bladeY + 0.12, 0.67);
                    rackGroup.add(pwrLed);

                    const actLedMat = new THREE.MeshBasicMaterial({ color: ledColor });
                    const actLed = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), actLedMat);
                    actLed.position.set(-0.85 + c * 0.45, bladeY - 0.12, 0.67);
                    rackGroup.add(actLed);

                    serverLeds.push({
                        mesh: actLed,
                        mat: actLedMat,
                        colorHex: ledColor,
                        phase: Math.random() * Math.PI * 2,
                        speed: 3 + Math.random() * 8
                    });
                }
            }

            group.add(rackGroup);
        }

        if (isNoc) {
            const grateMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.3 });
            for (let gx = -10; gx <= 10; gx += 4) {
                const grate = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), grateMat);
                grate.rotation.x = -Math.PI / 2;
                grate.position.set(gx, 0.03, -1);
                group.add(grate);
            }
        }
    }

    function buildCoreSwitchRack(group) {
        switchPorts = [];
        const rackGroup = new THREE.Group();
        rackGroup.position.set(0, 0, -6.5);

        const rackGeo = new THREE.BoxGeometry(4.8, 5.5, 1.85);
        const rackMat = new THREE.MeshStandardMaterial({ color: 0x070b14, roughness: 0.35, metalness: 0.85 });
        const rack = new THREE.Mesh(rackGeo, rackMat);
        rack.position.set(0, 2.75, 0);
        rack.castShadow = true;
        rackGroup.add(rack);

        staticObstacles.push({
            minX: -2.55,
            maxX: 2.55,
            minZ: -27.6,
            maxZ: -25.4,
            type: 'rack',
            name: 'Central 10G Core Switch Rack'
        });

        const ppMesh = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.65, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.75 })
        );
        ppMesh.position.set(0, 4.05, 0.93);
        rackGroup.add(ppMesh);

        const swMesh = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.88, 0.20),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.9 })
        );
        swMesh.position.set(0, 3.20, 0.94);
        rackGroup.add(swMesh);

        const oled = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 0.32),
            new THREE.MeshBasicMaterial({ color: 0x0284c7 })
        );
        oled.position.set(-1.3, 3.20, 1.05);
        rackGroup.add(oled);

        const cordColors = [0x00f0ff, 0x10b981, 0x3b82f6, 0xf59e0b, 0x8b5cf6];
        for (let i = 0; i < 15; i++) {
            const col = i % 8;
            const row = Math.floor(i / 8);
            const portX = -0.55 + col * 0.38;
            const portY = 3.34 - row * 0.28;
            const patchY = 4.15 - row * 0.20;

            const portMesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.18, 0.14, 0.08),
                new THREE.MeshBasicMaterial({ color: 0x10b981 })
            );
            portMesh.position.set(portX, portY, 1.02);
            rackGroup.add(portMesh);

            const patchJack = new THREE.Mesh(
                new THREE.BoxGeometry(0.16, 0.12, 0.06),
                new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
            );
            patchJack.position.set(portX, patchY, 1.01);
            rackGroup.add(patchJack);

            const pCurve = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(portX, portY, 1.05),
                new THREE.Vector3(portX, (portY + patchY) / 2, 1.24),
                new THREE.Vector3(portX, patchY, 1.04)
            );
            const pTube = new THREE.Mesh(
                new THREE.TubeGeometry(pCurve, 10, 0.02, 6, false),
                new THREE.MeshStandardMaterial({
                    color: cordColors[i % cordColors.length],
                    roughness: 0.35,
                    metalness: 0.6
                })
            );
            rackGroup.add(pTube);

            switchPorts.push({
                mesh: portMesh,
                empId: `EMP-${String(i + 1).padStart(3, '0')}`,
                connected: true
            });
        }

        const swTitle = createTextSprite("🌐 CISCO CATALYST 10G CORE SWITCH", 0x06b6d4);
        swTitle.position.set(0, 6.0, 0);
        swTitle.scale.set(8.0, 1.6, 1);
        rackGroup.add(swTitle);

        group.add(rackGroup);
        switchRack = rackGroup;
    }

    function buildServerRoomCooling(group) {
        const pacGroup = new THREE.Group();
        pacGroup.position.set(5.5, 2.3, -6.5);

        const pacBody = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 4.6, 1.35),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 })
        );
        pacGroup.add(pacBody);

        const louverMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
        for (let l = 0; l < 8; l++) {
            const louver = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.04), louverMat);
            louver.position.set(0, -1.5 + l * 0.45, 0.69);
            pacGroup.add(louver);
        }

        const lcd = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.3), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
        lcd.position.set(0, 1.7, 0.70);
        pacGroup.add(lcd);

        group.add(pacGroup);
    }

    // -------------------------------------------------------------
    // Interior Furnishings: Lounge & Boardroom
    // -------------------------------------------------------------
    function buildCafeBar(group) {
        staticObstacles.push({
            minX: -35.2,
            maxX: -24.8,
            minZ: -0.8,
            maxZ: 1.8,
            type: 'furniture',
            name: 'Cyber Cafe Bar'
        });

        const bar = new THREE.Mesh(
            new THREE.BoxGeometry(10, 1.4, 2.2),
            new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3 })
        );
        bar.position.set(0, 0.7, -5.5);
        bar.castShadow = true;
        group.add(bar);

        // Sectional Sofa
        const sofaMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
        const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.5, 2.2), sofaMat);
        sofaSeat.position.set(0, 0.35, 3.5);
        group.add(sofaSeat);

        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(7.0, 1.1, 0.4), sofaMat);
        sofaBack.position.set(0, 0.9, 4.5);
        group.add(sofaBack);

        // Glass Coffee Table
        const table = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.1, 1.8),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.5, metalness: 0.9 })
        );
        table.position.set(0, 0.45, 1.2);
        group.add(table);

        // Vending Machine
        const vend = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 4.2, 1.4),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.85 })
        );
        vend.position.set(8.5, 2.1, -5.5);
        group.add(vend);

        const vendGlass = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 2.6, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.4 })
        );
        vendGlass.position.set(8.5, 2.4, -4.75);
        group.add(vendGlass);
    }

    function buildBoardroomTable(group) {
        staticObstacles.push({
            minX: -36.5,
            maxX: -23.5,
            minZ: -24.5,
            maxZ: -15.5,
            type: 'furniture',
            name: 'Boardroom Conference Table'
        });

        const table = new THREE.Mesh(
            new THREE.BoxGeometry(13.0, 0.4, 5.5),
            new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2, metalness: 0.7 })
        );
        table.position.set(0, 1.2, 0);
        table.castShadow = true;
        group.add(table);

        const track = new THREE.Mesh(
            new THREE.BoxGeometry(9.0, 0.04, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 })
        );
        track.position.set(0, 1.42, 0);
        group.add(track);

        const screen = new THREE.Mesh(new THREE.BoxGeometry(8.5, 3.2, 0.12), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
        screen.position.set(0, 2.7, -9.6);
        group.add(screen);
    }

    function buildBiophilicPlants() {
        const plantPositions = [
            [-14, -2], [14, -2],
            [-41, 14], [-19, 14],
            [-41, -28], [-19, -28],
            [41, -28], [19, -28],
            [-2, 19], [2, 19]
        ];

        const potMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.6 });
        const soilMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4, side: THREE.DoubleSide });

        plantPositions.forEach(([px, pz]) => {
            const plantGroup = new THREE.Group();
            plantGroup.position.set(px, 0, pz);

            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.9, 8), potMat);
            pot.position.y = 0.45;
            plantGroup.add(pot);

            const soil = new THREE.Mesh(new THREE.CircleGeometry(0.42, 8), soilMat);
            soil.rotation.x = -Math.PI / 2;
            soil.position.y = 0.88;
            plantGroup.add(soil);

            for (let l = 0; l < 7; l++) {
                const angle = (l / 7) * Math.PI * 2;
                const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 5), leafMat);
                leaf.position.set(Math.cos(angle) * 0.2, 1.25, Math.sin(angle) * 0.2);
                leaf.rotation.set(Math.sin(angle) * 0.45, angle, Math.cos(angle) * 0.45);
                plantGroup.add(leaf);
            }

            scene.add(plantGroup);
        });
    }

    function buildSelectionRing() {
        const ringGeo = new THREE.RingGeometry(1.6, 1.9, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });
        selectionRing = new THREE.Mesh(ringGeo, ringMat);
        selectionRing.rotation.x = -Math.PI / 2;
        selectionRing.position.y = 0.06;
        selectionRing.visible = false;
        scene.add(selectionRing);
    }

    // -------------------------------------------------------------
    // Farman Player Avatar (Walk Mode Character)
    // -------------------------------------------------------------
    function buildPlayerAvatar() {
        const pGroup = new THREE.Group();
        pGroup.position.set(0, 0, -4);

        const charGroup = new THREE.Group();
        charGroup.position.set(0, 0.8, 0);

        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 1.1, 0.55),
            new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.5 })
        );
        torso.position.set(0, 0.65, 0);
        torso.castShadow = true;
        charGroup.add(torso);

        const padMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
        [-0.55, 0.55].forEach(sx => {
            const pad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.45), padMat);
            pad.position.set(sx, 1.15, 0);
            charGroup.add(pad);
        });

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.48, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
        );
        head.position.set(0, 1.5, 0);
        charGroup.add(head);

        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.68, 0.18, 0.28),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff })
        );
        visor.position.set(0, 1.5, -0.38);
        charGroup.add(visor);

        const armMat = new THREE.MeshStandardMaterial({ color: 0x047857 });
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), armMat);
        leftArm.position.set(-0.6, 0.55, 0);
        charGroup.add(leftArm);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), armMat);
        rightArm.position.set(0.6, 0.55, 0);
        charGroup.add(rightArm);

        const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), legMat);
        leftLeg.position.set(-0.25, -0.42, 0);
        charGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), legMat);
        rightLeg.position.set(0.25, -0.42, 0);
        charGroup.add(rightLeg);

        pGroup.add(charGroup);

        const nameSprite = createTextSprite("👑 Farman (You)", 0x10b981);
        nameSprite.position.set(0, 2.45, 0);
        nameSprite.scale.set(2.4, 0.6, 1);
        pGroup.add(nameSprite);

        const aura = new THREE.Mesh(
            new THREE.RingGeometry(1.2, 1.45, 32),
            new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
        aura.rotation.x = -Math.PI / 2;
        aura.position.y = 0.04;
        pGroup.add(aura);

        scene.add(pGroup);

        return {
            group: pGroup,
            charGroup: charGroup,
            leftArm: leftArm,
            rightArm: rightArm,
            leftLeg: leftLeg,
            rightLeg: rightLeg,
            aura: aura,
            pos: new THREE.Vector3(0, 0, -4),
            rotY: Math.PI,
            walkTimer: 0
        };
    }

    // -------------------------------------------------------------
    // Bot Workstations & Dual Monitors
    // -------------------------------------------------------------
    function createBotMesh(emp) {
        const botGroup = new THREE.Group();
        botGroup.userData = { empId: emp.id, empData: emp };

        const deptColor = DEPT_COLORS[emp.dept] || 0x3b82f6;

        const desk = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.12, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.3 })
        );
        desk.position.set(0, 1.0, 0);
        desk.castShadow = true;
        botGroup.add(desk);

        const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
        [[-1.3, -0.65], [1.3, -0.65], [-1.3, 0.65], [1.3, 0.65]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), legMat);
            leg.position.set(lx, 0.5, lz);
            botGroup.add(leg);
        });

        const monStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), legMat);
        monStem.position.set(-0.35, 1.28, -0.35);
        botGroup.add(monStem);

        const scr1Bezel = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.95, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x0f172a })
        );
        scr1Bezel.position.set(-0.35, 1.7, -0.35);
        botGroup.add(scr1Bezel);

        const scr1Face = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 0.85),
            new THREE.MeshBasicMaterial({ color: deptColor })
        );
        scr1Face.position.set(-0.35, 1.7, -0.30);
        botGroup.add(scr1Face);

        // Portrait Coding Monitor
        const scr2Group = new THREE.Group();
        scr2Group.position.set(0.85, 1.8, -0.30);
        scr2Group.rotation.y = -0.35;

        const scr2Bezel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.5, 0.08), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        scr2Group.add(scr2Bezel);

        const scr2Face = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.4), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
        scr2Face.position.z = 0.05;
        scr2Group.add(scr2Face);
        botGroup.add(scr2Group);

        const rj45Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.06), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
        rj45Mesh.position.set(-0.35, 1.35, -0.40);
        botGroup.add(rj45Mesh);

        const charGroup = new THREE.Group();
        charGroup.position.set(0, 0.8, 0.7);

        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 1.1, 0.55),
            new THREE.MeshStandardMaterial({ color: deptColor, roughness: 0.4, metalness: 0.2 })
        );
        torso.position.set(0, 0.65, 0);
        charGroup.add(torso);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.45, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 })
        );
        head.position.set(0, 1.5, 0);
        charGroup.add(head);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.25), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
        visor.position.set(0, 1.5, -0.35);
        charGroup.add(visor);

        botGroup.add(charGroup);

        const beacon = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 24), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
        beacon.rotation.x = Math.PI / 2;
        beacon.position.set(0, 2.2, 0);
        botGroup.add(beacon);

        const nameSprite = createTextSprite(`${emp.avatar || '🧑‍💻'} ${emp.name}`, deptColor);
        nameSprite.position.set(0, 2.7, 0);
        nameSprite.scale.set(4.2, 1.05, 1);
        botGroup.add(nameSprite);

        return {
            group: botGroup,
            beacon: beacon,
            nameSprite: nameSprite,
            charGroup: charGroup,
            rj45Mesh: rj45Mesh,
            scrFace: scr1Face,
            empData: emp,
            targetPos: new THREE.Vector3(),
            isWalking: false
        };
    }

    function createTextSprite(text, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(7, 11, 20, 0.88)';
        roundRect(ctx, 4, 4, 504, 120, 16);
        ctx.fill();

        ctx.strokeStyle = '#' + colorHex.toString(16).padStart(6, '0');
        ctx.lineWidth = 6;
        roundRect(ctx, 4, 4, 504, 120, 16);
        ctx.stroke();

        ctx.font = 'bold 36px "Fira Code", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // -------------------------------------------------------------
    // 3D Spatial Relocation for Meetings & Breaks
    // -------------------------------------------------------------
    function map2Dto3D(emp, index) {
        const status = emp.status;

        // 1. Boardroom All-Hands Architecture Meeting
        if (status === "meeting") {
            const tableCenter = { x: -30, z: -20 };
            let tx, tz, trotY;
            if (index < 6) {
                // North side chairs
                tx = tableCenter.x - 5.0 + index * 2.0;
                tz = tableCenter.z - 2.8;
                trotY = 0; // Face South into table
            } else if (index < 12) {
                // South side chairs
                tx = tableCenter.x - 5.0 + (index - 6) * 2.0;
                tz = tableCenter.z + 2.8;
                trotY = Math.PI; // Face North into table
            } else {
                // East / West ends
                tx = (index % 2 === 0) ? (tableCenter.x + 6.2) : (tableCenter.x - 6.2);
                tz = tableCenter.z;
                trotY = (index % 2 === 0) ? -Math.PI / 2 : Math.PI / 2;
            }
            return { x: tx, y: 0, z: tz, rotY: trotY, isSpecialMode: true };
        }

        // 2. Cyber Lounge & Cafeteria Chill Break ("Bindas Kaam!")
        if (status === "coffee") {
            const cafeCenter = { x: -30, z: 6 };
            let cx, cz, crotY;
            if (index < 5) {
                // Sectional sofa relaxing
                cx = cafeCenter.x - 3.0 + index * 1.5;
                cz = cafeCenter.z + 3.5;
                crotY = Math.PI;
            } else if (index < 10) {
                // Coffee bar espresso line
                cx = cafeCenter.x - 4.0 + (index - 5) * 1.6;
                cz = cafeCenter.z - 5.0;
                crotY = 0;
            } else {
                // Vending machine & arcade
                cx = cafeCenter.x + 6.5;
                cz = cafeCenter.z - 4.0 + (index - 10) * 1.8;
                crotY = -Math.PI / 2;
            }
            return { x: cx, y: 0, z: cz, rotY: crotY, isSpecialMode: true };
        }

        // 3. Normal Assigned Desk Workstation
        const room = ROOM_DEFS[emp.room_id] || ROOM_DEFS.room_backend;
        const col = index % 2;
        const row = Math.floor((index % 4) / 2);
        const offsetX = (col === 0 ? -6 : 6);
        const offsetZ = (row === 0 ? -3 : 4);
        return { x: room.x + offsetX, y: 0, z: room.z + offsetZ, rotY: 0, isSpecialMode: false };
    }

    // -------------------------------------------------------------
    // Update Bots & Synced Perks from Polling State
    // -------------------------------------------------------------
    function updateBots(employees, playerStats) {
        if (!scene || !employees) return;

        // Synchronize purchased perks
        if (playerStats && playerStats.unlocked_perks) {
            syncPurchasedPerks(playerStats.unlocked_perks);
        }

        employees.forEach((emp, index) => {
            if (emp.id === "EMP-016") return;

            let bot = botsMap.get(emp.id);
            const target = map2Dto3D(emp, index);

            if (!bot) {
                bot = createBotMesh(emp);
                bot.group.position.set(target.x, target.y, target.z);
                scene.add(bot.group);
                botsMap.set(emp.id, bot);
            }

            bot.empData = emp;
            bot.targetPos.set(target.x, target.y, target.z);

            // Smooth position glide to meeting/cafe
            const dist = bot.group.position.distanceTo(bot.targetPos);
            if (dist > 0.3) {
                bot.group.position.lerp(bot.targetPos, 0.08);
                if (target.rotY !== undefined) {
                    bot.group.rotation.y = THREE.MathUtils.lerp(bot.group.rotation.y, target.rotY, 0.1);
                }
            } else {
                bot.group.position.copy(bot.targetPos);
                if (target.rotY !== undefined) {
                    bot.group.rotation.y = target.rotY;
                }
            }

            const isBlocked = (emp.status === "blocked");
            const isLanDown = (emp.lan_connected === false);

            if (isBlocked || isLanDown) {
                bot.beacon.material.color.setHex(0xef4444);
                bot.scrFace.material.color.setHex(0xef4444);
                bot.rj45Mesh.material.color.setHex(0xef4444);
            } else if (emp.status === "meeting") {
                bot.beacon.material.color.setHex(0xf59e0b);
            } else if (emp.status === "coffee") {
                bot.beacon.material.color.setHex(0xfbbf24);
            } else {
                bot.beacon.material.color.setHex(0x10b981);
                bot.scrFace.material.color.setHex(DEPT_COLORS[emp.dept] || 0x3b82f6);
                bot.rj45Mesh.material.color.setHex(0x10b981);
            }

            // Always anchor structured cables to their assigned desk position
            const room = ROOM_DEFS[emp.room_id] || ROOM_DEFS.room_backend;
            const col = index % 2;
            const row = Math.floor((index % 4) / 2);
            const deskPos = { x: room.x + (col === 0 ? -6 : 6), y: 0, z: room.z + (row === 0 ? -3 : 4) };
            createOrUpdateLanCable(emp, deskPos, index);
        });

        // Switch Rack Ports
        if (switchPorts && switchPorts.length > 0) {
            switchPorts.forEach(port => {
                const emp = employees.find(e => e.id === port.empId);
                if (emp) {
                    const isUp = (emp.lan_connected !== false);
                    port.mesh.material.color.setHex(isUp ? 0x10b981 : 0xef4444);
                }
            });
        }
    }

    // -------------------------------------------------------------
    // Pointer Drag & Non-Inverted Navigation
    // -------------------------------------------------------------
    function onPointerDown(e) {
        isPointerDown = true;
        isDraggingView = false;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        pointerDownPos.set(e.clientX, e.clientY);
    }

    function onPointerMove(e) {
        if (container) {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        }

        if (!isPointerDown) return;

        const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
        if (dist > 6) {
            isDraggingView = true;
        }

        const deltaX = e.clientX - lastPointerX;
        const deltaY = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;

        camYaw -= deltaX * 0.0055;
        camPitch = Math.max(-0.05, Math.min(1.10, camPitch + deltaY * 0.0045));
    }

    function onPointerUp(e) {
        if (!isDraggingView) {
            raycastBotSelection();
        }
        isPointerDown = false;
        isDraggingView = false;
    }

    function onWheel(e) {
        e.preventDefault();
        camDistance = Math.max(2.8, Math.min(13.0, camDistance + e.deltaY * 0.006));
    }

    function raycastBotSelection() {
        if (!raycaster || !camera) return;
        raycaster.setFromCamera(mouse, camera);

        // 1. Check if user clicked on Core Cisco Switch Rack
        if (switchRack) {
            const swHits = raycaster.intersectObject(switchRack, true);
            if (swHits.length > 0) {
                if (window.openCiscoSwitchModal) {
                    window.openCiscoSwitchModal();
                    return;
                }
            }
        }

        const meshes = [];
        botsMap.forEach(bot => {
            bot.group.traverse(child => {
                if (child.isMesh) {
                    child.userData.botId = bot.empData.id;
                    meshes.push(child);
                }
            });
        });

        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length > 0) {
            const hitId = hits[0].object.userData.botId;
            if (hitId) focusBot(hitId);
        }
    }

    function onKeyDown(e) {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;

        if (e.code === 'KeyW' || e.code === 'ArrowUp') { keys.forward = true; e.preventDefault(); }
        else if (e.code === 'KeyS' || e.code === 'ArrowDown') { keys.backward = true; e.preventDefault(); }
        else if (e.code === 'KeyA' || e.code === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
        else if (e.code === 'KeyD' || e.code === 'ArrowRight') { keys.right = true; e.preventDefault(); }
        else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { keys.sprint = true; }
        else if (e.code === 'KeyE' || e.code === 'Space') { interactWithCurrentBot(); }
        else if (e.code === 'KeyL') { toggleLanForNearby(); }
        else if (e.code === 'KeyV') { togglePerspective(); }
        else if (e.code === 'KeyR') { teleportTo('all'); }
        else if (e.code === 'KeyM') { if (window.callAllHandsMeeting) window.callAllHandsMeeting(); }
        else if (e.code === 'KeyB') { if (window.callCoffeeBreak) window.callCoffeeBreak(); }
        else if (e.code === 'KeyC') { if (window.openCiscoSwitchModal) window.openCiscoSwitchModal(); }
    }

    function onKeyUp(e) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.forward = false;
        else if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.backward = false;
        else if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
        else if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
        else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.sprint = false;
    }

    // -------------------------------------------------------------
    // Collision Engine
    // -------------------------------------------------------------
    function checkCollision(targetX, targetZ) {
        const r = PLAYER_COLLISION_RADIUS;
        for (let i = 0; i < staticObstacles.length; i++) {
            const obs = staticObstacles[i];
            if (obs.type === 'door' && obs.doorRef) {
                if (obs.doorRef.currentOpen >= 0.65) continue;
            }
            if (
                targetX + r > obs.minX &&
                targetX - r < obs.maxX &&
                targetZ + r > obs.minZ &&
                targetZ - r < obs.maxZ
            ) {
                return true;
            }
        }
        return false;
    }

    // -------------------------------------------------------------
    // Player Movement (Fixed Vector Math: Left=Left, Right=Right!)
    // -------------------------------------------------------------
    function updateWalkMode(delta, elapsedTime) {
        if (!player) return;

        // Forward vector in direction camera is looking
        const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
        // Correct orthogonal Right vector (Fixed non-inverted math!)
        const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

        let moveDir = new THREE.Vector3(0, 0, 0);

        if (keys.forward) moveDir.add(forward);
        if (keys.backward) moveDir.sub(forward);
        if (keys.left) moveDir.sub(right); // Exactly strafes LEFT
        if (keys.right) moveDir.add(right); // Exactly strafes RIGHT

        const isMoving = (moveDir.lengthSq() > 0.001);

        if (isMoving) {
            moveDir.normalize();
            const currentSpeed = (keys.sprint ? 22.0 : 13.5) * delta;
            const deltaX = moveDir.x * currentSpeed;
            const deltaZ = moveDir.z * currentSpeed;

            const targetRotY = Math.atan2(moveDir.x, moveDir.z) + Math.PI;
            player.rotY = THREE.MathUtils.lerp(player.rotY, targetRotY, 0.25);
            player.group.rotation.y = player.rotY;

            let nextX = player.pos.x + deltaX;
            let nextZ = player.pos.z + deltaZ;

            nextX = Math.max(-49.5, Math.min(49.5, nextX));
            nextZ = Math.max(-39.5, Math.min(39.5, nextZ));

            if (!checkCollision(nextX, player.pos.z)) player.pos.x = nextX;
            if (!checkCollision(player.pos.x, nextZ)) player.pos.z = nextZ;
            player.group.position.set(player.pos.x, 0, player.pos.z);

            player.walkTimer += delta * (keys.sprint ? 18 : 12);
            player.leftLeg.rotation.x = Math.sin(player.walkTimer) * 0.65;
            player.rightLeg.rotation.x = -Math.sin(player.walkTimer) * 0.65;
            player.leftArm.rotation.x = -Math.sin(player.walkTimer) * 0.55;
            player.rightArm.rotation.x = Math.sin(player.walkTimer) * 0.55;
            player.charGroup.position.y = 0.8 + Math.abs(Math.sin(player.walkTimer)) * 0.08;
        } else {
            player.leftLeg.rotation.x = THREE.MathUtils.lerp(player.leftLeg.rotation.x, 0, 0.2);
            player.rightLeg.rotation.x = THREE.MathUtils.lerp(player.rightLeg.rotation.x, 0, 0.2);
            player.leftArm.rotation.x = THREE.MathUtils.lerp(player.leftArm.rotation.x, 0, 0.2);
            player.rightArm.rotation.x = THREE.MathUtils.lerp(player.rightArm.rotation.x, 0, 0.2);
            player.charGroup.position.y = 0.8 + Math.sin(elapsedTime * 2.5) * 0.03;
        }

        // Camera Follow
        if (walkPerspective === 'third') {
            player.group.visible = true;
            const desiredCamX = player.pos.x + Math.sin(camYaw) * Math.cos(camPitch) * camDistance;
            const desiredCamY = 1.8 + Math.sin(camPitch) * camDistance;
            const desiredCamZ = player.pos.z + Math.cos(camYaw) * Math.cos(camPitch) * camDistance;

            camera.position.lerp(new THREE.Vector3(desiredCamX, desiredCamY, desiredCamZ), 0.18);
            camera.lookAt(player.pos.x, 1.7, player.pos.z);
        } else {
            player.group.visible = false;
            const eyeY = 1.75;
            camera.position.set(player.pos.x, eyeY, player.pos.z);
            const lookTarget = new THREE.Vector3(
                player.pos.x - Math.sin(camYaw) * Math.cos(camPitch) * 10,
                eyeY - Math.sin(camPitch) * 10,
                player.pos.z - Math.cos(camYaw) * Math.cos(camPitch) * 10
            );
            camera.lookAt(lookTarget);
        }

        checkBotProximity();
    }

    // -------------------------------------------------------------
    // Teleportation Warp Engine
    // -------------------------------------------------------------
    function teleportTo(destinationKey) {
        const dest = TELEPORT_POINTS[destinationKey] || TELEPORT_POINTS.all;
        if (!player) return;

        player.pos.copy(dest.pos);
        player.rotY = dest.yaw;
        player.group.position.copy(dest.pos);
        player.group.rotation.y = dest.yaw;
        camYaw = dest.yaw;
        camPitch = 0.28;

        const warpRing = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 2.2, 32),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 1.0 })
        );
        warpRing.rotation.x = -Math.PI / 2;
        warpRing.position.set(dest.pos.x, 0.08, dest.pos.z);
        scene.add(warpRing);
        teleportRings.push({ mesh: warpRing, scale: 1.0, opacity: 1.0 });

        document.querySelectorAll('.room-chip').forEach(chip => {
            chip.classList.toggle('active', chip.getAttribute('onclick')?.includes(destinationKey));
        });
    }

    // -------------------------------------------------------------
    // Proximity Detection
    // -------------------------------------------------------------
    function checkBotProximity() {
        if (!player) return;

        const distToSwitch = Math.hypot(player.pos.x - SWITCH_WORLD_POS.x, player.pos.z - SWITCH_WORLD_POS.z);
        nearServerSwitch = (distToSwitch < 6.8);

        let minDist = Infinity;
        let nearestBot = null;

        botsMap.forEach(bot => {
            const dist = Math.hypot(player.pos.x - bot.group.position.x, player.pos.z - bot.group.position.z);
            if (dist < minDist) {
                minDist = dist;
                nearestBot = bot;
            }
        });

        const proxCard = document.getElementById('walk-proximity-card');
        if (!proxCard) return;

        if (nearServerSwitch) {
            currentNearbyBot = null;
            proxCard.classList.remove('hidden');
            document.getElementById('prox-avatar').textContent = '🌐';
            document.getElementById('prox-name').textContent = 'Cisco Catalyst 9300 10G Core Switch';
            document.getElementById('prox-role').textContent = 'Multi-Gigabit Port Matrix & Cisco CLI Terminal [Press E]';
            document.getElementById('prox-lan-status').innerHTML = '<span class="lan-dot online"></span> 🟢 10G TRUNK UP (VLAN 10-100)';
            document.getElementById('btn-prox-lan').textContent = '🔌 Disconnect Port [L]';
            document.getElementById('btn-prox-talk').textContent = '🌐 Open Cisco CLI [E]';
            return;
        }

        if (minDist < 6.5 && nearestBot) {
            currentNearbyBot = nearestBot.empData;
            proxCard.classList.remove('hidden');
            document.getElementById('prox-avatar').textContent = nearestBot.empData.avatar || '🧑‍💻';
            document.getElementById('prox-name').textContent = nearestBot.empData.name;
            document.getElementById('prox-role').textContent = `${nearestBot.empData.role} (${nearestBot.empData.ip})`;

            const isLanUp = (nearestBot.empData.lan_connected !== false);
            document.getElementById('prox-lan-status').innerHTML = isLanUp ?
                '<span class="lan-dot online"></span> 🟢 LAN: CONNECTED (1Gbps Full Duplex)' :
                '<span class="lan-dot offline"></span> 🔴 LAN: UNPLUGGED (Link Carrier Down)';

            document.getElementById('btn-prox-lan').textContent = isLanUp ? '🔌 Unplug LAN [L]' : '🔌 Plug LAN Back [L]';
            document.getElementById('btn-prox-talk').textContent = '💬 Talk / Terminal [E]';
            return;
        }

        currentNearbyBot = null;
        proxCard.classList.add('hidden');
    }

    async function toggleLanDirectly(empId) {
        if (!empId) return;
        const bot = botsMap.get(empId);
        const currentState = bot ? (bot.empData.lan_connected !== false) : true;
        const targetAction = currentState ? "disconnect" : "connect";

        try {
            const res = await fetch('/api/network/toggle_lan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emp_id: empId, action: targetAction })
            });
            const data = await res.json();
            if (data.success && window.state && window.state.employees) {
                const emp = window.state.employees.find(e => e.id === empId);
                if (emp) emp.lan_connected = data.lan_connected;
                updateBots(window.state.employees, window.state.player_stats);
                checkBotProximity();
            }
        } catch (err) {
            console.error("[Office3D] Failed to toggle LAN cable:", err);
        }
    }

    function toggleLanForNearby() {
        if (nearServerSwitch) {
            if (botsMap.size > 0) {
                const firstId = botsMap.keys().next().value;
                toggleLanDirectly(firstId);
            }
            return;
        }
        if (currentNearbyBot) {
            toggleLanDirectly(currentNearbyBot.id);
        }
    }

    function interactWithCurrentBot() {
        if (nearServerSwitch) {
            if (window.openCiscoSwitchModal) window.openCiscoSwitchModal();
            return;
        }
        if (currentNearbyBot) {
            focusBot(currentNearbyBot.id);
        }
    }

    function focusBot(empId) {
        const bot = botsMap.get(empId);
        if (!bot) return;

        if (selectionRing) {
            selectionRing.position.set(bot.group.position.x, 0.06, bot.group.position.z);
            selectionRing.visible = true;
        }
        if (window.selectEmployee) {
            window.selectEmployee(empId);
        }
    }

    // -------------------------------------------------------------
    // Main Animation Loop
    // -------------------------------------------------------------
    function animate() {
        animId = requestAnimationFrame(animate);

        const delta = Math.min(clock.getDelta(), 0.1);
        const elapsedTime = clock.getElapsedTime();

        // 1. Player Walk & Camera
        updateWalkMode(delta, elapsedTime);

        // 2. Animate Dynamic Blinking Server LEDs in NOC
        serverLeds.forEach(item => {
            const pulse = (Math.sin(elapsedTime * item.speed + item.phase) + 1) / 2;
            item.mesh.visible = pulse > 0.35;
        });

        // 3. Animate AI Security Sentinel Drone (Patrolling & Gyro Rotation)
        if (aiSecurityDrone) {
            aiSecurityDrone.timer += delta * 0.5;
            // Smooth patrol orbit in lobby
            aiSecurityDrone.group.position.x = Math.sin(aiSecurityDrone.timer) * 14;
            aiSecurityDrone.group.position.z = -5.5 + Math.cos(aiSecurityDrone.timer * 0.8) * 4;
            aiSecurityDrone.group.position.y = 3.2 + Math.sin(elapsedTime * 2) * 0.15;
            aiSecurityDrone.ring.rotation.z += delta * 3.5;
        }

        // 4. Animate Automatic Sliding Doors
        if (player) {
            doorsList.forEach(door => {
                const dist = Math.hypot(player.pos.x - door.worldX, player.pos.z - door.worldZ);
                door.targetOpen = (dist < 4.8) ? 1.0 : 0.0;
                door.currentOpen = THREE.MathUtils.lerp(door.currentOpen, door.targetOpen, delta * 5.0);

                const slideDist = door.openDist * door.currentOpen;
                door.leftGroup.position.x = -slideDist;
                door.rightGroup.position.x = slideDist;

                if (door.rfidLedMat) {
                    door.rfidLedMat.color.setHex(door.currentOpen > 0.5 ? 0x00f0ff : 0x10b981);
                }
            });
        }

        // 5. Animate LAN Cable Data Packets
        lanCablesMap.forEach(cable => {
            if (cable.connected && cable.packet.visible) {
                cable.packetProgress = (cable.packetProgress + delta * 0.75) % 1.0;
                const pt = cable.curve.getPointAt(cable.packetProgress);
                cable.packet.position.copy(pt);
            }
        });

        // 6. Animate Teleportation Warp Rings
        for (let i = teleportRings.length - 1; i >= 0; i--) {
            const ring = teleportRings[i];
            ring.scale += delta * 4.5;
            ring.opacity -= delta * 1.5;
            ring.mesh.scale.set(ring.scale, ring.scale, 1);
            ring.mesh.material.opacity = Math.max(0, ring.opacity);
            if (ring.opacity <= 0) {
                scene.remove(ring.mesh);
                teleportRings.splice(i, 1);
            }
        }

        // 7. Selection Ring Rotation
        if (selectionRing && selectionRing.visible) {
            selectionRing.rotation.z += 0.02;
        }

        renderer.render(scene, camera);
    }

    function onWindowResize() {
        if (!camera || !renderer || !container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function togglePerspective() {
        walkPerspective = (walkPerspective === 'third') ? 'first' : 'third';
        const povBtn = document.getElementById('btn-walk-pov');
        if (povBtn) povBtn.textContent = (walkPerspective === 'third') ? '👁️ 3rd Person View' : '🎯 1st Person POV';
        const povChip = document.getElementById('btn-pov-toggle');
        if (povChip) povChip.textContent = (walkPerspective === 'third') ? '👁️ 3rd Person [V]' : '🎯 1st Person [V]';
    }

    function setVirtualKey(keyName, isPressed) {
        if (keys.hasOwnProperty(keyName)) {
            keys[keyName] = isPressed;
        }
    }

    function setMode(mode) {
        currentMode = 'walk';
    }

    function resetView() {
        teleportTo('all');
    }

    function rotateLeft() { camYaw += Math.PI / 12; }
    function rotateRight() { camYaw -= Math.PI / 12; }
    function zoomIn() { camDistance = Math.max(2.8, camDistance - 1.2); }
    function zoomOut() { camDistance = Math.min(13.0, camDistance + 1.2); }

    return {
        init: init,
        update: updateBots,
        unlockPerk3D: spawnPerk3D,
        teleportTo: teleportTo,
        focusRoom: teleportTo,
        setMode: setMode,
        togglePerspective: togglePerspective,
        setVirtualKey: setVirtualKey,
        toggleLan: toggleLanDirectly,
        interactWithCurrentBot: interactWithCurrentBot,
        toggleLanForNearby: toggleLanForNearby,
        resetView: resetView,
        rotateLeft: rotateLeft,
        rotateRight: rotateRight,
        zoomIn: zoomIn,
        zoomOut: zoomOut
    };
})();
