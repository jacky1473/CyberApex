/**
 * CyberApex Virtual Office 3D Engine (Pure RPG Walk Mode)
 * Three.js WebGL Interactive Corporate Cyberpunk Office Simulator
 * Features:
 *   - Immersive 3rd-person & 1st-person RPG Walk Mode (Orbit mode removed)
 *   - Mouse-drag camera look & smooth WASD movement with independent-axis wall collision
 *   - Automatic proximity-based sliding glass doors & RFID access indicators
 *   - High-Fidelity Server Room (PAC In-Row cooling, overhead cable trays, blinking server LEDs, 10G Core switch)
 *   - Rich Office Interior (Biophilic potted plants, executive boardroom screen, cyber lounge sofa & vending machine)
 *   - Dual-monitor workstations (Landscape + Vertical code screen, RGB keyboards)
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
    let currentMode = 'walk'; // Pure Walk Mode
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
    let hoveredBotId = null;
    let selectionRing = null;
    let currentNearbyBot = null;
    let nearServerSwitch = false;

    // Physical LAN & Server Infrastructure
    let switchRack = null;
    let switchPorts = [];
    const SWITCH_WORLD_POS = new THREE.Vector3(0, 1.2, -26.5);
    let lanCablesMap = new Map();
    let serverLeds = []; // Array of { mesh, baseColor, phase, speed } for blinking LEDs

    // Architectural Collision & Sliding Door Systems
    let staticObstacles = [];
    let doorsList = [];
    let teleportRings = []; // Visual teleportation warp effect

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
        all:           { pos: new THREE.Vector3(0, 0, -4),   yaw: 0 },         // Central Lobby facing rooms
        room_mgmt:     { pos: new THREE.Vector3(-30, 0, -11), yaw: Math.PI },   // South entrance into Boardroom
        room_noc:      { pos: new THREE.Vector3(0, 0, -11),   yaw: Math.PI },   // South entrance into Server Room
        room_admin:    { pos: new THREE.Vector3(30, 0, -11),  yaw: Math.PI },   // South entrance into Command Deck
        room_cafe:     { pos: new THREE.Vector3(-30, 0, -3),  yaw: 0 },         // North entrance into Cafe
        room_backend:  { pos: new THREE.Vector3(0, 0, -3),    yaw: 0 },         // North entrance into Backend Bay
        room_frontend: { pos: new THREE.Vector3(30, 0, -3),   yaw: 0 },         // North entrance into Frontend Studio
        room_devops:   { pos: new THREE.Vector3(-16, 0, 20),  yaw: 0 },         // North entrance into DevOps Room
        room_qa:       { pos: new THREE.Vector3(16, 0, 20),   yaw: 0 }          // North entrance into QA Lab
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
        scene.fog = new THREE.FogExp2(0x050811, 0.0075);

        // 2. Camera (Perspective for Walk Mode)
        const aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 300);

        // 3. Renderer with High-Performance Settings
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

        // 4. Lighting & Environment
        setupLighting();

        // 5. Build Architectural Structure & Interiors
        buildFloor();
        buildPerimeterWalls();
        buildCeiling();
        buildRooms();
        buildBiophilicPlants();
        buildSelectionRing();

        // 6. Build Farman's Player Avatar
        player = buildPlayerAvatar();

        // Position player at Central Lobby
        player.pos.set(0, 0, -4);
        player.rotY = Math.PI;
        camYaw = Math.PI;
        camPitch = 0.28;

        // 7. Raycaster & Event Listeners
        raycaster = new THREE.Raycaster();
        window.addEventListener('resize', onWindowResize);

        // Pointer controls for smooth mouse-look & drag rotation
        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

        // Keyboard navigation
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // Show Walk HUD immediately
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

        // Main directional sun/ceiling flood
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

        // Department accent point lights
        for (const [key, r] of Object.entries(ROOM_DEFS)) {
            const pLight = new THREE.PointLight(r.color, 1.1, 24);
            pLight.position.set(r.x, 5.2, r.z);
            scene.add(pLight);
        }

        // Dedicated Cyan NOC Server Room Fluorescent Floodlight
        const nocFlood = new THREE.PointLight(0x06b6d4, 1.8, 22);
        nocFlood.position.set(0, 5.0, -20);
        scene.add(nocFlood);
    }

    // -------------------------------------------------------------
    // Floor, Ceiling & Exterior Boundaries
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

        // Subtle main floor grid
        const grid = new THREE.GridHelper(104, 52, 0x06b6d4, 0x1e293b);
        grid.position.y = 0.01;
        scene.add(grid);

        // Neon Walkway Guide Carpet Runners along corridors
        const runnerMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.5,
            metalness: 0.6
        });
        // Central East-West Corridor Runner
        const ewRunner = new THREE.Mesh(new THREE.PlaneGeometry(96, 4.4), runnerMat);
        ewRunner.rotation.x = -Math.PI / 2;
        ewRunner.position.set(0, 0.02, -5.5);
        scene.add(ewRunner);

        // Central North-South Corridor Runner
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

        // Floor Cable Conduits into Server Room NOC
        const racewayMat = new THREE.MeshStandardMaterial({ color: 0x0e1726, roughness: 0.4, metalness: 0.8 });
        const rwGeo = new THREE.BoxGeometry(1.6, 0.06, 32);
        const raceway = new THREE.Mesh(rwGeo, racewayMat);
        raceway.position.set(0, 0.03, -11);
        scene.add(raceway);
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

            // Panoramic Skyscraper Windows
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
                if (isHorizontal) {
                    glass.position.set(centerOffset, winY, w.pos[2]);
                } else {
                    glass.position.set(w.pos[0], winY, centerOffset);
                }
                scene.add(glass);

                const mullionGeo = isHorizontal ? new THREE.BoxGeometry(0.18, 4.0, 0.3) : new THREE.BoxGeometry(0.3, 4.0, 0.18);
                const mullion = new THREE.Mesh(mullionGeo, mullionMat);
                if (isHorizontal) {
                    mullion.position.set(centerOffset - winW / 2, 2.0, w.pos[2]);
                } else {
                    mullion.position.set(w.pos[0], 2.0, centerOffset - winW / 2);
                }
                scene.add(mullion);
            }
        });
    }

    function buildCeiling() {
        // Ceiling Slab with DoubleSide culling
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

        // Recessed Architectural LED Downlight Fixtures
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

            // 1. Specialized Floor Tile with Ambient Glow
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

            // Perimeter Room Border
            const edges = new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.PlaneGeometry(width, depth)),
                new THREE.LineBasicMaterial({ color: r.color, linewidth: 2 })
            );
            edges.rotation.x = -Math.PI / 2;
            edges.position.y = 0.04;
            roomGroup.add(edges);

            // 2. Doorway Orientation
            const isTopRow = (roomId === "room_mgmt" || roomId === "room_noc" || roomId === "room_admin");
            const doorFace = isTopRow ? "south" : "north";

            // 3. Build Architectural Walls & Proximity Sliding Doors
            buildRoomWallsAndDoors(roomGroup, roomId, r, width, depth, hw, hd, doorFace);

            // 4. Room Interior Specialized Furnishings
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
            dado.castShadow = true;
            dado.receiveShadow = true;
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

            // Register obstacle
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

        // 3 Closed Solid Partition Walls
        if (doorFace === "south") {
            buildFullWall(width, true, 0, -hd);  // North wall
            buildFullWall(depth, false, -hw, 0); // West wall
            buildFullWall(depth, false, hw, 0);  // East wall
        } else {
            buildFullWall(width, true, 0, hd);   // South wall
            buildFullWall(depth, false, -hw, 0); // West wall
            buildFullWall(depth, false, hw, 0);  // East wall
        }

        // Entrance Wall with Proximity-Activated Sliding Glass Doors
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

        // Overhead Lintel Archway Beam
        const archGeo = new THREE.BoxGeometry(doorW + 0.4, wallH - doorH, wallThick * 1.1);
        const archMesh = new THREE.Mesh(archGeo, dadoMat);
        archMesh.position.set(0, doorH + (wallH - doorH) / 2, doorWallZ);
        roomGroup.add(archMesh);

        // Electronic Access Keypad Panel with LED
        const accessGeo = new THREE.BoxGeometry(0.14, 0.28, 0.06);
        const accessMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.8 });
        const accessPanel = new THREE.Mesh(accessGeo, accessMat);
        accessPanel.position.set(doorW / 2 + 0.35, 1.45, doorWallZ + (doorFace === "south" ? 0.16 : -0.16));
        roomGroup.add(accessPanel);

        const rfidLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const rfidLed = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), rfidLedMat);
        rfidLed.position.set(doorW / 2 + 0.35, 1.54, doorWallZ + (doorFace === "south" ? 0.20 : -0.20));
        roomGroup.add(rfidLed);

        // Holographic Transom Room Badge
        const signSprite = createTextSprite(`${r.icon} ${r.name.toUpperCase()}`, r.color);
        signSprite.position.set(0, wallH + 0.85, doorWallZ);
        signSprite.scale.set(6.4, 1.4, 1);
        roomGroup.add(signSprite);

        // Sliding Glass Door Leaves (Left & Right)
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

        // Left Leaf
        const leftLeafGroup = new THREE.Group();
        const leftLeaf = new THREE.Mesh(leafGeo, leafMat);
        leftLeaf.position.set(-leafW / 2, leafH / 2, 0);
        leftLeafGroup.add(leftLeaf);
        const leftHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), handleMat);
        leftHandle.position.set(-0.15, leafH / 2, 0.06);
        leftLeafGroup.add(leftHandle);
        leftLeafGroup.position.set(0, 0, doorWallZ);
        roomGroup.add(leftLeafGroup);

        // Right Leaf
        const rightLeafGroup = new THREE.Group();
        const rightLeaf = new THREE.Mesh(leafGeo, leafMat);
        rightLeaf.position.set(leafW / 2, leafH / 2, 0);
        rightLeafGroup.add(rightLeaf);
        const rightHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), handleMat);
        rightHandle.position.set(0.15, leafH / 2, 0.06);
        rightLeafGroup.add(rightHandle);
        rightLeafGroup.position.set(0, 0, doorWallZ);
        roomGroup.add(rightLeafGroup);

        // Register Dynamic Door for Proximity Animation & Collision
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

            // 1. Cold-Rolled Steel Frame
            const rack = new THREE.Mesh(rackGeo, rackMat);
            rack.castShadow = true;
            rackGroup.add(rack);

            // 2. Smoked Tempered Glass Door & Handle
            const door = new THREE.Mesh(new THREE.BoxGeometry(2.32, 4.42, 0.04), glassDoorMat);
            door.position.set(0, 0, 0.69);
            rackGroup.add(door);

            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 12), chromeMat);
            handle.position.set(0.98, 0, 0.73);
            rackGroup.add(handle);

            // 3. Dual Exhaust Fans
            [-0.55, 0.55].forEach(fx => {
                const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 20), chromeMat);
                fanRing.rotation.x = Math.PI / 2;
                fanRing.position.set(fx, 2.31, 0);
                rackGroup.add(fanRing);

                const fanGlow = new THREE.Mesh(
                    new THREE.CircleGeometry(0.32, 16),
                    new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide })
                );
                fanGlow.rotation.x = Math.PI / 2;
                fanGlow.position.set(fx, 2.30, 0);
                rackGroup.add(fanGlow);
            });

            // 4. 6 Stacked 2U Blade Servers Inside
            for (let b = 0; b < 6; b++) {
                const bladeY = -1.65 + b * 0.65;
                const blade = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.15), bladeMat);
                blade.position.set(0, bladeY, 0.05);
                rackGroup.add(blade);

                for (let c = 0; c < 4; c++) {
                    const caddy = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.04), caddyMat);
                    caddy.position.set(-0.75 + c * 0.45, bladeY, 0.64);
                    rackGroup.add(caddy);

                    // Power LED (Solid Emerald Green)
                    const pwrLed = new THREE.Mesh(
                        new THREE.BoxGeometry(0.04, 0.04, 0.02),
                        new THREE.MeshBasicMaterial({ color: 0x10b981 })
                    );
                    pwrLed.position.set(-0.85 + c * 0.45, bladeY + 0.12, 0.67);
                    rackGroup.add(pwrLed);

                    // Dynamic Blinking SAS Activity LED
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

        // Perforated Datacenter Ventilation Floor Tiles in NOC
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

        // 1. 24-Port Patch Panel
        const ppMesh = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.65, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.75 })
        );
        ppMesh.position.set(0, 4.05, 0.93);
        rackGroup.add(ppMesh);

        // 2. Central 10G Core Switch Chassis
        const swMesh = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.88, 0.20),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.9 })
        );
        swMesh.position.set(0, 3.20, 0.94);
        rackGroup.add(swMesh);

        // OLED Status Display
        const oled = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 0.32),
            new THREE.MeshBasicMaterial({ color: 0x0284c7 })
        );
        oled.position.set(-1.3, 3.20, 1.05);
        rackGroup.add(oled);

        // 4x SFP+ 10G Fiber Cages
        for (let s = 0; s < 4; s++) {
            const sfp = new THREE.Mesh(
                new THREE.BoxGeometry(0.20, 0.18, 0.12),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
            );
            sfp.position.set(1.4 + s * 0.26, 3.20, 1.02);
            rackGroup.add(sfp);
        }

        // 15 RJ45 Ethernet Ports + Curved Patch Cords
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

        // 3. 2U Enterprise Firewall Unit
        const fwMesh = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.60, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 })
        );
        fwMesh.position.set(0, 2.30, 0.93);
        rackGroup.add(fwMesh);

        // 4. 3U Smart UPS Unit
        const upsMesh = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 0.85, 0.18),
            new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.5, metalness: 0.7 })
        );
        upsMesh.position.set(0, 1.40, 0.93);
        rackGroup.add(upsMesh);

        // 5. Overhead Yellow Datacenter Cable Ladder Wire Tray
        const trayMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.65, roughness: 0.3 });
        [-9, 9].forEach(tx => {
            const ladder = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(tx), 0.1, 0.6), trayMat);
            ladder.position.set(tx / 2, 4.8, 0);
            rackGroup.add(ladder);
        });

        // Holographic Title Header
        const swTitle = createTextSprite("🌐 10G CORE SWITCH & PATCH DECK", 0x06b6d4);
        swTitle.position.set(0, 6.0, 0);
        swTitle.scale.set(7.5, 1.6, 1);
        rackGroup.add(swTitle);

        group.add(rackGroup);
        switchRack = rackGroup;
    }

    function buildServerRoomCooling(group) {
        // In-Row Precision Air Conditioning (PAC) Unit
        const pacGroup = new THREE.Group();
        pacGroup.position.set(5.5, 2.3, -6.5);

        const pacBody = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 4.6, 1.35),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 })
        );
        pacGroup.add(pacBody);

        // Louver Grilles
        const louverMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
        for (let l = 0; l < 8; l++) {
            const louver = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.04), louverMat);
            louver.position.set(0, -1.5 + l * 0.45, 0.69);
            pacGroup.add(louver);
        }

        // Digital Temperature Readout
        const lcdMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const lcd = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.3), lcdMat);
        lcd.position.set(0, 1.7, 0.70);
        pacGroup.add(lcd);

        // Emergency Power Off (EPO) Red Safety Button on Wall
        const epoGroup = new THREE.Group();
        epoGroup.position.set(11.5, 1.6, -7);
        const epoBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.35, 0.06),
            new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        const epoBtn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
            new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        epoBtn.rotation.x = Math.PI / 2;
        epoBtn.position.z = 0.05;
        epoGroup.add(epoBack);
        epoGroup.add(epoBtn);
        group.add(epoGroup);

        group.add(pacGroup);
    }

    // -------------------------------------------------------------
    // Office Interior Decoration (Lounge, Boardroom, Plants)
    // -------------------------------------------------------------
    function buildCafeBar(group) {
        // 1. Cyber Cafe Counter
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

        // Espresso Machine
        const mach = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 1.6, 1.4),
            new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 })
        );
        mach.position.set(-2.5, 2.2, -5.5);
        group.add(mach);

        // 2. Leather Sectional Sofa in Cyber Lounge
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

        // 3. Cyber Snack & Drinks Vending Machine
        const vendMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.85 });
        const vend = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.2, 1.4), vendMat);
        vend.position.set(8.5, 2.1, -5.5);
        group.add(vend);

        const vendGlass = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 2.6, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.4 })
        );
        vendGlass.position.set(8.5, 2.4, -4.75);
        group.add(vendGlass);

        // Water Cooler Dispenser
        const coolerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 });
        const coolerBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.8), coolerMat);
        coolerBody.position.set(-8.5, 0.9, -5.5);
        group.add(coolerBody);

        const bottle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.32, 0.9, 16),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
        );
        bottle.position.set(-8.5, 2.2, -5.5);
        group.add(bottle);
    }

    function buildBoardroomTable(group) {
        // Polished Executive Conference Table
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

        // Center Brushed Brass Cable Raceway Track
        const track = new THREE.Mesh(
            new THREE.BoxGeometry(9.0, 0.04, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 })
        );
        track.position.set(0, 1.42, 0);
        group.add(track);

        // Center 3D Hologram Projector Podium
        const holoBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.6, 0.2, 16),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9 })
        );
        holoBase.position.set(0, 1.5, 0);
        group.add(holoBase);

        // 85" Ultra-Wide Presentation Screen on Boardroom North Wall
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
        const screen = new THREE.Mesh(new THREE.BoxGeometry(8.5, 3.2, 0.12), screenMat);
        screen.position.set(0, 2.7, -9.6);
        group.add(screen);

        const screenBorder = new THREE.Mesh(
            new THREE.BoxGeometry(8.8, 3.5, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9 })
        );
        screenBorder.position.set(0, 2.7, -9.68);
        group.add(screenBorder);
    }

    function buildBiophilicPlants() {
        const plantPositions = [
            [-14, -2], [14, -2],   // Lobby entrance corners
            [-41, 14], [-19, 14],  // Cafeteria lounge corners
            [-41, -28], [-19, -28],// Boardroom corners
            [41, -28], [19, -28],  // Command Deck corners
            [-2, 19], [2, 19]      // Central walkway junctions
        ];

        const potMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.6 });
        const soilMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4, side: THREE.DoubleSide });

        plantPositions.forEach(([px, pz]) => {
            const plantGroup = new THREE.Group();
            plantGroup.position.set(px, 0, pz);

            // Geometric Hexagonal Planter Pot
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.9, 8), potMat);
            pot.position.y = 0.45;
            pot.castShadow = true;
            plantGroup.add(pot);

            const soil = new THREE.Mesh(new THREE.CircleGeometry(0.42, 8), soilMat);
            soil.rotation.x = -Math.PI / 2;
            soil.position.y = 0.88;
            plantGroup.add(soil);

            // Lush Leaf Sprays
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

        // Torso: Emerald Admin Cyber-Armor with Gold Trim
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 1.1, 0.55),
            new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.5 })
        );
        torso.position.set(0, 0.65, 0);
        torso.castShadow = true;
        charGroup.add(torso);

        // Golden Shoulder Pauldrons
        const padMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
        [-0.55, 0.55].forEach(sx => {
            const pad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.45), padMat);
            pad.position.set(sx, 1.15, 0);
            charGroup.add(pad);
        });

        // Head & Visor
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.48, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
        );
        head.position.set(0, 1.5, 0);
        head.castShadow = true;
        charGroup.add(head);

        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.68, 0.18, 0.28),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff })
        );
        visor.position.set(0, 1.5, -0.38);
        charGroup.add(visor);

        // Arms
        const armMat = new THREE.MeshStandardMaterial({ color: 0x047857 });
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), armMat);
        leftArm.position.set(-0.6, 0.55, 0);
        charGroup.add(leftArm);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), armMat);
        rightArm.position.set(0.6, 0.55, 0);
        charGroup.add(rightArm);

        // Legs
        const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), legMat);
        leftLeg.position.set(-0.25, -0.42, 0);
        charGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), legMat);
        rightLeg.position.set(0.25, -0.42, 0);
        charGroup.add(rightLeg);

        pGroup.add(charGroup);

        // Sleek Compact Name Banner
        const nameSprite = createTextSprite("👑 Farman (You)", 0x10b981);
        nameSprite.position.set(0, 2.45, 0);
        nameSprite.scale.set(2.4, 0.6, 1);
        pGroup.add(nameSprite);

        // Glowing Aura Ring Under Feet
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
    // Bot Workstations & Dual-Monitor Desks
    // -------------------------------------------------------------
    function createBotMesh(emp) {
        const botGroup = new THREE.Group();
        botGroup.userData = { empId: emp.id, empData: emp };

        const deptColor = DEPT_COLORS[emp.dept] || 0x3b82f6;

        // 1. Desk Surface
        const desk = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.12, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.3 })
        );
        desk.position.set(0, 1.0, 0);
        desk.castShadow = true;
        desk.receiveShadow = true;
        botGroup.add(desk);

        const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
        [[-1.3, -0.65], [1.3, -0.65], [-1.3, 0.65], [1.3, 0.65]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), legMat);
            leg.position.set(lx, 0.5, lz);
            leg.castShadow = true;
            botGroup.add(leg);
        });

        // 2. Primary Ultrawide Curved Monitor (Horizontal)
        const monBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.3), legMat);
        monBase.position.set(-0.35, 1.08, -0.35);
        botGroup.add(monBase);

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

        // 3. Secondary Vertical Code Monitor (Portrait angled at 20°)
        const scr2Group = new THREE.Group();
        scr2Group.position.set(0.85, 1.8, -0.30);
        scr2Group.rotation.y = -0.35;

        const scr2Bezel = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 1.5, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x0f172a })
        );
        scr2Group.add(scr2Bezel);

        const scr2Face = new THREE.Mesh(
            new THREE.PlaneGeometry(0.85, 1.4),
            new THREE.MeshBasicMaterial({ color: 0x0284c7 })
        );
        scr2Face.position.z = 0.05;
        scr2Group.add(scr2Face);
        botGroup.add(scr2Group);

        // 4. RGB Backlit Keyboard & Neon Mousepad
        const kb = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.03, 0.35),
            new THREE.MeshStandardMaterial({ color: 0x090d16 })
        );
        kb.position.set(-0.3, 1.08, 0.2);
        botGroup.add(kb);

        const mousepad = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.02, 0.35),
            new THREE.MeshBasicMaterial({ color: deptColor })
        );
        mousepad.position.set(0.45, 1.07, 0.2);
        botGroup.add(mousepad);

        // 5. Workstation RJ45 Port on PC Back
        const rj45Mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.10, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x10b981 })
        );
        rj45Mesh.position.set(-0.35, 1.35, -0.40);
        botGroup.add(rj45Mesh);

        // 6. Modern Ergonomic Mesh Office Chair
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
        const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.1), chairMat);
        chairSeat.position.set(0, 0.75, 0.75);
        chairSeat.castShadow = true;
        botGroup.add(chairSeat);

        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 0.12), chairMat);
        chairBack.position.set(0, 1.35, 1.25);
        chairBack.castShadow = true;
        botGroup.add(chairBack);

        // 7. 3D Stylized Bot Character
        const charGroup = new THREE.Group();
        charGroup.position.set(0, 0.8, 0.7);

        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 1.1, 0.55),
            new THREE.MeshStandardMaterial({ color: deptColor, roughness: 0.4, metalness: 0.2 })
        );
        torso.position.set(0, 0.65, 0);
        torso.castShadow = true;
        charGroup.add(torso);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.45, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 })
        );
        head.position.set(0, 1.5, 0);
        head.castShadow = true;
        charGroup.add(head);

        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.16, 0.25),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff })
        );
        visor.position.set(0, 1.5, -0.35);
        charGroup.add(visor);

        botGroup.add(charGroup);

        // Status Beacon Ring
        const beacon = new THREE.Mesh(
            new THREE.TorusGeometry(0.55, 0.04, 8, 24),
            new THREE.MeshBasicMaterial({ color: 0x10b981 })
        );
        beacon.rotation.x = Math.PI / 2;
        beacon.position.set(0, 2.2, 0);
        botGroup.add(beacon);

        // Overhead Floating Nameplate Sprite
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
            empData: emp
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

    function map2Dto3D(emp, index) {
        const room = ROOM_DEFS[emp.room_id] || ROOM_DEFS.room_backend;
        const col = index % 2;
        const row = Math.floor((index % 4) / 2);
        const offsetX = (col === 0 ? -6 : 6);
        const offsetZ = (row === 0 ? -3 : 4);
        return { x: room.x + offsetX, y: 0, z: room.z + offsetZ };
    }

    // -------------------------------------------------------------
    // Physical LAN Topology (Isolated inside office-sandbox)
    // -------------------------------------------------------------
    function createOrUpdateLanCable(emp, botPos, index) {
        if (!emp || !emp.id.startsWith("EMP-") || emp.id === "EMP-016") return;

        let cableEntry = lanCablesMap.get(emp.id);
        const isConnected = emp.lan_connected !== false;

        if (!cableEntry) {
            const pStart = new THREE.Vector3(botPos.x - 0.35, 1.05, botPos.z - 0.40);
            const pFloor1 = new THREE.Vector3(botPos.x - 0.35, 0.04, botPos.z - 0.45);
            const pFloor2 = new THREE.Vector3(botPos.x * 0.4, 0.04, (botPos.z + SWITCH_WORLD_POS.z) * 0.45);
            const pFloor3 = new THREE.Vector3((index % 5 - 2) * 0.7, 0.04, SWITCH_WORLD_POS.z + 2.0);
            const pEnd = new THREE.Vector3((index % 8 - 3.5) * 0.42, 3.2, SWITCH_WORLD_POS.z + 0.95);

            const curve = new THREE.CatmullRomCurve3([pStart, pFloor1, pFloor2, pFloor3, pEnd]);
            const tubeGeo = new THREE.TubeGeometry(curve, 44, 0.065, 8, false);

            const mat = new THREE.MeshStandardMaterial({
                color: isConnected ? 0x00f0ff : 0xef4444,
                roughness: 0.25,
                metalness: 0.8,
                emissive: isConnected ? 0x004466 : 0x550000,
                emissiveIntensity: 0.8
            });
            const tubeMesh = new THREE.Mesh(tubeGeo, mat);
            scene.add(tubeMesh);

            const boot = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12),
                new THREE.MeshBasicMaterial({ color: isConnected ? 0x10b981 : 0xff0033 })
            );
            boot.position.copy(pStart);
            scene.add(boot);

            const packet = new THREE.Mesh(
                new THREE.SphereGeometry(0.16, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
            );
            packet.visible = isConnected;
            scene.add(packet);

            cableEntry = {
                mesh: tubeMesh,
                mat: mat,
                curve: curve,
                packet: packet,
                boot: boot,
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
    // Update Bots from Polling State
    // -------------------------------------------------------------
    function updateBots(employees) {
        if (!scene || !employees) return;

        employees.forEach((emp, index) => {
            if (emp.id === "EMP-016") return; // Farman is the player avatar

            let bot = botsMap.get(emp.id);
            const pos = map2Dto3D(emp, index);

            if (!bot) {
                bot = createBotMesh(emp);
                bot.group.position.set(pos.x, pos.y, pos.z);
                scene.add(bot.group);
                botsMap.set(emp.id, bot);
            }

            bot.empData = emp;
            const isBlocked = (emp.status === "blocked");
            const isLanDown = (emp.lan_connected === false);

            if (isBlocked || isLanDown) {
                bot.beacon.material.color.setHex(0xef4444);
                bot.scrFace.material.color.setHex(0xef4444);
                bot.rj45Mesh.material.color.setHex(0xef4444);
            } else if (emp.status === "meeting") {
                bot.beacon.material.color.setHex(0xf59e0b);
            } else {
                bot.beacon.material.color.setHex(0x10b981);
                bot.scrFace.material.color.setHex(DEPT_COLORS[emp.dept] || 0x3b82f6);
                bot.rj45Mesh.material.color.setHex(0x10b981);
            }

            createOrUpdateLanCable(emp, pos, index);
        });

        // Update Switch Rack LED indicators
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
    // RPG Walk Controls & Pointer Look Handling
    // -------------------------------------------------------------
    function onPointerDown(e) {
        isPointerDown = true;
        isDraggingView = false;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        pointerDownPos.set(e.clientX, e.clientY);
    }

    function onPointerMove(e) {
        // Raycasting for bot inspection
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

        // Smooth Camera Rotation around Farman
        camYaw -= deltaX * 0.0055;
        camPitch = Math.max(-0.05, Math.min(1.10, camPitch + deltaY * 0.0045));
    }

    function onPointerUp(e) {
        if (!isDraggingView) {
            // Clicked without dragging: Raycast to select bot
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
            if (hitId) {
                focusBot(hitId);
            }
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
    }

    function onKeyUp(e) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.forward = false;
        else if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.backward = false;
        else if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
        else if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
        else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.sprint = false;
    }

    // -------------------------------------------------------------
    // Collision Detection Engine
    // -------------------------------------------------------------
    function checkCollision(targetX, targetZ) {
        const r = PLAYER_COLLISION_RADIUS;
        for (let i = 0; i < staticObstacles.length; i++) {
            const obs = staticObstacles[i];
            if (obs.type === 'door' && obs.doorRef) {
                if (obs.doorRef.currentOpen >= 0.65) {
                    continue; // Door is open, allow passage
                }
            }
            if (
                targetX + r > obs.minX &&
                targetX - r < obs.maxX &&
                targetZ + r > obs.minZ &&
                targetZ - r < obs.maxZ
            ) {
                return true; // Collided
            }
        }
        return false;
    }

    // -------------------------------------------------------------
    // Player Movement & Camera Follow (RPG Walk Mode)
    // -------------------------------------------------------------
    function updateWalkMode(delta, elapsedTime) {
        if (!player) return;

        const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
        const right = new THREE.Vector3(-Math.cos(camYaw), 0, Math.sin(camYaw));

        let moveDir = new THREE.Vector3(0, 0, 0);

        if (keys.forward) moveDir.add(forward);
        if (keys.backward) moveDir.sub(forward);
        if (keys.left) moveDir.sub(right);
        if (keys.right) moveDir.add(right);

        const isMoving = (moveDir.lengthSq() > 0.001);

        if (isMoving) {
            moveDir.normalize();
            const currentSpeed = (keys.sprint ? 22.0 : 13.5) * delta;
            const deltaX = moveDir.x * currentSpeed;
            const deltaZ = moveDir.z * currentSpeed;

            // Target facing rotation
            const targetRotY = Math.atan2(moveDir.x, moveDir.z) + Math.PI;
            player.rotY = THREE.MathUtils.lerp(player.rotY, targetRotY, 0.25);
            player.group.rotation.y = player.rotY;

            // Independent Axis Wall Sliding Collision Check
            let nextX = player.pos.x + deltaX;
            let nextZ = player.pos.z + deltaZ;

            // Perimeter Boundary Clamp
            nextX = Math.max(-49.5, Math.min(49.5, nextX));
            nextZ = Math.max(-39.5, Math.min(39.5, nextZ));

            if (!checkCollision(nextX, player.pos.z)) {
                player.pos.x = nextX;
            }
            if (!checkCollision(player.pos.x, nextZ)) {
                player.pos.z = nextZ;
            }
            player.group.position.set(player.pos.x, 0, player.pos.z);

            // Walking limb oscillations
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

        // Camera Follow Logic
        if (walkPerspective === 'third') {
            player.group.visible = true;
            const desiredCamX = player.pos.x + Math.sin(camYaw) * Math.cos(camPitch) * camDistance;
            const desiredCamY = 1.8 + Math.sin(camPitch) * camDistance;
            const desiredCamZ = player.pos.z + Math.cos(camYaw) * Math.cos(camPitch) * camDistance;

            camera.position.lerp(new THREE.Vector3(desiredCamX, desiredCamY, desiredCamZ), 0.18);
            camera.lookAt(player.pos.x, 1.7, player.pos.z);
        } else {
            // 1st-Person Immersive Eye View
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

        // Check Proximity to bots and Server Room Core Switch
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

        // Create glowing cyan warp pulse ring effect
        const warpRing = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 2.2, 32),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 1.0 })
        );
        warpRing.rotation.x = -Math.PI / 2;
        warpRing.position.set(dest.pos.x, 0.08, dest.pos.z);
        scene.add(warpRing);
        teleportRings.push({ mesh: warpRing, scale: 1.0, opacity: 1.0 });

        // Update active status chips in toolbar
        document.querySelectorAll('.room-chip').forEach(chip => {
            chip.classList.toggle('active', chip.getAttribute('onclick')?.includes(destinationKey));
        });
    }

    // -------------------------------------------------------------
    // Proximity Detection & Auto Doors
    // -------------------------------------------------------------
    function checkBotProximity() {
        if (!player) return;

        // 1. Proximity to Central 10G Switch in Server Room
        const distToSwitch = Math.hypot(player.pos.x - SWITCH_WORLD_POS.x, player.pos.z - SWITCH_WORLD_POS.z);
        nearServerSwitch = (distToSwitch < 6.8);

        // 2. Proximity to Workstations
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
            document.getElementById('prox-name').textContent = 'Server Room: 10G Core Switch & Patch Deck';
            document.getElementById('prox-role').textContent = 'Isolated Sandbox Network (eth-office in office-sandbox)';
            document.getElementById('prox-lan-status').innerHTML = '<span class="lan-dot online"></span> 🟢 10G UPLINK ACTIVE';
            document.getElementById('btn-prox-lan').textContent = '🔌 Disconnect Port [L]';
            document.getElementById('btn-prox-talk').textContent = '📊 Core Switch CLI [E]';
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

        // Out of proximity range
        currentNearbyBot = null;
        proxCard.classList.add('hidden');
    }

    // -------------------------------------------------------------
    // LAN Cable Interactive Toggle (Pure Isolated Sandbox Execution)
    // -------------------------------------------------------------
    async function toggleLanDirectly(empId) {
        if (!empId) return;
        const bot = botsMap.get(empId);
        const currentState = bot ? (bot.empData.lan_connected !== false) : true;
        const targetAction = currentState ? "disconnect" : "connect";

        try {
            const res = await fetch('/api/workstation/toggle_lan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emp_id: empId, action: targetAction })
            });
            const data = await res.json();
            if (data.success && window.state && window.state.employees) {
                const emp = window.state.employees.find(e => e.id === empId);
                if (emp) emp.lan_connected = data.lan_connected;
                updateBots(window.state.employees);
                checkBotProximity();
            }
        } catch (err) {
            console.error("[Office3D] Failed to toggle LAN cable:", err);
        }
    }

    function toggleLanForNearby() {
        if (nearServerSwitch) {
            // Cycle disconnected/connected state for first bot
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
            if (window.switchTab) window.switchTab('tab-terminal');
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

        // 1. Update Player Movement & Camera in RPG Walk Mode
        updateWalkMode(delta, elapsedTime);

        // 2. Animate Dynamic Blinking Server LEDs in NOC
        serverLeds.forEach(item => {
            const pulse = (Math.sin(elapsedTime * item.speed + item.phase) + 1) / 2;
            item.mesh.visible = pulse > 0.35;
        });

        // 3. Animate Automatic Sliding Doors
        if (player) {
            doorsList.forEach(door => {
                const dist = Math.hypot(player.pos.x - door.worldX, player.pos.z - door.worldZ);
                door.targetOpen = (dist < 4.8) ? 1.0 : 0.0;
                door.currentOpen = THREE.MathUtils.lerp(door.currentOpen, door.targetOpen, delta * 5.0);

                const slideDist = door.openDist * door.currentOpen;
                door.leftGroup.position.x = -slideDist;
                door.rightGroup.position.x = slideDist;

                // RFID Access Indicator color
                if (door.rfidLedMat) {
                    door.rfidLedMat.color.setHex(door.currentOpen > 0.5 ? 0x00f0ff : 0x10b981);
                }
            });
        }

        // 4. Animate LAN Cable Data Packets
        lanCablesMap.forEach(cable => {
            if (cable.connected && cable.packet.visible) {
                cable.packetProgress = (cable.packetProgress + delta * 0.75) % 1.0;
                const pt = cable.curve.getPointAt(cable.packetProgress);
                cable.packet.position.copy(pt);
            }
        });

        // 5. Animate Teleportation Warp Rings
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

        // 6. Selection Ring Rotation
        if (selectionRing && selectionRing.visible) {
            selectionRing.rotation.z += 0.02;
        }

        renderer.render(scene, camera);
    }

    // -------------------------------------------------------------
    // Viewport Resize & Virtual Controls
    // -------------------------------------------------------------
    function onWindowResize() {
        if (!camera || !renderer || !container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function togglePerspective() {
        walkPerspective = (walkPerspective === 'third') ? 'first' : 'third';
        const povBtn = document.getElementById('btn-walk-pov');
        if (povBtn) {
            povBtn.textContent = (walkPerspective === 'third') ? '👁️ 3rd Person View' : '🎯 1st Person POV';
        }
        const povChip = document.getElementById('btn-pov-toggle');
        if (povChip) {
            povChip.textContent = (walkPerspective === 'third') ? '👁️ 3rd Person [V]' : '🎯 1st Person [V]';
        }
    }

    function setVirtualKey(keyName, isPressed) {
        if (keys.hasOwnProperty(keyName)) {
            keys[keyName] = isPressed;
        }
    }

    function setMode(mode) {
        // Orbit mode is deprecated; default to Walk mode
        currentMode = 'walk';
    }

    function resetView() {
        teleportTo('all');
    }

    function rotateLeft() {
        camYaw += Math.PI / 12;
    }

    function rotateRight() {
        camYaw -= Math.PI / 12;
    }

    function zoomIn() {
        camDistance = Math.max(2.8, camDistance - 1.2);
    }

    function zoomOut() {
        camDistance = Math.min(13.0, camDistance + 1.2);
    }

    return {
        init: init,
        update: updateBots,
        teleportTo: teleportTo,
        focusRoom: teleportTo, // Backward compatibility alias
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
