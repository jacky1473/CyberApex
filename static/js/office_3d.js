/**
 * CyberApex 3D Virtual Office Engine - Three.js WebGL Implementation
 * Renders 16 AI Agent Specialists across 8 3D Cabins with dynamic animations,
 * interactive raycasting, workstation monitors, server racks, and alarm beacons.
 * 
 * Features:
 * - 🌐 3D Physical LAN Infrastructure: Real-time neon Ethernet cables running from
 *   each bot workstation across the floor conduits to the Central Core Switch & Patch Panel
 *   in the Server Room (NOC). Animated data packets show live traffic.
 * - 🚶‍♂️ REAL WALK MODE with Farman's 3D Avatar (1st/3rd person POV).
 * - 🔌 Real LAN Connect & Disconnect: Farman can walk up to any bot's PC (or Server Room switch)
 *   and press [L] or click "Unplug LAN" to cut their Ethernet link.
 *   Disconnection unbinds the actual Linux OS IP alias on ens160, causing packet loss!
 *   Reconnecting restores the 1Gbps link and binds the IP back on Rocky Linux!
 */

window.Office3D = (function() {
    let container, scene, camera, renderer, controls;
    let clock = new THREE.Clock();
    let botsMap = new Map();
    let serverLeds = [];
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let hoveredBotId = null;
    let selectedBotId = null;
    let selectionRing = null;
    let isInitialized = false;

    // Camera animation target & state
    let targetCamPos = new THREE.Vector3(0, 52, 65);
    let targetLookAt = new THREE.Vector3(0, 0, 0);
    let isTransitioning = false;
    let isPointerDragging = false;
    let pointerDownPos = new THREE.Vector2();

    // Navigation & Walk Mode State
    let currentMode = 'orbit'; // 'orbit' or 'walk'
    let walkPerspective = 'third'; // 'third' or 'first'
    let player = null;
    let currentNearbyBot = null;
    let nearServerSwitch = false;
    const keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false
    };

    // 3D Physical LAN Infrastructure
    let switchRack = null;
    let switchPorts = [];
    const SWITCH_WORLD_POS = new THREE.Vector3(0, 1.2, -26.5);
    let lanCablesMap = new Map();

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

    // Camera view presets for Orbit Mode
    const VIEW_PRESETS = {
        all:           { pos: new THREE.Vector3(0, 52, 65),   look: new THREE.Vector3(0, 0, 0) },
        room_mgmt:     { pos: new THREE.Vector3(-30, 22, -2), look: new THREE.Vector3(-30, 0, -20) },
        room_noc:      { pos: new THREE.Vector3(0, 22, -2),   look: new THREE.Vector3(0, 0, -20) },
        room_admin:    { pos: new THREE.Vector3(30, 22, -2),  look: new THREE.Vector3(30, 0, -20) },
        room_cafe:     { pos: new THREE.Vector3(-30, 22, 24), look: new THREE.Vector3(-30, 0, 6) },
        room_backend:  { pos: new THREE.Vector3(0, 22, 24),   look: new THREE.Vector3(0, 0, 6) },
        room_frontend: { pos: new THREE.Vector3(30, 22, 24),  look: new THREE.Vector3(30, 0, 6) },
        room_devops:   { pos: new THREE.Vector3(-16, 20, 44), look: new THREE.Vector3(-16, 0, 27) },
        room_qa:       { pos: new THREE.Vector3(16, 20, 44),  look: new THREE.Vector3(16, 0, 27) }
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

    function init(containerId) {
        container = document.getElementById(containerId);
        if (!container || isInitialized) return;

        const width = container.clientWidth || 1020;
        const height = container.clientHeight || 660;

        // 1. Scene & Fog
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0f1d);
        scene.fog = new THREE.FogExp2(0x0a0f1d, 0.007);

        // 2. Camera
        camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
        camera.position.set(targetCamPos.x, targetCamPos.y, targetCamPos.z);
        camera.lookAt(targetLookAt);

        // 3. Renderer (High-Performance lightweight mode)
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.domElement.style.touchAction = 'none';
        container.appendChild(renderer.domElement);

        // 4. Orbit Controls (Fine-tuned for responsive rotation & zoom)
        if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.06;
            controls.rotateSpeed = 0.9;
            controls.zoomSpeed = 1.35;
            controls.panSpeed = 0.85;
            controls.screenSpacePanning = true;
            controls.enableRotate = true;
            controls.enableZoom = true;
            controls.enablePan = true;
            controls.maxPolarAngle = Math.PI / 2.05;
            controls.minPolarAngle = 0.05;
            controls.minDistance = 6;
            controls.maxDistance = 160;
            controls.target.copy(targetLookAt);

            controls.addEventListener('start', () => {
                isTransitioning = false;
            });
        }

        // 5. Lighting
        setupLighting();

        // 6. Floor & Environment
        buildFloor();
        buildRooms();

        // 7. Interactive Selection Ring
        buildSelectionRing();

        // 8. Build Farman's Player Avatar (Walk Mode Character)
        player = buildPlayerAvatar();

        // 9. Event Listeners for Raycasting & Drag-Safe Clicking
        window.addEventListener('resize', onWindowResize);
        
        renderer.domElement.addEventListener('pointermove', onMouseMove);

        renderer.domElement.addEventListener('pointerdown', (e) => {
            pointerDownPos.set(e.clientX, e.clientY);
            isPointerDragging = false;
        });

        renderer.domElement.addEventListener('pointermove', (e) => {
            const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            if (dist > 6) {
                isPointerDragging = true;
            }
        });

        renderer.domElement.addEventListener('pointerup', (e) => {
            const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            if (dist < 6 && !isPointerDragging) {
                if (hoveredBotId) {
                    focusBot(hoveredBotId);
                }
            }
        });

        // 10. Keyboard Navigation & Walk Shortcuts
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        isInitialized = true;
        renderer.render(scene, camera);
        animate();
    }

    function setupLighting() {
        const ambLight = new THREE.AmbientLight(0x64748b, 0.95);
        scene.add(ambLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
        dirLight.position.set(30, 60, 40);
        scene.add(dirLight);

        for (const [key, r] of Object.entries(ROOM_DEFS)) {
            const pLight = new THREE.PointLight(r.color, 1.1, 22);
            pLight.position.set(r.x, 6, r.z);
            scene.add(pLight);
        }
    }

    function buildFloor() {
        const floorGeo = new THREE.PlaneGeometry(104, 84);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0a0f1d,
            roughness: 0.7,
            metalness: 0.25
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.05;
        scene.add(floor);

        const grid = new THREE.GridHelper(104, 52, 0x06b6d4, 0x1e293b);
        grid.position.y = 0.01;
        scene.add(grid);

        // Exterior Perimeter Walls with Skyscraper Observation Windows
        buildPerimeterWalls();
    }

    // Build Exterior Skyscraper Perimeter Walls & Panoramic Glass
    function buildPerimeterWalls() {
        const wallH = 3.6;
        const dadoH = 1.0;
        const glassH = wallH - dadoH;
        const thick = 0.35;

        const dadoMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.5, metalness: 0.6 });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            transparent: true,
            opacity: 0.22,
            roughness: 0.1,
            metalness: 0.8
        });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

        // Outer boundaries: X = -52 to 52 (W: 104), Z = -42 to 42 (D: 84)
        const wallConfigs = [
            { length: 104, isX: true, x: 0, z: -42 },   // North
            { length: 104, isX: true, x: 0, z: 42 },    // South
            { length: 84,  isX: false, x: -52, z: 0 },  // West
            { length: 84,  isX: false, x: 52, z: 0 }    // East
        ];

        wallConfigs.forEach(cfg => {
            const wGroup = new THREE.Group();
            wGroup.position.set(cfg.x, 0, cfg.z);

            const dW = cfg.isX ? cfg.length : thick;
            const dD = cfg.isX ? thick : cfg.length;
            const gW = cfg.isX ? cfg.length : thick * 0.6;
            const gD = cfg.isX ? thick * 0.6 : cfg.length;

            // Solid lower sill
            const dadoGeo = new THREE.BoxGeometry(dW, dadoH, dD);
            const dado = new THREE.Mesh(dadoGeo, dadoMat);
            dado.position.y = dadoH / 2;
            wGroup.add(dado);

            // Panoramic observation glass
            const glassGeo = new THREE.BoxGeometry(gW, glassH, gD);
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.position.y = dadoH + glassH / 2;
            wGroup.add(glass);

            // Ceiling lintel beam
            const lintelGeo = new THREE.BoxGeometry(dW, 0.22, dD);
            const lintel = new THREE.Mesh(lintelGeo, frameMat);
            lintel.position.y = wallH - 0.11;
            wGroup.add(lintel);

            // Neon roofline trim
            const neonGeo = new THREE.BoxGeometry(cfg.isX ? cfg.length : 0.08, 0.04, cfg.isX ? 0.08 : cfg.length);
            const neon = new THREE.Mesh(neonGeo, neonMat);
            neon.position.y = wallH;
            wGroup.add(neon);

            // Exterior structural mullions every 12 units
            const numMullions = Math.floor(cfg.length / 12);
            for (let i = 0; i <= numMullions; i++) {
                const offset = -cfg.length / 2 + (i * (cfg.length / numMullions));
                const mGeo = new THREE.BoxGeometry(cfg.isX ? 0.28 : thick * 1.1, wallH, cfg.isX ? thick * 1.1 : 0.28);
                const mullion = new THREE.Mesh(mGeo, frameMat);
                mullion.position.set(cfg.isX ? offset : 0, wallH / 2, cfg.isX ? 0 : offset);
                wGroup.add(mullion);
            }

            scene.add(wGroup);
        });
    }

    function buildRooms() {
        for (const [roomId, r] of Object.entries(ROOM_DEFS)) {
            const roomGroup = new THREE.Group();
            roomGroup.position.set(r.x, 0, r.z);

            const width = r.w - 1;
            const depth = r.d - 1;
            const hw = width / 2;
            const hd = depth / 2;

            // 1. Room Floor Tile with Accent Glow
            const tileGeo = new THREE.PlaneGeometry(width, depth);
            const tileMat = new THREE.MeshStandardMaterial({
                color: 0x111c30,
                roughness: 0.55,
                metalness: 0.25
            });
            const tile = new THREE.Mesh(tileGeo, tileMat);
            tile.rotation.x = -Math.PI / 2;
            tile.position.y = 0.02;
            roomGroup.add(tile);

            const edgesGeo = new THREE.EdgesGeometry(tileGeo);
            const edgesMat = new THREE.LineBasicMaterial({ color: r.color, linewidth: 2 });
            const border = new THREE.LineSegments(edgesGeo, edgesMat);
            border.rotation.x = -Math.PI / 2;
            border.position.y = 0.04;
            roomGroup.add(border);

            // 2. Determine Entrance Orientation (Top rooms enter from South, others from North)
            const isTopRow = (roomId === "room_mgmt" || roomId === "room_noc" || roomId === "room_admin");
            const doorFace = isTopRow ? "south" : "north";

            // 3. Build Architectural Walls & Doorway
            buildRoomWallsAndDoors(roomGroup, roomId, r, width, depth, hw, hd, doorFace);

            // 4. Room Interior Specialized Furnishings
            if (roomId === "room_mgmt") {
                buildBoardroomTable(roomGroup);
            } else if (roomId === "room_noc" || roomId === "room_admin") {
                buildServerRacks(roomGroup, roomId === "room_admin" ? 0xef4444 : 0x10b981);
                if (roomId === "room_noc") {
                    buildCoreSwitchRack(roomGroup);
                }
            } else if (roomId === "room_cafe") {
                buildCafeBar(roomGroup);
            }

            scene.add(roomGroup);
        }
    }

    // Build Realistic Architectural Cabin Walls, Doorway, Frame & Sliding Glass Doors
    function buildRoomWallsAndDoors(roomGroup, roomId, r, width, depth, hw, hd, doorFace) {
        const wallH = 2.8;
        const dadoH = 0.95;
        const glassH = wallH - dadoH;
        const wallThick = 0.22;
        const doorW = 4.4;
        const doorH = 2.45;

        // Shared Materials
        const dadoMat = new THREE.MeshStandardMaterial({
            color: 0x0c1322,
            roughness: 0.55,
            metalness: 0.4
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: r.color,
            transparent: true,
            opacity: 0.32,
            roughness: 0.2,
            metalness: 0.3
        });
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.3,
            metalness: 0.75
        });
        const neonMat = new THREE.MeshBasicMaterial({ color: r.color });
        const doorGlassMat = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.5,
            roughness: 0.15,
            metalness: 0.5
        });
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.95 });

        // Helper: Full Partition Wall (Solid lower panel + upper smart glass + frame & neon trim)
        function buildFullWall(length, isHorizontal, posX, posZ) {
            const wGeo = new THREE.Group();
            wGeo.position.set(posX, 0, posZ);

            const dW = isHorizontal ? length : wallThick;
            const dD = isHorizontal ? wallThick : length;
            const gW = isHorizontal ? length : wallThick * 0.7;
            const gD = isHorizontal ? wallThick * 0.7 : length;

            // Lower solid dado panel
            const dado = new THREE.Mesh(new THREE.BoxGeometry(dW, dadoH, dD), dadoMat);
            dado.position.y = dadoH / 2;
            wGeo.add(dado);

            // Upper smart glass partition
            const glass = new THREE.Mesh(new THREE.BoxGeometry(gW, glassH, gD), glassMat);
            glass.position.y = dadoH + glassH / 2;
            wGeo.add(glass);

            // Baseboard
            const baseGeo = new THREE.BoxGeometry(isHorizontal ? length : wallThick + 0.04, 0.12, isHorizontal ? wallThick + 0.04 : length);
            const base = new THREE.Mesh(baseGeo, frameMat);
            base.position.y = 0.06;
            wGeo.add(base);

            // Top Header Rail
            const topRailGeo = new THREE.BoxGeometry(isHorizontal ? length : wallThick + 0.06, 0.14, isHorizontal ? wallThick + 0.06 : length);
            const topRail = new THREE.Mesh(topRailGeo, frameMat);
            topRail.position.y = wallH - 0.07;
            wGeo.add(topRail);

            // Illuminated Neon Crown Strip
            const neonCrown = new THREE.Mesh(
                new THREE.BoxGeometry(isHorizontal ? length : 0.06, 0.04, isHorizontal ? 0.06 : length),
                neonMat
            );
            neonCrown.position.y = wallH;
            wGeo.add(neonCrown);

            // Vertical partition framing mullions (every ~4m)
            const segments = Math.max(2, Math.floor(length / 4));
            for (let i = 1; i < segments; i++) {
                const off = -length / 2 + (i * (length / segments));
                const mull = new THREE.Mesh(
                    new THREE.BoxGeometry(isHorizontal ? 0.12 : wallThick + 0.04, wallH, isHorizontal ? wallThick + 0.04 : 0.12),
                    frameMat
                );
                mull.position.set(isHorizontal ? off : 0, wallH / 2, isHorizontal ? 0 : off);
                wGeo.add(mull);
            }

            roomGroup.add(wGeo);
        }

        // Helper: Front Wall with Central Architectural Doorway & Frame
        function buildDoorWall(length, posZ, facing) {
            const wGroup = new THREE.Group();
            wGroup.position.set(0, 0, posZ);

            const sideW = (length - doorW) / 2;
            const xLeft = -(length / 2) + (sideW / 2);
            const xRight = (length / 2) - (sideW / 2);

            // Left Wall Section
            const dLeft = new THREE.Mesh(new THREE.BoxGeometry(sideW, dadoH, wallThick), dadoMat);
            dLeft.position.set(xLeft, dadoH / 2, 0);
            wGroup.add(dLeft);

            const gLeft = new THREE.Mesh(new THREE.BoxGeometry(sideW, glassH, wallThick * 0.7), glassMat);
            gLeft.position.set(xLeft, dadoH + glassH / 2, 0);
            wGroup.add(gLeft);

            const railLeft = new THREE.Mesh(new THREE.BoxGeometry(sideW, 0.14, wallThick + 0.06), frameMat);
            railLeft.position.set(xLeft, wallH - 0.07, 0);
            wGroup.add(railLeft);

            // Right Wall Section
            const dRight = new THREE.Mesh(new THREE.BoxGeometry(sideW, dadoH, wallThick), dadoMat);
            dRight.position.set(xRight, dadoH / 2, 0);
            wGroup.add(dRight);

            const gRight = new THREE.Mesh(new THREE.BoxGeometry(sideW, glassH, wallThick * 0.7), glassMat);
            gRight.position.set(xRight, dadoH + glassH / 2, 0);
            wGroup.add(gRight);

            const railRight = new THREE.Mesh(new THREE.BoxGeometry(sideW, 0.14, wallThick + 0.06), frameMat);
            railRight.position.set(xRight, wallH - 0.07, 0);
            wGroup.add(railRight);

            // Header Wall above the Door Opening
            const headH = wallH - doorH;
            const dHead = new THREE.Mesh(new THREE.BoxGeometry(doorW, headH, wallThick), frameMat);
            dHead.position.set(0, doorH + headH / 2, 0);
            wGroup.add(dHead);

            // Full Neon Crown across the entire wall
            const neonCrown = new THREE.Mesh(new THREE.BoxGeometry(length, 0.04, 0.06), neonMat);
            neonCrown.position.set(0, wallH, 0);
            wGroup.add(neonCrown);

            // Architectural Door Frame: Left & Right Jambs
            const jambGeo = new THREE.BoxGeometry(0.24, doorH, wallThick + 0.12);
            const leftJamb = new THREE.Mesh(jambGeo, frameMat);
            leftJamb.position.set(-doorW / 2, doorH / 2, 0);
            wGroup.add(leftJamb);

            const rightJamb = new THREE.Mesh(jambGeo, frameMat);
            rightJamb.position.set(doorW / 2, doorH / 2, 0);
            wGroup.add(rightJamb);

            // Door Lintel Archway Beam
            const lintelGeo = new THREE.BoxGeometry(doorW + 0.36, 0.22, wallThick + 0.14);
            const lintel = new THREE.Mesh(lintelGeo, frameMat);
            lintel.position.set(0, doorH - 0.11, 0);
            wGroup.add(lintel);

            // Illuminated Lintel Accent Strip
            const lintelGlow = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.2, 0.04, wallThick + 0.16), neonMat);
            lintelGlow.position.set(0, doorH - 0.01, 0);
            wGroup.add(lintelGlow);

            // Twin Sliding Glass Door Leaves (Parted open for comfortable walk-through)
            const leafW = 1.35;
            const leafH = doorH - 0.18;
            const doorGeo = new THREE.BoxGeometry(leafW, leafH, 0.06);

            // Left Glass Door Leaf (Retracted into pocket)
            const leftDoor = new THREE.Mesh(doorGeo, doorGlassMat);
            leftDoor.position.set(-doorW / 2 + 0.72, leafH / 2 + 0.04, 0.04);
            wGroup.add(leftDoor);

            // Right Glass Door Leaf (Retracted into pocket)
            const rightDoor = new THREE.Mesh(doorGeo, doorGlassMat);
            rightDoor.position.set(doorW / 2 - 0.72, leafH / 2 + 0.04, 0.04);
            wGroup.add(rightDoor);

            // Sleek Chrome Handles on Door Leaves
            const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 12);
            const leftHandle = new THREE.Mesh(handleGeo, handleMat);
            leftHandle.position.set(-doorW / 2 + 1.30, 1.25, 0.09);
            wGroup.add(leftHandle);

            const rightHandle = new THREE.Mesh(handleGeo, handleMat);
            rightHandle.position.set(doorW / 2 - 1.30, 1.25, 0.09);
            wGroup.add(rightHandle);

            // Electronic Cyber Access Panel (RFID / Biometric Reader on door post)
            const keypadGeo = new THREE.BoxGeometry(0.12, 0.32, 0.08);
            const keypad = new THREE.Mesh(keypadGeo, frameMat);
            const signDir = (facing === "south" ? 1 : -1);
            keypad.position.set(doorW / 2 + 0.14, 1.35, signDir * (wallThick / 2 + 0.04));
            wGroup.add(keypad);

            const ledGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
            const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(doorW / 2 + 0.14, 1.45, signDir * (wallThick / 2 + 0.09));
            wGroup.add(led);

            // Doorway Floor Threshold Runner / Welcome Mat
            const runnerGeo = new THREE.PlaneGeometry(doorW - 0.4, 1.6);
            const runnerMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                roughness: 0.8,
                metalness: 0.1
            });
            const runner = new THREE.Mesh(runnerGeo, runnerMat);
            runner.rotation.x = -Math.PI / 2;
            runner.position.set(0, 0.03, 0);
            wGroup.add(runner);

            // Glowing Edge Strips on Runner
            const runEdgeGeo = new THREE.BoxGeometry(doorW - 0.4, 0.02, 0.06);
            const runEdgeNorth = new THREE.Mesh(runEdgeGeo, neonMat);
            runEdgeNorth.position.set(0, 0.035, -0.78);
            wGroup.add(runEdgeNorth);
            const runEdgeSouth = new THREE.Mesh(runEdgeGeo, neonMat);
            runEdgeSouth.position.set(0, 0.035, 0.78);
            wGroup.add(runEdgeSouth);

            // Overhead Holographic Room Entrance Sign above the Door
            const titleSprite = createTextSprite(`${r.icon} ${r.name}`, r.color);
            titleSprite.position.set(0, wallH + 0.85, signDir * 0.2);
            titleSprite.scale.set(7.5, 2.0, 1);
            wGroup.add(titleSprite);

            roomGroup.add(wGroup);
        }

        // Build 3 Full Walls + 1 Doorway Wall
        if (doorFace === "south") {
            buildFullWall(width, true, 0, -hd);     // North (Back)
            buildFullWall(depth, false, -hw, 0);    // West (Left)
            buildFullWall(depth, false, hw, 0);     // East (Right)
            buildDoorWall(width, hd, "south");      // South (Front Door)
        } else {
            buildDoorWall(width, -hd, "north");     // North (Front Door)
            buildFullWall(width, true, 0, hd);      // South (Back)
            buildFullWall(depth, false, -hw, 0);    // West (Left)
            buildFullWall(depth, false, hw, 0);     // East (Right)
        }

        // 4 Corner Structural Beveled Columns
        const colGeo = new THREE.BoxGeometry(0.48, wallH + 0.15, 0.48);
        const colMat = new THREE.MeshStandardMaterial({ color: 0x070b14, roughness: 0.3, metalness: 0.85 });
        const corners = [
            [-hw, -hd],
            [hw, -hd],
            [-hw, hd],
            [hw, hd]
        ];
        corners.forEach(([cx, cz]) => {
            const col = new THREE.Mesh(colGeo, colMat);
            col.position.set(cx, (wallH + 0.15) / 2, cz);
            roomGroup.add(col);

            const colNeon = new THREE.Mesh(new THREE.BoxGeometry(0.04, wallH + 0.15, 0.04), neonMat);
            colNeon.position.set(cx, (wallH + 0.15) / 2, cz);
            roomGroup.add(colNeon);
        });
    }

    function buildBoardroomTable(group) {
        const tableGeo = new THREE.CylinderGeometry(5.0, 5.0, 0.4, 24);
        tableGeo.scale(1.4, 1.0, 0.8);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.4 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 1.2, 0);
        table.castShadow = true;
        table.receiveShadow = true;
        group.add(table);

        const coreGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, 1.45, 0);
        group.add(core);
    }

    function buildServerRacks(group, ledColor) {
        const rackGeo = new THREE.BoxGeometry(2.4, 4.5, 1.2);
        const rackMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.4, metalness: 0.7 });

        for (let i = -1; i <= 1; i += 2) {
            const rack = new THREE.Mesh(rackGeo, rackMat);
            rack.position.set(i * 9, 2.25, -6.5);
            rack.castShadow = true;
            group.add(rack);

            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 3; col++) {
                    const ledGeo = new THREE.BoxGeometry(0.12, 0.08, 0.05);
                    const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
                    const led = new THREE.Mesh(ledGeo, ledMat);
                    led.position.set(
                        i * 9 - 0.7 + col * 0.7,
                        1.2 + row * 0.7,
                        -6.5 + 0.61
                    );
                    group.add(led);
                    serverLeds.push({ mesh: led, origColor: ledColor, phase: Math.random() * 10 });
                }
            }
        }
    }

    // Build Central 10G Core LAN Switch & Patch Panel in Server Room (NOC)
    function buildCoreSwitchRack(group) {
        const rackGroup = new THREE.Group();
        rackGroup.position.set(0, 0, -6.5); // Inside room_noc (world z = -26.5)

        const rackGeo = new THREE.BoxGeometry(4.4, 5.4, 1.8);
        const rackMat = new THREE.MeshStandardMaterial({ color: 0x070b14, roughness: 0.3, metalness: 0.8 });
        const rack = new THREE.Mesh(rackGeo, rackMat);
        rack.position.set(0, 2.7, 0);
        rack.castShadow = true;
        rackGroup.add(rack);

        // Core Switch Chassis
        const swGeo = new THREE.BoxGeometry(3.8, 0.85, 0.14);
        const swMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
        const swMesh = new THREE.Mesh(swGeo, swMat);
        swMesh.position.set(0, 3.2, 0.92);
        rackGroup.add(swMesh);

        // Holographic Header
        const swTitle = createTextSprite("🌐 10G CORE SWITCH (15 RJ45 PORTS)", 0x06b6d4);
        swTitle.position.set(0, 5.8, 0);
        swTitle.scale.set(7.0, 1.5, 1);
        rackGroup.add(swTitle);

        // 15 RJ45 Ethernet Ports
        for (let i = 0; i < 15; i++) {
            const portX = -1.5 + (i % 8) * 0.42;
            const portY = 3.38 - Math.floor(i / 8) * 0.30;

            const portGeo = new THREE.BoxGeometry(0.20, 0.16, 0.08);
            const portMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
            const portMesh = new THREE.Mesh(portGeo, portMat);
            portMesh.position.set(portX, portY, 0.98);
            rackGroup.add(portMesh);

            switchPorts.push({
                mesh: portMesh,
                empId: `EMP-${String(i + 1).padStart(3, '0')}`,
                connected: true
            });
        }

        group.add(rackGroup);
        switchRack = rackGroup;
    }

    function buildCafeBar(group) {
        const barGeo = new THREE.BoxGeometry(10, 1.4, 2.2);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(0, 0.7, -5.5);
        bar.castShadow = true;
        group.add(bar);

        const machGeo = new THREE.BoxGeometry(2.2, 1.6, 1.4);
        const machMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
        const mach = new THREE.Mesh(machGeo, machMat);
        mach.position.set(0, 1.4 + 0.8, -5.5);
        group.add(mach);
    }

    function buildSelectionRing() {
        const ringGeo = new THREE.RingGeometry(1.6, 1.9, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        selectionRing = new THREE.Mesh(ringGeo, ringMat);
        selectionRing.rotation.x = -Math.PI / 2;
        selectionRing.position.y = 0.06;
        selectionRing.visible = false;
        scene.add(selectionRing);
    }

    // Build Farman's Player Character (Walk Mode Avatar)
    function buildPlayerAvatar() {
        const pGroup = new THREE.Group();
        pGroup.position.set(0, 0, 10); // Start in central lobby

        const charGroup = new THREE.Group();
        charGroup.position.set(0, 0.8, 0);

        // Torso: Signature Emerald Admin Cyber-Armor with Gold Trim
        const torsoGeo = new THREE.BoxGeometry(0.9, 1.1, 0.55);
        const torsoMat = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            roughness: 0.3,
            metalness: 0.5
        });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.set(0, 0.65, 0);
        torso.castShadow = true;
        charGroup.add(torso);

        // Golden Shoulder Pads
        const padGeo = new THREE.BoxGeometry(0.3, 0.2, 0.45);
        const padMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
        const leftPad = new THREE.Mesh(padGeo, padMat);
        leftPad.position.set(-0.55, 1.15, 0);
        charGroup.add(leftPad);

        const rightPad = new THREE.Mesh(padGeo, padMat);
        rightPad.position.set(0.55, 1.15, 0);
        charGroup.add(rightPad);

        // Head
        const headGeo = new THREE.SphereGeometry(0.48, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.5, 0);
        head.castShadow = true;
        charGroup.add(head);

        // Glowing Cyan Visor
        const visorGeo = new THREE.BoxGeometry(0.68, 0.18, 0.28);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.5, -0.38);
        charGroup.add(visor);

        // Arms (With walking oscillation)
        const armGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x047857 });

        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.6, 0.55, 0);
        charGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.6, 0.55, 0);
        charGroup.add(rightArm);

        // Legs (With walking movement)
        const legGeo = new THREE.BoxGeometry(0.26, 0.85, 0.26);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.25, -0.42, 0);
        charGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.25, -0.42, 0);
        charGroup.add(rightLeg);

        pGroup.add(charGroup);

        // Overhead Floating Name Badge
        const nameSprite = createTextSprite("👑 Farman (You)", 0x10b981);
        nameSprite.position.set(0, 3.6, 0);
        nameSprite.scale.set(6.5, 1.6, 1);
        pGroup.add(nameSprite);

        // Glowing Aura Ring Under Feet
        const ringGeo = new THREE.RingGeometry(1.2, 1.45, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });
        const aura = new THREE.Mesh(ringGeo, ringMat);
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
            pos: new THREE.Vector3(0, 0, 10),
            rotY: Math.PI,
            walkTimer: 0
        };
    }

    function createBotMesh(emp) {
        const botGroup = new THREE.Group();
        botGroup.userData = { empId: emp.id, empData: emp };

        const deptColor = DEPT_COLORS[emp.dept] || 0x3b82f6;

        // Desk
        const deskGeo = new THREE.BoxGeometry(2.6, 0.12, 1.4);
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.3 });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(0, 1.0, 0);
        desk.castShadow = true;
        desk.receiveShadow = true;
        botGroup.add(desk);

        const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
        const legOffsets = [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]];
        legOffsets.forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lx, 0.5, lz);
            leg.castShadow = true;
            botGroup.add(leg);
        });

        // Computer Monitor with Glowing Screen
        const monBaseGeo = new THREE.BoxGeometry(0.35, 0.04, 0.3);
        const monBase = new THREE.Mesh(monBaseGeo, legMat);
        monBase.position.set(0, 1.08, -0.35);
        botGroup.add(monBase);

        const monStemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
        const monStem = new THREE.Mesh(monStemGeo, legMat);
        monStem.position.set(0, 1.28, -0.35);
        botGroup.add(monStem);

        const scrBezelGeo = new THREE.BoxGeometry(1.6, 0.95, 0.08);
        const scrBezel = new THREE.Mesh(scrBezelGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        scrBezel.position.set(0, 1.7, -0.35);
        botGroup.add(scrBezel);

        const scrFaceGeo = new THREE.PlaneGeometry(1.5, 0.85);
        const scrFaceMat = new THREE.MeshBasicMaterial({ color: deptColor });
        const scrFace = new THREE.Mesh(scrFaceGeo, scrFaceMat);
        scrFace.position.set(0, 1.7, -0.30);
        botGroup.add(scrFace);

        const kbGeo = new THREE.BoxGeometry(0.9, 0.03, 0.35);
        const kb = new THREE.Mesh(kbGeo, new THREE.MeshStandardMaterial({ color: 0x090d16 }));
        kb.position.set(0, 1.08, 0.2);
        botGroup.add(kb);

        // RJ45 Port on PC Back
        const rj45Geo = new THREE.BoxGeometry(0.12, 0.10, 0.06);
        const rj45Mat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const rj45Mesh = new THREE.Mesh(rj45Geo, rj45Mat);
        rj45Mesh.position.set(0, 1.35, -0.40);
        botGroup.add(rj45Mesh);

        // Chair
        const chairSeatGeo = new THREE.BoxGeometry(1.1, 0.12, 1.1);
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
        const chairSeat = new THREE.Mesh(chairSeatGeo, chairMat);
        chairSeat.position.set(0, 0.75, 0.75);
        chairSeat.castShadow = true;
        botGroup.add(chairSeat);

        const chairBackGeo = new THREE.BoxGeometry(1.1, 1.2, 0.12);
        const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
        chairBack.position.set(0, 1.35, 1.25);
        chairBack.castShadow = true;
        botGroup.add(chairBack);

        // Stylized 3D Bot Character Body
        const charGroup = new THREE.Group();
        charGroup.position.set(0, 0.8, 0.7);

        const torsoGeo = new THREE.BoxGeometry(0.85, 1.1, 0.55);
        const torsoMat = new THREE.MeshStandardMaterial({
            color: deptColor,
            roughness: 0.4,
            metalness: 0.2
        });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.set(0, 0.65, 0);
        torso.castShadow = true;
        charGroup.add(torso);

        const headGeo = new THREE.SphereGeometry(0.48, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.5 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.5, 0);
        head.castShadow = true;
        charGroup.add(head);

        const visorGeo = new THREE.BoxGeometry(0.65, 0.18, 0.25);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.5, -0.38);
        charGroup.add(visor);

        const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
        const armMat = new THREE.MeshStandardMaterial({ color: deptColor });

        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.55, 0.55, -0.2);
        leftArm.rotation.x = Math.PI / 4;
        charGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.55, 0.55, -0.2);
        rightArm.rotation.x = Math.PI / 4;
        charGroup.add(rightArm);

        botGroup.add(charGroup);

        const nameSprite = createTextSprite(`${emp.avatar || '🧑‍💻'} ${emp.name}`, deptColor);
        nameSprite.position.set(0, 3.8, 0);
        nameSprite.scale.set(6.0, 1.5, 1);
        botGroup.add(nameSprite);

        const alarmGroup = new THREE.Group();
        alarmGroup.position.set(0, 4.8, 0);
        alarmGroup.visible = false;

        const beaconGeo = new THREE.ConeGeometry(0.4, 0.6, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.rotation.x = Math.PI;
        alarmGroup.add(beacon);

        const alarmLight = new THREE.PointLight(0xff0033, 2.0, 10);
        alarmGroup.add(alarmLight);

        botGroup.add(alarmGroup);

        return {
            group: botGroup,
            charGroup: charGroup,
            leftArm: leftArm,
            rightArm: rightArm,
            alarmGroup: alarmGroup,
            alarmLight: alarmLight,
            nameSprite: nameSprite,
            scrFace: scrFace,
            rj45Mesh: rj45Mesh,
            data: emp,
            animPhase: Math.random() * Math.PI * 2
        };
    }

    function createTextSprite(text, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(11, 15, 29, 0.85)';
        roundRect(ctx, 8, 8, 496, 112, 24);
        ctx.fill();

        const hexStr = typeof colorHex === 'number' ? '#' + colorHex.toString(16).padStart(6, '0') : colorHex;
        ctx.strokeStyle = hexStr;
        ctx.lineWidth = 6;
        roundRect(ctx, 8, 8, 496, 112, 24);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        return new THREE.Sprite(material);
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

        return {
            x: room.x + offsetX,
            y: 0,
            z: room.z + offsetZ
        };
    }

    // 3D Physical LAN Cable Setup (From Bot Desk -> Floor Conduit -> Server Room Core Switch)
    function createOrUpdateLanCable(emp, botPos, index) {
        if (!emp || !emp.id.startsWith("EMP-") || emp.id === "EMP-016") return;

        let cableEntry = lanCablesMap.get(emp.id);
        const isConnected = emp.lan_connected !== false;

        if (!cableEntry) {
            const pStart = new THREE.Vector3(botPos.x, 1.05, botPos.z - 0.40);
            const pFloor1 = new THREE.Vector3(botPos.x, 0.04, botPos.z - 0.45);
            const pFloor2 = new THREE.Vector3(botPos.x * 0.4, 0.04, (botPos.z + SWITCH_WORLD_POS.z) * 0.45);
            const pFloor3 = new THREE.Vector3((index % 5 - 2) * 0.7, 0.04, SWITCH_WORLD_POS.z + 2.0);
            const pEnd = new THREE.Vector3((index % 8 - 3.5) * 0.42, 3.2, SWITCH_WORLD_POS.z + 0.95);

            const curve = new THREE.CatmullRomCurve3([pStart, pFloor1, pFloor2, pFloor3, pEnd]);
            const points = curve.getPoints(36);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            const mat = new THREE.LineBasicMaterial({
                color: isConnected ? 0x00f0ff : 0xef4444,
                linewidth: 2,
                transparent: true,
                opacity: isConnected ? 0.85 : 0.25
            });
            const line = new THREE.Line(geometry, mat);
            scene.add(line);

            // Data packet pulse sphere
            const packetGeo = new THREE.SphereGeometry(0.18, 8, 8);
            const packetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
            const packet = new THREE.Mesh(packetGeo, packetMat);
            packet.visible = isConnected;
            scene.add(packet);

            cableEntry = {
                line: line,
                mat: mat,
                curve: curve,
                packet: packet,
                packetProgress: Math.random(),
                connected: isConnected,
                emp: emp
            };
            lanCablesMap.set(emp.id, cableEntry);
        } else {
            cableEntry.connected = isConnected;
            cableEntry.emp = emp;
            cableEntry.mat.color.setHex(isConnected ? 0x00f0ff : 0xef4444);
            cableEntry.mat.opacity = isConnected ? 0.85 : 0.25;
            cableEntry.packet.visible = isConnected;
        }

        // Update Switch Port LED
        const portItem = switchPorts.find(p => p.empId === emp.id);
        if (portItem) {
            portItem.connected = isConnected;
            portItem.mesh.material.color.setHex(isConnected ? 0x10b981 : 0xff0033);
        }

        // Update Bot RJ45 Jack LED
        const bot = botsMap.get(emp.id);
        if (bot && bot.rj45Mesh) {
            bot.rj45Mesh.material.color.setHex(isConnected ? 0x10b981 : 0xff0033);
        }
    }

    function update(employeesList) {
        if (!isInitialized || !employeesList) return;

        employeesList.forEach((emp, idx) => {
            let botEntry = botsMap.get(emp.id);

            if (!botEntry) {
                botEntry = createBotMesh(emp);
                const pos = map2Dto3D(emp, idx);
                botEntry.group.position.set(pos.x, pos.y, pos.z);
                scene.add(botEntry.group);
                botsMap.set(emp.id, botEntry);
            }

            botEntry.data = emp;

            // Draw/Update physical LAN cable to Server Room
            createOrUpdateLanCable(emp, botEntry.group.position, idx);

            const isBlocked = emp.status === "blocked";
            const isLanDown = emp.lan_connected === false;
            botEntry.alarmGroup.visible = isBlocked || isLanDown;

            if (isLanDown) {
                botEntry.scrFace.material.color.setHex(0xff0055);
            } else if (isBlocked) {
                botEntry.scrFace.material.color.setHex(0xff0033);
            } else {
                const deptCol = DEPT_COLORS[emp.dept] || 0x3b82f6;
                botEntry.scrFace.material.color.setHex(deptCol);
            }
        });

        renderer.render(scene, camera);
    }

    // Camera Focus Preset
    function focusRoom(roomId) {
        if (currentMode === 'walk') {
            setMode('orbit');
        }
        const preset = VIEW_PRESETS[roomId] || VIEW_PRESETS.all;
        targetCamPos.copy(preset.pos);
        targetLookAt.copy(preset.look);
        isTransitioning = true;
    }

    // Focus on a specific 3D Bot
    function focusBot(botId) {
        const bot = botsMap.get(botId);
        if (!bot) return;

        selectedBotId = botId;
        const bPos = bot.group.position;
        targetCamPos.set(bPos.x, bPos.y + 6, bPos.z + 12);
        targetLookAt.set(bPos.x, bPos.y + 1.2, bPos.z);
        isTransitioning = true;

        selectionRing.position.set(bPos.x, 0.08, bPos.z);
        selectionRing.visible = true;

        if (window.show3DAgentCard) {
            window.show3DAgentCard(bot.data);
        }
    }

    // Interactive Zoom and Rotation Helper Functions (Orbit Mode)
    function zoomIn() {
        isTransitioning = false;
        if (!camera) return;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        camera.position.addScaledVector(dir, 8);
        if (controls) controls.update();
    }

    function zoomOut() {
        isTransitioning = false;
        if (!camera) return;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        camera.position.addScaledVector(dir, -8);
        if (controls) controls.update();
    }

    function rotateCamera(angleRad) {
        isTransitioning = false;
        if (!camera || !controls) return;
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleRad);
        camera.position.copy(controls.target).add(offset);
        controls.update();
    }

    function rotateLeft() {
        rotateCamera(Math.PI / 12);
    }

    function rotateRight() {
        rotateCamera(-Math.PI / 12);
    }

    function resetView() {
        focusRoom('all');
    }

    // Mode Switching: Orbit vs Walk
    function setMode(newMode) {
        currentMode = newMode;
        const hud = document.getElementById('walk-hud');
        const dpad = document.getElementById('walk-dpad');
        const proxCard = document.getElementById('walk-proximity-card');
        const quickNav = document.querySelector('.three-quick-nav');
        const controlsGuide = document.querySelector('.three-controls-guide');
        const btnOrbit = document.getElementById('btn-mode-orbit');
        const btnWalk = document.getElementById('btn-mode-walk');

        if (newMode === 'walk') {
            if (hud) hud.classList.remove('hidden');
            if (dpad) dpad.classList.remove('hidden');
            if (quickNav) quickNav.classList.add('hidden');
            if (controlsGuide) controlsGuide.classList.add('hidden');
            if (btnOrbit) btnOrbit.classList.remove('active');
            if (btnWalk) btnWalk.classList.add('active');

            if (player) {
                player.group.visible = (walkPerspective === 'third');
            }
            if (controls) {
                controls.enableRotate = false;
            }
        } else {
            if (hud) hud.classList.add('hidden');
            if (dpad) dpad.classList.add('hidden');
            if (proxCard) proxCard.classList.add('hidden');
            if (quickNav) quickNav.classList.remove('hidden');
            if (controlsGuide) controlsGuide.classList.remove('hidden');
            if (btnOrbit) btnOrbit.classList.add('active');
            if (btnWalk) btnWalk.classList.remove('active');

            if (player) {
                player.group.visible = true;
            }
            if (controls) {
                controls.enableRotate = true;
            }
        }
    }

    function togglePerspective() {
        walkPerspective = (walkPerspective === 'third' ? 'first' : 'third');
        const btn = document.getElementById('btn-walk-pov');
        if (btn) {
            btn.textContent = (walkPerspective === 'third' ? '👁️ 3rd Person View' : '👁️ 1st Person View');
        }
        if (player) {
            player.group.visible = (walkPerspective === 'third');
        }
    }

    function setVirtualKey(keyName, isPressed) {
        if (keys.hasOwnProperty(keyName)) {
            keys[keyName] = isPressed;
        }
    }

    function interactWithCurrentBot() {
        if (nearServerSwitch) {
            focusRoom('room_noc');
            return;
        }
        if (currentNearbyBot) {
            focusBot(currentNearbyBot.id);
        }
    }

    // Toggle LAN Connection for a bot (Physically updates cable + Linux OS IP)
    async function toggleLan(empId) {
        if (!empId) {
            if (currentNearbyBot) empId = currentNearbyBot.id;
            else return;
        }

        try {
            const res = await fetch('/api/network/toggle_lan', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ emp_id: empId })
            });
            const data = await res.json();
            if (data.success) {
                const bot = botsMap.get(empId);
                if (bot) {
                    bot.data.lan_connected = data.lan_connected;
                    bot.data.status = data.status;
                }
                const cable = lanCablesMap.get(empId);
                if (cable) {
                    cable.connected = data.lan_connected;
                    cable.mat.color.setHex(data.lan_connected ? 0x00f0ff : 0xef4444);
                    cable.mat.opacity = data.lan_connected ? 0.85 : 0.25;
                    cable.packet.visible = data.lan_connected;
                }
                const portItem = switchPorts.find(p => p.empId === empId);
                if (portItem) {
                    portItem.connected = data.lan_connected;
                    portItem.mesh.material.color.setHex(data.lan_connected ? 0x10b981 : 0xff0033);
                }

                if (currentNearbyBot && currentNearbyBot.id === empId) {
                    currentNearbyBot.lan_connected = data.lan_connected;
                    checkBotProximity();
                }

                if (window.fetchState) window.fetchState();
            }
        } catch (err) {
            console.error('Error toggling LAN:', err);
        }
    }

    async function toggleLanForNearby() {
        if (nearServerSwitch) {
            // Reconnect all LAN cables in Server Room
            try {
                for (const [id, cable] of lanCablesMap.entries()) {
                    if (!cable.connected) {
                        await fetch('/api/network/toggle_lan', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ emp_id: id, connected: true })
                        });
                    }
                }
                if (window.fetchState) window.fetchState();
            } catch (err) {
                console.error('Error reconnecting all LAN:', err);
            }
            return;
        }

        if (currentNearbyBot) {
            await toggleLan(currentNearbyBot.id);
        }
    }

    // Keyboard Shortcuts for Navigation
    function onKeyDown(e) {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;

        if (currentMode === 'walk') {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') { keys.forward = true; e.preventDefault(); }
            else if (e.code === 'KeyS' || e.code === 'ArrowDown') { keys.backward = true; e.preventDefault(); }
            else if (e.code === 'KeyA' || e.code === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
            else if (e.code === 'KeyD' || e.code === 'ArrowRight') { keys.right = true; e.preventDefault(); }
            else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { keys.sprint = true; }
            else if (e.code === 'KeyE') { interactWithCurrentBot(); }
            else if (e.code === 'KeyL') { toggleLanForNearby(); }
            else if (e.code === 'KeyV') { togglePerspective(); }
            return;
        }

        if (e.key === '+' || e.key === '=') zoomIn();
        else if (e.key === '-' || e.key === '_') zoomOut();
        else if (e.key === 'ArrowLeft') rotateLeft();
        else if (e.key === 'ArrowRight') rotateRight();
        else if (e.key === 'Home' || e.key === '0') resetView();
    }

    function onKeyUp(e) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.forward = false;
        else if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.backward = false;
        else if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
        else if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
        else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.sprint = false;
    }

    // Update Player Movement & Camera Follow in Walk Mode
    function updateWalkMode(delta, elapsedTime) {
        if (!player) return;

        let moveX = 0;
        let moveZ = 0;
        let isMoving = false;

        const turnRate = 3.0 * delta;
        if (keys.left) {
            player.rotY += turnRate;
        }
        if (keys.right) {
            player.rotY -= turnRate;
        }
        player.group.rotation.y = player.rotY;

        const currentSpeed = (keys.sprint ? 24.0 : 14.0) * delta;
        const fwdX = -Math.sin(player.rotY);
        const fwdZ = -Math.cos(player.rotY);

        if (keys.forward) {
            moveX += fwdX * currentSpeed;
            moveZ += fwdZ * currentSpeed;
            isMoving = true;
        }
        if (keys.backward) {
            moveX -= fwdX * (currentSpeed * 0.65);
            moveZ -= fwdZ * (currentSpeed * 0.65);
            isMoving = true;
        }

        player.pos.x = Math.max(-44, Math.min(44, player.pos.x + moveX));
        player.pos.z = Math.max(-34, Math.min(34, player.pos.z + moveZ));
        player.group.position.set(player.pos.x, 0, player.pos.z);

        if (isMoving) {
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

        // Camera Follow in Walk Mode
        if (currentMode === 'walk') {
            if (walkPerspective === 'third') {
                player.group.visible = true;
                const camDistance = 7.0;
                const camHeight = 3.8;
                const desiredCamX = player.pos.x + Math.sin(player.rotY) * camDistance;
                const desiredCamZ = player.pos.z + Math.cos(player.rotY) * camDistance;
                const desiredCamY = camHeight;

                camera.position.lerp(new THREE.Vector3(desiredCamX, desiredCamY, desiredCamZ), 0.15);
                if (controls) {
                    controls.target.lerp(new THREE.Vector3(player.pos.x, 1.6, player.pos.z), 0.2);
                }
            } else {
                player.group.visible = false;
                const eyeY = 1.75;
                camera.position.set(player.pos.x, eyeY, player.pos.z);
                const lookTarget = new THREE.Vector3(
                    player.pos.x - Math.sin(player.rotY) * 10,
                    eyeY - 0.1,
                    player.pos.z - Math.cos(player.rotY) * 10
                );
                camera.lookAt(lookTarget);
                if (controls) {
                    controls.target.copy(lookTarget);
                }
            }
        }

        // Check Proximity to nearest bot or Server Room Core Switch
        checkBotProximity();
    }

    function checkBotProximity() {
        if (!player) return;

        let nearestBot = null;
        let minDist = Infinity;

        botsMap.forEach(b => {
            const d = player.pos.distanceTo(new THREE.Vector3(b.group.position.x, player.pos.y, b.group.position.z));
            if (d < minDist) {
                minDist = d;
                nearestBot = b;
            }
        });

        // Check distance to Central Server Room Switch (NOC Room)
        const distToSwitch = player.pos.distanceTo(new THREE.Vector3(0, 0, -25.5));
        nearServerSwitch = (distToSwitch < 7.0);

        const proxCard = document.getElementById('walk-proximity-card');
        if (!proxCard) return;

        // 1. Proximity to Central Server Room Switch
        if (nearServerSwitch && currentMode === 'walk') {
            currentNearbyBot = null;
            proxCard.classList.remove('hidden');
            document.getElementById('prox-avatar').textContent = '🌐';
            document.getElementById('prox-name').textContent = 'Server Room: Core Switch & Patch Panel';
            document.getElementById('prox-role').textContent = '10G Trunk Interface (ens160 Network Place)';
            
            const lanStatusElem = document.getElementById('prox-lan-status');
            if (lanStatusElem) {
                let downCount = 0;
                lanCablesMap.forEach(c => { if (!c.connected) downCount++; });
                lanStatusElem.innerHTML = `<span class="lan-dot ${downCount > 0 ? 'alert' : 'online'}"></span> 15 Ports Managed (${downCount > 0 ? downCount + ' Disconnected' : 'All Online'})`;
            }

            const lanBtn = document.getElementById('btn-prox-lan');
            if (lanBtn) {
                lanBtn.textContent = '⚡ Reconnect All LAN [L]';
                lanBtn.className = 'btn btn-success prox-btn';
            }
            const talkBtn = document.getElementById('btn-prox-talk');
            if (talkBtn) {
                talkBtn.textContent = '📊 Focus Switch View [E]';
            }
            return;
        }

        // 2. Proximity to a Bot Workstation Desk
        if (minDist < 6.5 && nearestBot && currentMode === 'walk') {
            currentNearbyBot = nearestBot.data;
            proxCard.classList.remove('hidden');
            document.getElementById('prox-avatar').textContent = nearestBot.data.avatar || '🧑‍💻';
            document.getElementById('prox-name').textContent = nearestBot.data.name;
            document.getElementById('prox-role').textContent = `${nearestBot.data.role} (${nearestBot.data.ip})`;

            const isLanConnected = nearestBot.data.lan_connected !== false;
            const lanStatusElem = document.getElementById('prox-lan-status');
            if (lanStatusElem) {
                lanStatusElem.innerHTML = isLanConnected
                    ? `<span class="lan-dot online"></span> 🟢 LAN: CONNECTED (1Gbps Full Duplex)`
                    : `<span class="lan-dot offline"></span> 🔴 LAN: DISCONNECTED (Port Link Down)`;
            }

            const lanBtn = document.getElementById('btn-prox-lan');
            if (lanBtn) {
                lanBtn.textContent = isLanConnected ? '🔌 Unplug LAN [L]' : '🔌 Plug In LAN [L]';
                lanBtn.className = isLanConnected ? 'btn btn-danger prox-btn' : 'btn btn-success prox-btn';
            }
            const talkBtn = document.getElementById('btn-prox-talk');
            if (talkBtn) {
                talkBtn.textContent = '💬 Open Shell [E]';
            }

            if (selectionRing) {
                selectionRing.position.set(nearestBot.group.position.x, 0.08, nearestBot.group.position.z);
                selectionRing.visible = true;
            }
        } else {
            currentNearbyBot = null;
            proxCard.classList.add('hidden');
        }
    }

    // Mouse Move & Raycasting
    function onMouseMove(event) {
        if (!renderer || !camera) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const interactables = [];
        botsMap.forEach(b => interactables.push(b.group));

        const intersects = raycaster.intersectObjects(interactables, true);
        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            while (hitObj.parent && !hitObj.userData.empId) {
                hitObj = hitObj.parent;
            }
            if (hitObj.userData && hitObj.userData.empId) {
                hoveredBotId = hitObj.userData.empId;
                renderer.domElement.style.cursor = 'pointer';
                return;
            }
        }
        hoveredBotId = null;
        renderer.domElement.style.cursor = 'default';
    }

    function onWindowResize() {
        if (!container || !renderer || !camera) return;
        const width = container.clientWidth || 1020;
        const height = container.clientHeight || 660;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    // Animation & Render Loop
    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // 1. Walk Mode Animation & Movement
        updateWalkMode(delta, elapsedTime);

        // 2. Smooth Camera Fly-To Transition (in Orbit Mode)
        if (currentMode === 'orbit' && isTransitioning) {
            camera.position.lerp(targetCamPos, 0.08);
            if (controls) {
                controls.target.lerp(targetLookAt, 0.08);
            }
            if (camera.position.distanceTo(targetCamPos) < 0.35 && (!controls || controls.target.distanceTo(targetLookAt) < 0.35)) {
                camera.position.copy(targetCamPos);
                if (controls) controls.target.copy(targetLookAt);
                isTransitioning = false;
            }
        }

        // Update controls for damping
        if (controls) {
            controls.update();
        }

        // 3. Animate LAN Cable Data Packets
        lanCablesMap.forEach(cable => {
            if (cable.connected && cable.packet.visible) {
                cable.packetProgress = (cable.packetProgress + delta * 0.45) % 1.0;
                const pos = cable.curve.getPointAt(cable.packetProgress);
                cable.packet.position.copy(pos);
            }
        });

        // 4. Animate 3D Bots
        botsMap.forEach(b => {
            const isBlocked = b.data.status === "blocked";
            const isLanDown = b.data.lan_connected === false;
            const isTyping = b.data.status === "working";

            b.charGroup.position.y = 0.8 + Math.sin(elapsedTime * 2.5 + b.animPhase) * 0.04;

            if (isTyping && !isBlocked && !isLanDown) {
                b.leftArm.rotation.x = Math.PI / 4 + Math.sin(elapsedTime * 14 + b.animPhase) * 0.18;
                b.rightArm.rotation.x = Math.PI / 4 + Math.cos(elapsedTime * 14 + b.animPhase) * 0.18;
            }

            if ((isBlocked || isLanDown) && b.alarmGroup.visible) {
                b.alarmGroup.rotation.y += delta * 6;
                const pulse = 1.0 + Math.sin(elapsedTime * 8) * 0.5;
                b.alarmLight.intensity = pulse * 2.5;
            }
        });

        // 5. Animate Server Rack LED Blinking
        serverLeds.forEach(led => {
            const blink = Math.sin(elapsedTime * 5 + led.phase) > 0.3;
            led.mesh.material.color.setHex(blink ? led.origColor : 0x050811);
        });

        // 6. Selection Ring Rotation
        if (selectionRing && selectionRing.visible) {
            selectionRing.rotation.z += delta * 1.5;
        }

        renderer.render(scene, camera);
    }

    window._officeDebug = function() {
        if (!camera || !scene) return "No camera or scene";
        return "SCENE: " + scene.children.length + " objects | CAM: " +
            camera.position.x.toFixed(1) + "," + camera.position.y.toFixed(1) + "," + camera.position.z.toFixed(1) +
            " | ASPECT: " + camera.aspect.toFixed(2) + " | MODE: " + currentMode +
            (controls ? " | TARGET: " + controls.target.x.toFixed(1) + "," + controls.target.y.toFixed(1) + "," + controls.target.z.toFixed(1) : "");
    };

    return {
        init: init,
        update: update,
        focusRoom: focusRoom,
        focusBot: focusBot,
        zoomIn: zoomIn,
        zoomOut: zoomOut,
        rotateLeft: rotateLeft,
        rotateRight: rotateRight,
        resetView: resetView,
        setMode: setMode,
        togglePerspective: togglePerspective,
        setVirtualKey: setVirtualKey,
        interactWithCurrentBot: interactWithCurrentBot,
        toggleLan: toggleLan,
        toggleLanForNearby: toggleLanForNearby
    };
})();
