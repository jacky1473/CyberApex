/**
 * CyberApex 3D Virtual Office Engine - Three.js WebGL Implementation
 * Renders 16 AI Agent Specialists across 8 3D Cabins with dynamic animations,
 * interactive raycasting, workstation monitors, server racks, and alarm beacons.
 * 
 * Features:
 * - Silky-Smooth 360° Orbit Mode
 * - 🚶‍♂️ REAL WALK MODE: First-person & Third-person exploration of the office floor!
 *   Walk with W/A/S/D / Arrows, roam the central lobby and hallways, walk up to bots,
 *   and press [E] to talk and open their live terminals!
 * - On-screen Virtual D-Pad for laptop/touchpad navigation.
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
    const keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false
    };

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
        const floorGeo = new THREE.PlaneGeometry(100, 80);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.65,
            metalness: 0.25
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.05;
        scene.add(floor);

        const grid = new THREE.GridHelper(100, 40, 0x06b6d4, 0x1e293b);
        grid.position.y = 0.01;
        scene.add(grid);
    }

    function buildRooms() {
        for (const [roomId, r] of Object.entries(ROOM_DEFS)) {
            const roomGroup = new THREE.Group();
            roomGroup.position.set(r.x, 0, r.z);

            const tileGeo = new THREE.PlaneGeometry(r.w - 1, r.d - 1);
            const tileMat = new THREE.MeshStandardMaterial({
                color: 0x131d33,
                roughness: 0.5,
                metalness: 0.2
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

            const glassMat = new THREE.MeshStandardMaterial({
                color: r.color,
                transparent: true,
                opacity: 0.28,
                roughness: 0.3
            });

            const wallH = 2.4;
            const wallThick = 0.2;

            const backWallGeo = new THREE.BoxGeometry(r.w - 1, wallH, wallThick);
            const backWall = new THREE.Mesh(backWallGeo, glassMat);
            backWall.position.set(0, wallH / 2, -(r.d - 1) / 2);
            roomGroup.add(backWall);

            const sideWallGeo = new THREE.BoxGeometry(wallThick, wallH, r.d - 1);
            const leftWall = new THREE.Mesh(sideWallGeo, glassMat);
            leftWall.position.set(-(r.w - 1) / 2, wallH / 2, 0);
            roomGroup.add(leftWall);

            const rightWall = new THREE.Mesh(sideWallGeo, glassMat);
            rightWall.position.set((r.w - 1) / 2, wallH / 2, 0);
            roomGroup.add(rightWall);

            const titleSprite = createTextSprite(`${r.icon} ${r.name}`, r.color);
            titleSprite.position.set(0, 5.2, -(r.d - 1) / 2);
            titleSprite.scale.set(7.5, 2.0, 1);
            roomGroup.add(titleSprite);

            if (roomId === "room_mgmt") {
                buildBoardroomTable(roomGroup);
            } else if (roomId === "room_noc" || roomId === "room_admin") {
                buildServerRacks(roomGroup, roomId === "room_admin" ? 0xef4444 : 0x10b981);
            } else if (roomId === "room_cafe") {
                buildCafeBar(roomGroup);
            }

            scene.add(roomGroup);
        }
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
            rotY: Math.PI, // Facing into hallway
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

            const isBlocked = emp.status === "blocked";
            botEntry.alarmGroup.visible = isBlocked;

            if (isBlocked) {
                botEntry.scrFace.material.color.setHex(0xff0033);
            } else {
                const deptCol = DEPT_COLORS[emp.dept] || 0x3b82f6;
                botEntry.scrFace.material.color.setHex(deptCol);
            }
        });
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
        if (currentNearbyBot) {
            focusBot(currentNearbyBot.id);
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

        // Check Proximity to nearest bot
        checkBotProximity();
    }

    function checkBotProximity() {
        let nearestBot = null;
        let minDist = Infinity;

        botsMap.forEach(b => {
            const d = player.pos.distanceTo(new THREE.Vector3(b.group.position.x, player.pos.y, b.group.position.z));
            if (d < minDist) {
                minDist = d;
                nearestBot = b;
            }
        });

        const proxCard = document.getElementById('walk-proximity-card');
        if (minDist < 6.5 && nearestBot && currentMode === 'walk') {
            currentNearbyBot = nearestBot.data;
            if (proxCard) {
                proxCard.classList.remove('hidden');
                document.getElementById('prox-avatar').textContent = nearestBot.data.avatar || '🧑‍💻';
                document.getElementById('prox-name').textContent = nearestBot.data.name;
                document.getElementById('prox-role').textContent = `${nearestBot.data.role} (${nearestBot.data.ip})`;
            }
            if (selectionRing) {
                selectionRing.position.set(nearestBot.group.position.x, 0.08, nearestBot.group.position.z);
                selectionRing.visible = true;
            }
        } else {
            currentNearbyBot = null;
            if (proxCard) {
                proxCard.classList.add('hidden');
            }
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

        // 3. Animate 3D Bots
        botsMap.forEach(b => {
            const isBlocked = b.data.status === "blocked";
            const isTyping = b.data.status === "working";

            b.charGroup.position.y = 0.8 + Math.sin(elapsedTime * 2.5 + b.animPhase) * 0.04;

            if (isTyping && !isBlocked) {
                b.leftArm.rotation.x = Math.PI / 4 + Math.sin(elapsedTime * 14 + b.animPhase) * 0.18;
                b.rightArm.rotation.x = Math.PI / 4 + Math.cos(elapsedTime * 14 + b.animPhase) * 0.18;
            }

            if (isBlocked && b.alarmGroup.visible) {
                b.alarmGroup.rotation.y += delta * 6;
                const pulse = 1.0 + Math.sin(elapsedTime * 8) * 0.5;
                b.alarmLight.intensity = pulse * 2.5;
            }
        });

        // 4. Animate Server Rack LED Blinking
        serverLeds.forEach(led => {
            const blink = Math.sin(elapsedTime * 5 + led.phase) > 0.3;
            led.mesh.material.color.setHex(blink ? led.origColor : 0x050811);
        });

        // 5. Selection Ring Rotation
        if (selectionRing && selectionRing.visible) {
            selectionRing.rotation.z += delta * 1.5;
        }

        renderer.render(scene, camera);
    }

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
        interactWithCurrentBot: interactWithCurrentBot
    };
})();
