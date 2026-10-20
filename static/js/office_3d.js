/**
 * CyberApex 3D Virtual Office Engine - Three.js WebGL Implementation
 * Renders 16 AI Agent Specialists across 8 3D Cabins with dynamic animations,
 * interactive raycasting, workstation monitors, server racks, and alarm beacons.
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

    // Camera animation target
    let targetCamPos = new THREE.Vector3(0, 48, 62);
    let targetLookAt = new THREE.Vector3(0, 0, 0);

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

    // Camera view presets
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
        container.appendChild(renderer.domElement);

        // 4. Controls
        if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.maxPolarAngle = Math.PI / 2.15; // Don't go below floor
            controls.minDistance = 12;
            controls.maxDistance = 120;
            controls.target.copy(targetLookAt);
        }

        // 5. Lighting
        setupLighting();

        // 6. Floor & Environment
        buildFloor();
        buildRooms();

        // 7. Interactive Selection Ring
        buildSelectionRing();

        // 8. Event Listeners
        window.addEventListener('resize', onWindowResize);
        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('click', onClick);

        isInitialized = true;
        animate();
    }

    function setupLighting() {
        // Ambient soft fill
        const ambLight = new THREE.AmbientLight(0x64748b, 0.95);
        scene.add(ambLight);

        // Directional overhead main light
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
        dirLight.position.set(30, 60, 40);
        scene.add(dirLight);

        // Accent Point Lights in Cabins for Cyber Glow
        for (const [key, r] of Object.entries(ROOM_DEFS)) {
            const pLight = new THREE.PointLight(r.color, 1.1, 22);
            pLight.position.set(r.x, 6, r.z);
            scene.add(pLight);
        }
    }

    function buildFloor() {
        // Main dark reflective platform
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

        // Neon Cyber Grid
        const grid = new THREE.GridHelper(100, 40, 0x06b6d4, 0x1e293b);
        grid.position.y = 0.01;
        scene.add(grid);
    }

    function buildRooms() {
        for (const [roomId, r] of Object.entries(ROOM_DEFS)) {
            const roomGroup = new THREE.Group();
            roomGroup.position.set(r.x, 0, r.z);

            // Floor Tile for Cabin
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

            // Glowing Boundary Trim
            const edgesGeo = new THREE.EdgesGeometry(tileGeo);
            const edgesMat = new THREE.LineBasicMaterial({ color: r.color, linewidth: 2 });
            const border = new THREE.LineSegments(edgesGeo, edgesMat);
            border.rotation.x = -Math.PI / 2;
            border.position.y = 0.04;
            roomGroup.add(border);

            // Semi-Transparent Low Glass Walls (High-Performance standard material)
            const glassMat = new THREE.MeshStandardMaterial({
                color: r.color,
                transparent: true,
                opacity: 0.28,
                roughness: 0.3
            });

            const wallH = 2.4;
            const wallThick = 0.2;

            // Back Wall
            const backWallGeo = new THREE.BoxGeometry(r.w - 1, wallH, wallThick);
            const backWall = new THREE.Mesh(backWallGeo, glassMat);
            backWall.position.set(0, wallH / 2, -(r.d - 1) / 2);
            roomGroup.add(backWall);

            // Left Wall
            const sideWallGeo = new THREE.BoxGeometry(wallThick, wallH, r.d - 1);
            const leftWall = new THREE.Mesh(sideWallGeo, glassMat);
            leftWall.position.set(-(r.w - 1) / 2, wallH / 2, 0);
            roomGroup.add(leftWall);

            // Right Wall
            const rightWall = new THREE.Mesh(sideWallGeo, glassMat);
            rightWall.position.set((r.w - 1) / 2, wallH / 2, 0);
            roomGroup.add(rightWall);

            // 3D Floating Room Title Banner (Billboard Sprite)
            const titleSprite = createTextSprite(`${r.icon} ${r.name}`, r.color);
            titleSprite.position.set(0, 5.2, -(r.d - 1) / 2);
            titleSprite.scale.set(7.5, 2.0, 1);
            roomGroup.add(titleSprite);

            // Specific Room Props
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
        // Oval / Rounded Conference Table
        const tableGeo = new THREE.CylinderGeometry(5.0, 5.0, 0.4, 24);
        tableGeo.scale(1.4, 1.0, 0.8);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.4 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 1.2, 0);
        table.castShadow = true;
        table.receiveShadow = true;
        group.add(table);

        // Center holographic presentation core
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

            // Blinking LED dots
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
        // Coffee Bar Counter
        const barGeo = new THREE.BoxGeometry(10, 1.4, 2.2);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(0, 0.7, -5.5);
        bar.castShadow = true;
        group.add(bar);

        // Espresso Machine
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

    // Create 3D Bot Character & Workstation
    function createBotMesh(emp) {
        const botGroup = new THREE.Group();
        botGroup.userData = { empId: emp.id, empData: emp };

        const deptColor = DEPT_COLORS[emp.dept] || 0x3b82f6;

        // 1. Desk
        const deskGeo = new THREE.BoxGeometry(2.6, 0.12, 1.4);
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.3 });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(0, 1.0, 0);
        desk.castShadow = true;
        desk.receiveShadow = true;
        botGroup.add(desk);

        // Desk Legs
        const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
        const legOffsets = [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]];
        legOffsets.forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lx, 0.5, lz);
            leg.castShadow = true;
            botGroup.add(leg);
        });

        // 2. Computer Monitor with Glowing Screen
        const monBaseGeo = new THREE.BoxGeometry(0.35, 0.04, 0.3);
        const monBase = new THREE.Mesh(monBaseGeo, legMat);
        monBase.position.set(0, 1.08, -0.35);
        botGroup.add(monBase);

        const monStemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
        const monStem = new THREE.Mesh(monStemGeo, legMat);
        monStem.position.set(0, 1.28, -0.35);
        botGroup.add(monStem);

        // Screen bezel
        const scrBezelGeo = new THREE.BoxGeometry(1.6, 0.95, 0.08);
        const scrBezel = new THREE.Mesh(scrBezelGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        scrBezel.position.set(0, 1.7, -0.35);
        botGroup.add(scrBezel);

        // Glowing Screen Face
        const scrFaceGeo = new THREE.PlaneGeometry(1.5, 0.85);
        const scrFaceMat = new THREE.MeshBasicMaterial({ color: deptColor });
        const scrFace = new THREE.Mesh(scrFaceGeo, scrFaceMat);
        scrFace.position.set(0, 1.7, -0.30);
        botGroup.add(scrFace);

        // Keyboard & Mouse
        const kbGeo = new THREE.BoxGeometry(0.9, 0.03, 0.35);
        const kb = new THREE.Mesh(kbGeo, new THREE.MeshStandardMaterial({ color: 0x090d16 }));
        kb.position.set(0, 1.08, 0.2);
        botGroup.add(kb);

        // 3. Ergonomic Chair
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

        // 4. Stylized 3D Bot Character Body
        const charGroup = new THREE.Group();
        charGroup.position.set(0, 0.8, 0.7);

        // Torso
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

        // Head
        const headGeo = new THREE.SphereGeometry(0.48, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.5 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.5, 0);
        head.castShadow = true;
        charGroup.add(head);

        // Visor / Eyes (Glows Cyan)
        const visorGeo = new THREE.BoxGeometry(0.65, 0.18, 0.25);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.5, -0.38);
        charGroup.add(visor);

        // Arms (For Typing Animation)
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

        // 5. Overhead 3D Floating Name & Status Billboard
        const nameSprite = createTextSprite(`${emp.avatar || '🧑‍💻'} ${emp.name}`, deptColor);
        nameSprite.position.set(0, 3.8, 0);
        nameSprite.scale.set(6.0, 1.5, 1);
        botGroup.add(nameSprite);

        // 6. Emergency Red Alarm Beacon (For BLOCKED status)
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

        // Keep references for dynamic updates
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

    // Helper: Create Text Sprite Canvas Texture
    function createTextSprite(text, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Glass pill background
        ctx.fillStyle = 'rgba(11, 15, 29, 0.85)';
        roundRect(ctx, 8, 8, 496, 112, 24);
        ctx.fill();

        // Border
        const hexStr = typeof colorHex === 'number' ? '#' + colorHex.toString(16).padStart(6, '0') : colorHex;
        ctx.strokeStyle = hexStr;
        ctx.lineWidth = 6;
        roundRect(ctx, 8, 8, 496, 112, 24);
        ctx.stroke();

        // Text
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

    // Calculate 3D position from 2D coordinates
    function map2Dto3D(emp, index) {
        const room = ROOM_DEFS[emp.room_id] || ROOM_DEFS.room_backend;
        
        // Desk slot relative offset inside room
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

    // Update Bots from Server API State
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

            // Handle BLOCKED status
            const isBlocked = emp.status === "blocked";
            botEntry.alarmGroup.visible = isBlocked;

            // Update screen color if blocked
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
        const preset = VIEW_PRESETS[roomId] || VIEW_PRESETS.all;
        targetCamPos.copy(preset.pos);
        targetLookAt.copy(preset.look);
    }

    // Focus on a specific 3D Bot
    function focusBot(botId) {
        const bot = botsMap.get(botId);
        if (!bot) return;

        selectedBotId = botId;
        const bPos = bot.group.position;
        targetCamPos.set(bPos.x, bPos.y + 6, bPos.z + 12);
        targetLookAt.set(bPos.x, bPos.y + 1.2, bPos.z);

        // Position selection ring
        selectionRing.position.set(bPos.x, 0.08, bPos.z);
        selectionRing.visible = true;

        // Trigger agent detail card
        if (window.show3DAgentCard) {
            window.show3DAgentCard(bot.data);
        }
    }

    // Mouse Move & Raycasting
    function onMouseMove(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Find intersected bot groups
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

    // Click on Bot in 3D Scene
    function onClick(event) {
        if (hoveredBotId) {
            focusBot(hoveredBotId);
        }
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

        // 1. Smooth Camera Interpolation (Lerp)
        camera.position.lerp(targetCamPos, 0.05);
        if (controls) {
            controls.target.lerp(targetLookAt, 0.05);
            controls.update();
        }

        // 2. Animate 3D Bots
        botsMap.forEach(b => {
            const isBlocked = b.data.status === "blocked";
            const isTyping = b.data.status === "working";

            // Idle breathing bob
            b.charGroup.position.y = 0.8 + Math.sin(elapsedTime * 2.5 + b.animPhase) * 0.04;

            // Typing arm movement
            if (isTyping && !isBlocked) {
                b.leftArm.rotation.x = Math.PI / 4 + Math.sin(elapsedTime * 14 + b.animPhase) * 0.18;
                b.rightArm.rotation.x = Math.PI / 4 + Math.cos(elapsedTime * 14 + b.animPhase) * 0.18;
            }

            // Emergency alarm rotation & pulse
            if (isBlocked && b.alarmGroup.visible) {
                b.alarmGroup.rotation.y += delta * 6;
                const pulse = 1.0 + Math.sin(elapsedTime * 8) * 0.5;
                b.alarmLight.intensity = pulse * 2.5;
            }
        });

        // 3. Animate Server Rack LED Blinking
        serverLeds.forEach(led => {
            const blink = Math.sin(elapsedTime * 5 + led.phase) > 0.3;
            led.mesh.material.color.setHex(blink ? led.origColor : 0x050811);
        });

        // 4. Selection Ring Rotation
        if (selectionRing && selectionRing.visible) {
            selectionRing.rotation.z += delta * 1.5;
        }

        renderer.render(scene, camera);
    }

    return {
        init: init,
        update: update,
        focusRoom: focusRoom,
        focusBot: focusBot
    };
})();
