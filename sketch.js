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

function setup() {
    canvas = createCanvas(windowWidth, windowHeight, WEBGL);
    canvas.parent('canvas-container');
    
    // Setup overlay canvas
    let overlayCanvas = document.getElementById('overlayCanvas');
    overlayCanvas.width = windowWidth;
    overlayCanvas.height = windowHeight;
    let ctx = overlayCanvas.getContext('2d');
    drawCopyrightText(ctx, windowWidth/2, windowHeight - 20);
    
    // Initialize background nodes
    initializeNodes();
    
    // Setup controls toggle
    const toggleBtn = document.getElementById('toggleControls');
    const controls = document.getElementById('controls');
    toggleBtn.addEventListener('click', () => {
        controls.classList.toggle('controls-hidden');
        toggleBtn.classList.toggle('active');
    });
    
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
    select('#savePNG').mousePressed(savePNGFile);
    
    // Setup controls toggle
    const toggleBtn2 = document.getElementById('toggleControls');
    const controls2 = document.getElementById('controls');
    toggleBtn2.addEventListener('click', () => {
        controls2.classList.toggle('controls-hidden');
        toggleBtn2.classList.toggle('active');
    });
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

function savePNGFile() {
    // Create a high-resolution canvas
    let tempCanvas = document.createElement('canvas');
    const scale = 2; // Increase resolution by 2x
    tempCanvas.width = width * scale;
    tempCanvas.height = height * scale;
    let tempCtx = tempCanvas.getContext('2d');
    
    // Scale everything up for higher resolution
    tempCtx.scale(scale, scale);
    
    // Enable high-quality image scaling
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    
    // Draw the main canvas content
    tempCtx.drawImage(canvas.elt, 0, 0, width, height);
    
    // Add copyright with stroke and shadow
    drawCopyrightText(tempCtx, width/2, height - 20);
    
    // Save the high-resolution image with new filename
    saveCanvas(tempCanvas, 'drbaph-HD', 'png');
}

function mouseWheel(event) {
    zoomFactor -= event.delta * 0.001;
    zoomFactor = constrain(zoomFactor, 0.1, 5);
    return false;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // Resize and update overlay canvas
    let overlayCanvas = document.getElementById('overlayCanvas');
    overlayCanvas.width = windowWidth;
    overlayCanvas.height = windowHeight;
    let ctx = overlayCanvas.getContext('2d');
    drawCopyrightText(ctx, windowWidth/2, windowHeight - 20);
}

function drawCopyrightText(ctx, x, y) {
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Add drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Add black stroke
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText("Copyright 2025 DrBaph, UK. All rights reserved.", x, y);
    
    // Add white text
    ctx.fillStyle = 'white';
    ctx.fillText("Copyright 2025 DrBaph, UK. All rights reserved.", x, y);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
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