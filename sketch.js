// Shape variables
let currentShape = 'cube';
let rotX = 0, rotY = 0, rotZ = 0;
let currentScale = 1;
let showGrid = false;
let animationSpeed = 0.3;
let strokeThickness = 0.5;
let canvas;
let zoomFactor = 1;
let time = 0;
let autoRotate = true;

// Background animation variables
let nodes = [];
let numNodes = 80;
let minDist = 30;
let maxDist = 120;
let bgRotation = 0;
let backgroundColor = '#000000';
let bgSpeed = 0.001;

let lastTouchDistance = 0;
let isTouchZooming = false;

function setup() {
    canvas = createCanvas(windowWidth, windowHeight, WEBGL);
    canvas.parent('canvas-container');
    
    // Setup overlay canvas
    let overlayCanvas = document.getElementById('overlayCanvas');
    overlayCanvas.width = windowWidth;
    overlayCanvas.height = windowHeight;
    let ctx = overlayCanvas.getContext('2d');
    
    // Initialize background nodes
    initializeNodes();
    
    // Event listeners for controls
    select('#shapeSelect').changed(() => currentShape = select('#shapeSelect').value());
    select('#rotationX').input(e => rotX = e.target.value);
    select('#rotationY').input(e => rotY = e.target.value);
    select('#rotationZ').input(e => rotZ = e.target.value);
    select('#scale').input(e => currentScale = e.target.value / 100);
    select('#speed').input(e => animationSpeed = e.target.value);
    select('#strokeWeight').input(e => strokeThickness = e.target.value);
    select('#autoRotate').changed(e => autoRotate = e.target.checked);
    select('#showGrid').changed(e => showGrid = e.target.checked);
    select('#strokeColor').input(updateStrokeColor);
    select('#bgColor').input(updateBackgroundColor);
    select('#nodeCount').input(updateNodeCount);
    select('#bgSpeed').input(e => bgSpeed = parseFloat(e.target.value));
    select('#fullscreenBtn').mousePressed(toggleFullscreen);
    select('#cameraButton').mousePressed(() => savePNGFile(true));

    // Add touch event listeners for pinch zoom
    canvas.elt.addEventListener('touchstart', handleTouchStart, false);
    canvas.elt.addEventListener('touchmove', handleTouchMove, false);
    canvas.elt.addEventListener('touchend', handleTouchEnd, false);
}

function handleTouchStart(event) {
    if (event.touches.length === 2) {
        // Calculate initial distance between two fingers
        lastTouchDistance = getTouchDistance(event.touches);
        isTouchZooming = true;
        event.preventDefault();
    }
}

function handleTouchMove(event) {
    if (isTouchZooming && event.touches.length === 2) {
        // Calculate new distance between fingers
        const newDistance = getTouchDistance(event.touches);
        
        // Calculate zoom factor based on the change in distance
        const zoomChange = (newDistance - lastTouchDistance) * 0.01;
        zoomFactor = constrain(zoomFactor + zoomChange, 0.1, 5);
        
        lastTouchDistance = newDistance;
        event.preventDefault();
    }
}

function handleTouchEnd(event) {
    if (event.touches.length < 2) {
        isTouchZooming = false;
    }
}

function getTouchDistance(touches) {
    return dist(
        touches[0].clientX,
        touches[0].clientY,
        touches[1].clientX,
        touches[1].clientY
    );
}

function initializeNodes() {
    nodes = [];
    let fractal = createFractal(4, 0, 0, width / 2);
    for (let i = 0; i < numNodes; i++) {
        let branches = random(fractal);
        nodes.push(createVector(branches.x, branches.y, random(-width/4, width/4)));
    }
}

function updateNodeCount() {
    numNodes = parseInt(select('#nodeCount').value());
    initializeNodes();
}

function updateBackgroundColor() {
    backgroundColor = select('#bgColor').value();
}

function draw() {
    background(backgroundColor);
    
    // Draw background first
    push();
    translate(0, 0, -1000);
    rotateY(bgRotation);
    drawBackground();
    bgRotation += bgSpeed;
    pop();
    
    // Enable orbit control for main shape
    orbitControl();
    
    // Draw main shape
    push();
    if (autoRotate) {
        time += 0.01 * animationSpeed;
        rotateX(time);
        rotateY(time * 0.6);
    }
    
    rotateX(radians(rotX));
    rotateY(radians(rotY));
    rotateZ(radians(rotZ));
    
    scale(currentScale * zoomFactor);
    
    if (showGrid) {
        drawGrid();
    }
    
    drawShape();
    pop();
}

function drawBackground() {
    push();
    scale(2);
    
    // Get current stroke color from the color picker
    let currentColor = color(select('#strokeColor').value());
    
    // Draw connections between nodes
    for (let i = 0; i < nodes.length; i++) {
        let nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
            let nodeB = nodes[j];
            let d = dist(nodeA.x, nodeA.y, nodeA.z, nodeB.x, nodeB.y, nodeB.z);
            
            if (d < maxDist && d > minDist) {
                // Use the same color as the shape but with varying opacity
                currentColor.setAlpha(map(d, minDist, maxDist, 255, 50));
                stroke(currentColor);
                strokeWeight(0.5);
                line(nodeA.x, nodeA.y, nodeA.z, nodeB.x, nodeB.y, nodeB.z);
            }
        }
    }
    
    // Update and draw nodes
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        let force = createVector(0, 0, 0);
        
        // Calculate force from nearby nodes
        for (let j = 0; j < nodes.length; j++) {
            if (i != j) {
                let otherNode = nodes[j];
                let d = dist(node.x, node.y, node.z, otherNode.x, otherNode.y, otherNode.z);
                
                if (d < maxDist && d > minDist) {
                    let angleX = atan2(node.y - otherNode.y, node.z - otherNode.z);
                    let angleY = atan2(node.z - otherNode.z, node.x - otherNode.x);
                    let angleZ = atan2(node.x - otherNode.x, node.y - otherNode.y);
                    let f = map(d, minDist, maxDist, 0.1, 0);
                    force.x += cos(angleY) * sin(angleZ) * f;
                    force.y += sin(angleX) * cos(angleZ) * f;
                    force.z += cos(angleX) * sin(angleY) * f;
                }
            }
        }
        
        // Apply force and constrain node position
        node.add(force);
        node.x = constrain(node.x, -width/2, width/2);
        node.y = constrain(node.y, -height/2, height/2);
        node.z = constrain(node.z, -width/4, width/4);
        
        // Draw node with the same color as the shape
        push();
        translate(node.x, node.y, node.z);
        noStroke();
        currentColor.setAlpha(150);
        fill(currentColor);
        sphere(1.5);
        pop();
    }
    pop();
}

function drawShape() {
    noFill();
    stroke(select('#strokeColor').value());
    strokeWeight(strokeThickness);
    
    switch(currentShape) {
        case 'cube':
            box(100);
            break;
        case 'sphere':
            sphere(50, 16, 16);
            break;
        case 'torus':
            torus(40, 20, 24, 16);
            break;
        case 'cone':
            cone(50, 100, 16, 8);
            break;
        case 'cylinder':
            drawCylinder();
            break;
        case 'triangularPyramid':
            drawTriangularPyramid();
            break;
        case 'hexagonalPrism':
            drawHexagonalPrism();
            break;
        case 'icosahedron':
            drawIcosahedron();
            break;
        case 'schwarzSurface':
            drawSchwarzSurface();
            break;
        case 'gyroid':
            drawGyroid();
            break;
        case 'hyperboloid':
            drawHyperboloid();
            break;
        case 'mobiusStrip':
            drawMobiusStrip();
            break;
    }
}

function drawGrid() {
    stroke(80);  
    let size = 1000;
    let step = 50;
    
    strokeWeight(0.5);
    for (let i = -size; i <= size; i += step) {
        line(i, -size, 0, i, size, 0);
        line(-size, i, 0, size, i, 0);
    }
}

function updateStrokeColor() {
    let color = select('#strokeColor').value();
    stroke(color);
}

function toggleFullscreen() {
    let fs = fullscreen();
    fullscreen(!fs);
}

function savePNGFile(fromCamera = false) {
    if (fromCamera || (window.innerWidth <= 768 || (window.innerWidth / window.innerHeight < 9/16))) {
        // Get the current canvas and its exact content
        const mainCanvas = document.getElementById('defaultCanvas0');
        
        // Create a temporary canvas to add copyright
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = mainCanvas.width;
        tempCanvas.height = mainCanvas.height;
        const ctx = tempCanvas.getContext('2d');
        
        // Copy the main canvas content
        ctx.drawImage(mainCanvas, 0, 0);
        
        // Add copyright text
        ctx.font = '18px Arial';
        ctx.fillStyle = select('#strokeColor').value();
        ctx.textAlign = 'center';
        ctx.fillText('Copyright 2025 DrBaph, UK. All rights reserved.', tempCanvas.width/2, tempCanvas.height - 20);
        
        // Add visual feedback for camera button
        if (fromCamera) {
            const cameraButton = select('#cameraButton').elt;
            const bgColor = select('#bgColor').value();
            const glowColor = bgColor === '#000000' ? 'white' : 'black';
            cameraButton.classList.add('flash');
            cameraButton.style.setProperty('--flash-color', glowColor);
            setTimeout(() => {
                cameraButton.classList.remove('flash');
            }, 200);
        }
        
        // Convert to data URL and download
        const dataURL = tempCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'drbaph-shape.png';
        link.href = dataURL;
        link.click();
    } else {
        // Desktop version with high resolution
        let tempCanvas = document.createElement('canvas');
        const pixelDensity = window.devicePixelRatio || 1;
        const scale = Math.max(2, pixelDensity * 1.5);
        tempCanvas.width = width * scale;
        tempCanvas.height = height * scale;
        
        // Create a temporary WebGL canvas for high-quality rendering
        let tempP5Canvas = createGraphics(tempCanvas.width, tempCanvas.height, WEBGL);
        
        // Match the camera settings of the main canvas
        const fov = PI/3;
        const cameraZ = (tempCanvas.height/2.0) / tan(fov/2.0);
        tempP5Canvas.perspective(fov, tempCanvas.width/tempCanvas.height, cameraZ/10.0, cameraZ*10.0);
        
        // Set background
        tempP5Canvas.background(backgroundColor);
        
        // Draw background with current rotation
        tempP5Canvas.push();
        tempP5Canvas.translate(0, 0, -1000);
        tempP5Canvas.scale(scale);
        tempP5Canvas.rotateY(bgRotation);
        drawBackgroundToCanvas(tempP5Canvas);
        tempP5Canvas.pop();
        
        // Draw shape with current rotation and zoom
        tempP5Canvas.push();
        // Apply current rotations
        tempP5Canvas.rotateX(radians(rotX));
        tempP5Canvas.rotateY(radians(rotY));
        tempP5Canvas.rotateZ(radians(rotZ));
        
        if (autoRotate) {
            tempP5Canvas.rotateX(time);
            tempP5Canvas.rotateY(time * 0.6);
        }
        
        // Apply current scale and zoom
        tempP5Canvas.scale(currentScale * zoomFactor * scale);
        
        if (showGrid) {
            drawGridToCanvas(tempP5Canvas);
        }
        drawShapeToCanvas(tempP5Canvas);
        tempP5Canvas.pop();
        
        // Get 2D context and draw
        let tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = backgroundColor;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(tempP5Canvas.elt, 0, 0);
        
        // Add copyright text
        const fontSize = Math.round(17 * scale);
        drawCopyrightText(tempCtx, tempCanvas.width/2, tempCanvas.height - Math.round(30 * scale), fontSize);
        
        // Save image
        saveCanvas(tempCanvas, 'drbaph-HD', 'png');
    }
}

// Helper function to draw background to a specific canvas
function drawBackgroundToCanvas(targetCanvas) {
    // Draw connections between nodes
    for (let i = 0; i < nodes.length; i++) {
        let nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
            let nodeB = nodes[j];
            let d = dist(nodeA.x, nodeA.y, nodeA.z, nodeB.x, nodeB.y, nodeB.z);
            
            if (d < maxDist && d > minDist) {
                let currentColor = color(select('#strokeColor').value());
                currentColor.setAlpha(map(d, minDist, maxDist, 255, 50));
                targetCanvas.stroke(currentColor);
                targetCanvas.strokeWeight(0.5);
                targetCanvas.line(nodeA.x, nodeA.y, nodeA.z, nodeB.x, nodeB.y, nodeB.z);
            }
        }
    }
    
    // Draw nodes
    for (let node of nodes) {
        targetCanvas.push();
        targetCanvas.translate(node.x, node.y, node.z);
        targetCanvas.noStroke();
        let currentColor = color(select('#strokeColor').value());
        currentColor.setAlpha(150);
        targetCanvas.fill(currentColor);
        targetCanvas.sphere(1.5);
        targetCanvas.pop();
    }
}

// Helper function to draw shape to a specific canvas
function drawShapeToCanvas(targetCanvas) {
    targetCanvas.noFill();
    targetCanvas.stroke(select('#strokeColor').value());
    targetCanvas.strokeWeight(strokeThickness);
    
    switch(currentShape) {
        case 'cube':
            targetCanvas.box(100);
            break;
        case 'sphere':
            targetCanvas.sphere(50, 24, 24); // Increased segments for higher quality
            break;
        case 'torus':
            targetCanvas.torus(40, 20, 32, 24); // Increased segments
            break;
        case 'cone':
            targetCanvas.cone(50, 100, 32, 16); // Increased segments
            break;
        case 'cylinder':
            drawCylinderToCanvas(targetCanvas);
            break;
        case 'triangularPyramid':
            drawTriangularPyramidToCanvas(targetCanvas);
            break;
        case 'hexagonalPrism':
            drawHexagonalPrismToCanvas(targetCanvas);
            break;
        case 'icosahedron':
            drawIcosahedronToCanvas(targetCanvas);
            break;
        // Add other shape cases as needed
    }
}

// Helper function to draw grid to a specific canvas
function drawGridToCanvas(targetCanvas) {
    targetCanvas.stroke(100);
    targetCanvas.strokeWeight(0.5);
    let size = 100;
    let step = 20;
    
    for (let x = -size; x <= size; x += step) {
        targetCanvas.line(x, -size, 0, x, size, 0);
        targetCanvas.line(-size, x, 0, size, x, 0);
    }
}

function mouseWheel(event) {
    zoomFactor -= event.delta * 0.001;
    zoomFactor = constrain(zoomFactor, 0.1, 5);
    return false;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // Resize overlay canvas
    let overlayCanvas = document.getElementById('overlayCanvas');
    overlayCanvas.width = windowWidth;
    overlayCanvas.height = windowHeight;
    let ctx = overlayCanvas.getContext('2d');
}

function createIcosahedron() {
    let t = (1 + Math.sqrt(5)) / 2; // Golden ratio
    let vertices = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ];
    
    let faces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    
    // Normalize vertices
    vertices = vertices.map(v => {
        let len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
        return [v[0] / len * 50, v[1] / len * 50, v[2] / len * 50];
    });
    
    return { vertices, faces };
}

function drawIcosahedron() {
    let { vertices, faces } = createIcosahedron();
    beginShape(LINES);
    for (let face of faces) {
        for (let i = 0; i < 3; i++) {
            let v1 = vertices[face[i]];
            let v2 = vertices[face[(i + 1) % 3]];
            vertex(v1[0], v1[1], v1[2]);
            vertex(v2[0], v2[1], v2[2]);
        }
    }
    endShape();
}

function createDodecahedron() {
    let phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
    
    let vertices = [
        [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
        [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
        [0, -1 / phi, -phi], [0, -1 / phi, phi], [0, 1 / phi, -phi], [0, 1 / phi, phi],
        [-1 / phi, -phi, 0], [-1 / phi, phi, 0], [1 / phi, -phi, 0], [1 / phi, phi, 0],
        [-phi, 0, -1 / phi], [-phi, 0, 1 / phi], [phi, 0, -1 / phi], [phi, 0, 1 / phi]
    ];
    
    let faces = [
        [0, 8, 10, 2, 16], [0, 16, 18, 4, 12], [0, 12, 14, 8, 1], [1, 8, 10, 3, 17],
        [1, 17, 19, 5, 9], [1, 9, 11, 3, 7], [2, 10, 11, 3, 17], [2, 17, 19, 6, 18],
        [2, 18, 16, 0, 12], [3, 10, 11, 7, 15], [3, 15, 13, 5, 9], [3, 9, 7, 1, 17],
        [4, 12, 14, 6, 18], [4, 18, 19, 5, 13], [4, 13, 15, 6, 14], [5, 13, 15, 7, 11],
        [5, 11, 9, 1, 17], [6, 14, 8, 0, 16], [6, 16, 18, 4, 12], [6, 12, 14, 2, 10]
    ];
    
    // Scale vertices to match other shapes
    vertices = vertices.map(v => {
        return [v[0] * 50, v[1] * 50, v[2] * 50]; 
    });
    
    return { vertices, faces };
}

function drawDodecahedron() {
    let { vertices, faces } = createDodecahedron();
    beginShape(LINES);
    // Draw each face
    for (let face of faces) {
        // Connect vertices to form the pentagon
        for (let i = 0; i < face.length; i++) {
            let v1 = vertices[face[i]];
            let v2 = vertices[face[(i + 1) % face.length]];
            vertex(v1[0], v1[1], v1[2]);
            vertex(v2[0], v2[1], v2[2]);
        }
    }
    endShape();
}

function createSchwarzMinimalSurface(uRes = 50, vRes = 50) {
    let vertices = [];
    let indices = [];
    let scale = 2;

    for (let u = 0; u < uRes; u++) {
        let uAngle = (u / (uRes - 1)) * 2 * Math.PI;
        for (let v = 0; v < vRes; v++) {
            let vAngle = (v / (vRes - 1)) * 2 * Math.PI;
            let x = Math.sin(uAngle) * Math.cos(vAngle) * scale;
            let y = Math.sin(vAngle) * Math.cos(uAngle) * scale;
            let z = Math.cos(uAngle) * Math.cos(vAngle) * scale;
            vertices.push([x * 25, y * 25, z * 25]); // Scale to match other shapes
        }
    }

    // Generate indices for triangles
    for (let u = 0; u < uRes - 1; u++) {
        for (let v = 0; v < vRes - 1; v++) {
            let i = u * vRes + v;
            indices.push(i, i + 1, i + vRes);
            indices.push(i + 1, i + vRes + 1, i + vRes);
        }
    }

    return { vertices, indices };
}

function drawSchwarzSurface() {
    let { vertices, indices } = createSchwarzMinimalSurface(30, 30);
    beginShape(LINES);
    for (let i = 0; i < indices.length; i += 3) {
        let v1 = vertices[indices[i]];
        let v2 = vertices[indices[i + 1]];
        let v3 = vertices[indices[i + 2]];
        
        // Draw triangle edges
        vertex(...v1);
        vertex(...v2);
        
        vertex(...v2);
        vertex(...v3);
        
        vertex(...v3);
        vertex(...v1);
    }
    endShape();
}

function createGyroid(uRes = 50, vRes = 50) {
    let vertices = [];
    let indices = [];
    let scale = 5;

    for (let u = 0; u < uRes; u++) {
        let uAngle = (u / (uRes - 1)) * 2 * Math.PI;
        for (let v = 0; v < vRes; v++) {
            let vAngle = (v / (vRes - 1)) * 2 * Math.PI;
            let x = Math.cos(uAngle) * scale;
            let y = Math.cos(vAngle) * scale;
            let z = Math.sin(uAngle + vAngle) * scale;
            vertices.push([x * 4, y * 4, z * 4]); // Scale to match other shapes
        }
    }

    // Generate indices
    for (let u = 0; u < uRes - 1; u++) {
        for (let v = 0; v < vRes - 1; v++) {
            let i = u * vRes + v;
            indices.push(i, i + 1, i + vRes);
            indices.push(i + 1, i + vRes + 1, i + vRes);
        }
    }

    return { vertices, indices };
}

function drawGyroid() {
    let { vertices, indices } = createGyroid(30, 30);
    beginShape(LINES);
    for (let i = 0; i < indices.length; i += 3) {
        let v1 = vertices[indices[i]];
        let v2 = vertices[indices[i + 1]];
        let v3 = vertices[indices[i + 2]];
        
        // Draw triangle edges
        vertex(...v1);
        vertex(...v2);
        
        vertex(...v2);
        vertex(...v3);
        
        vertex(...v3);
        vertex(...v1);
    }
    endShape();
}

function createHyperboloid(uRes = 50, vRes = 50) {
    let vertices = [];
    let indices = [];
    let scale = 3;

    for (let u = 0; u < uRes; u++) {
        let theta = (u / (uRes - 1)) * 2 * Math.PI;
        for (let v = 0; v < vRes; v++) {
            let z = (v / (vRes - 1) - 0.5) * 4; // -2 to 2
            let r = Math.sqrt(1 + z*z);
            vertices.push([
                r * Math.cos(theta) * scale * 15,
                r * Math.sin(theta) * scale * 15,
                z * scale * 15
            ]);
        }
    }

    // Generate indices
    for (let u = 0; u < uRes - 1; u++) {
        for (let v = 0; v < vRes - 1; v++) {
            let i = u * vRes + v;
            indices.push(i, i + vRes, i + 1);
            indices.push(i + 1, i + vRes, i + vRes + 1);
        }
    }

    return { vertices, indices };
}

function drawHyperboloid() {
    let { vertices, indices } = createHyperboloid(30, 20);
    beginShape(LINES);
    for (let i = 0; i < indices.length; i += 3) {
        let v1 = vertices[indices[i]];
        let v2 = vertices[indices[i + 1]];
        let v3 = vertices[indices[i + 2]];
        
        // Draw triangle edges
        vertex(...v1);
        vertex(...v2);
        
        vertex(...v2);
        vertex(...v3);
        
        vertex(...v3);
        vertex(...v1);
    }
    endShape();
}

function createMobiusStrip(uRes = 100, vRes = 10) {
    let vertices = [];
    let indices = [];
    let scale = 3;

    for (let u = 0; u < uRes; u++) {
        let t = (u / (uRes - 1)) * 2 * Math.PI;
        for (let v = 0; v < vRes; v++) {
            let w = -1 + (v / (vRes - 1)) * 2; // -1 to 1
            let x = Math.cos(t) * (1 + w * Math.cos(t/2));
            let y = Math.sin(t) * (1 + w * Math.cos(t/2));
            let z = w * Math.sin(t/2);
            vertices.push([x*scale*25, y*scale*25, z*scale*25]);
        }
    }

    // Generate indices with wrap-around
    for (let u = 0; u < uRes - 1; u++) {
        for (let v = 0; v < vRes - 1; v++) {
            let i = u * vRes + v;
            indices.push(i, i + 1, i + vRes);
            indices.push(i + 1, i + vRes + 1, i + vRes);
        }
    }

    // Close the loop
    let lastU = uRes - 1;
    for (let v = 0; v < vRes - 1; v++) {
        let i = lastU * vRes + v;
        indices.push(i, i + 1, v);
        indices.push(i + 1, v + 1, v);
    }

    return { vertices, indices };
}

function drawMobiusStrip() {
    let { vertices, indices } = createMobiusStrip(100, 10);
    beginShape(LINES);
    for (let i = 0; i < indices.length; i += 3) {
        let v1 = vertices[indices[i]];
        let v2 = vertices[indices[i + 1]];
        let v3 = vertices[indices[i + 2]];
        
        // Draw triangle edges
        vertex(...v1);
        vertex(...v2);
        
        vertex(...v2);
        vertex(...v3);
        
        vertex(...v3);
        vertex(...v1);
    }
    endShape();
}

function drawCylinder(radius = 40, height = 100, segments = 16) {
    let topPoints = [];
    let bottomPoints = [];
    
    // Create top and bottom circles
    for (let i = 0; i < segments; i++) {
        let angle = (TWO_PI / segments) * i;
        let x = cos(angle) * radius;
        let z = sin(angle) * radius;
        topPoints.push([x, -height/2, z]);
        bottomPoints.push([x, height/2, z]);
    }
    
    // Draw the cylinder
    beginShape(LINES);
    
    // Draw top and bottom circles
    for (let i = 0; i < segments; i++) {
        let next = (i + 1) % segments;
        // Top circle
        vertex(...topPoints[i]);
        vertex(...topPoints[next]);
        // Bottom circle
        vertex(...bottomPoints[i]);
        vertex(...bottomPoints[next]);
        // Vertical lines
        vertex(...topPoints[i]);
        vertex(...bottomPoints[i]);
    }
    
    endShape();
}

function drawTriangularPyramid(baseSize = 60, height = 100) {
    let h = height/2;
    let a = baseSize/2;
    
    // Base vertices
    let v1 = [-a, h, -a];
    let v2 = [a, h, -a];
    let v3 = [0, h, a];
    // Apex
    let apex = [0, -h, 0];
    
    beginShape(LINES);
    // Base
    vertex(...v1);
    vertex(...v2);
    
    vertex(...v2);
    vertex(...v3);
    
    vertex(...v3);
    vertex(...v1);
    
    // Edges to apex
    vertex(...v1);
    vertex(...apex);
    
    vertex(...v2);
    vertex(...apex);
    
    vertex(...v3);
    vertex(...apex);
    
    endShape();
}

function drawHexagonalPrism(radius = 40, height = 100) {
    let topPoints = [];
    let bottomPoints = [];
    let segments = 6; // Hexagon has 6 sides
    
    // Create top and bottom hexagons
    for (let i = 0; i < segments; i++) {
        let angle = (TWO_PI / segments) * i;
        let x = cos(angle) * radius;
        let z = sin(angle) * radius;
        topPoints.push([x, -height/2, z]);
        bottomPoints.push([x, height/2, z]);
    }
    
    // Draw the prism
    beginShape(LINES);
    
    // Draw top and bottom hexagons
    for (let i = 0; i < segments; i++) {
        let next = (i + 1) % segments;
        // Top hexagon
        vertex(...topPoints[i]);
        vertex(...topPoints[next]);
        // Bottom hexagon
        vertex(...bottomPoints[i]);
        vertex(...bottomPoints[next]);
        // Vertical lines
        vertex(...topPoints[i]);
        vertex(...bottomPoints[i]);
    }
    
    endShape();
}

// Create Sierpinski triangle fractal
function createFractal(depth, x, y, size) {
    if (depth == 0) {
        return [{ x: x, y: y }];
    } else {
        let points = [];
        let halfSize = size / 2;
        points = points.concat(createFractal(depth - 1, x - halfSize, y - halfSize, halfSize));
        points = points.concat(createFractal(depth - 1, x + halfSize, y - halfSize, halfSize));
        points = points.concat(createFractal(depth - 1, x, y + halfSize, halfSize));
        return points;
    }
}

// Function to draw copyright text on exported content
function drawCopyrightText(ctx, x, y, fontSize = 14) {
    ctx.save();
    
    // Calculate stroke width based on font size
    const strokeWidth = Math.max(2, Math.round(fontSize * 0.1));
    
    // Add shadow
    ctx.shadowBlur = Math.round(fontSize * 0.3);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowOffsetX = Math.round(fontSize * 0.15);
    ctx.shadowOffsetY = Math.round(fontSize * 0.15);
    
    // Text settings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = strokeWidth;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    const text = document.getElementById('copyright').textContent;
    
    // Draw stroke first
    ctx.strokeText(text, x, y);
    // Then fill
    ctx.fillText(text, x, y);
    
    ctx.restore();
}
