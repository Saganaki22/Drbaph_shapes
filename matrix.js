// Matrix Rain Effect
const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Matrix rain characters
const chars = "@drbaph".split('');
const fontSize = 14;
let columns = Math.floor(window.innerWidth / fontSize);
let drops = new Array(columns).fill(0);

// Matrix rain animation
function drawMatrixRain() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = fontSize + 'px monospace';
    
    for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas();
    columns = Math.floor(window.innerWidth / fontSize);
    drops = new Array(columns).fill(0);
});

// Start Matrix rain
let matrixInterval = setInterval(drawMatrixRain, 50);

// Stop matrix rain when loading is done
window.addEventListener('load', () => {
    setTimeout(() => {
        clearInterval(matrixInterval);
    }, 2500);
});
