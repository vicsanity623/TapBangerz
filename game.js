const SPRITE_CONFIG = {
    frameWidth: 320,      // Width of ONE single frame
    frameHeight: 468,     // Height of the image 
    totalFrames: 10,      // Total count (3200px width / 320px frame = 10 frames)
    
    baseSpeed: 0.1,       // How fast it loops naturally (0.1 is slow/idle)
    drag: 0.95,           // Friction (0.95 = slides a bit; 0.90 = stops fast)
    acceleration: 0.5     // How much speed to add per tap
};
// --- GAME STATE ---
let gameState = {
    gold: 0,
    level: 1,
    xp: 0,
    xpToNext: 100,
    combo: 0,
    comboTimer: null,
    
    // Physics State
    currentFrame: 0,
    velocity: 0,
    isInteracting: false
};

// --- DOM ELEMENTS ---
const spriteEl = document.getElementById('action-sprite');
const wrapperEl = document.querySelector('.sprite-wrapper');
const goldEl = document.getElementById('gold-display');
const levelEl = document.getElementById('level-display');
const xpFillEl = document.getElementById('xp-fill');
const comboContainer = document.getElementById('combo-container');
const comboCountEl = document.getElementById('combo-count');
const fxLayer = document.getElementById('fx-layer');
const container = document.getElementById('game-container');

// Set initial sprite size dynamically
spriteEl.style.width = `${SPRITE_CONFIG.frameWidth}px`;
spriteEl.style.height = `${SPRITE_CONFIG.frameHeight}px`;


// --- CORE INTERACTION ---
function handleTap(e) {
    // Prevent default browser zooming/scrolling
    if(e.cancelable) e.preventDefault();

    // 1. Physics: Add speed to the sprite
    gameState.velocity += SPRITE_CONFIG.acceleration;
    // Cap max speed
    if (gameState.velocity > 3.5) gameState.velocity = 3.5;

    // 2. Logic: Rewards
    addRewards(e);

    // 3. Visuals: Juice
    createPulseEffect();
    
    // Get tap coordinates (supports mouse and touch)
    let x, y;
    if (e.type === 'touchstart') {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    } else {
        x = e.clientX;
        y = e.clientY;
    }
    
    // Spawn Effects
    spawnFloatingText(x, y);
    spawnComicParticle(x, y);
}

// --- REWARD SYSTEM ---
function addRewards(e) {
    // Combo Logic
    gameState.combo++;
    clearTimeout(gameState.comboTimer);
    
    // Show Combo UI
    comboContainer.classList.remove('hidden');
    comboCountEl.innerText = gameState.combo + "x";
    
    // Visual Shake logic for high combos
    if (gameState.combo > 10 && gameState.combo % 5 === 0) {
        screenShake();
        createComicText(); // Spawns "POW!" "WHAM!"
    }

    // Reset combo if no tap for 2 seconds
    gameState.comboTimer = setTimeout(() => {
        gameState.combo = 0;
        comboContainer.classList.add('hidden');
    }, 1500);

    // Calculate Gold (Base + Combo Multiplier)
    let addedGold = Math.floor(1 + (gameState.combo * 0.5));
    gameState.gold += addedGold;
    
    // XP Logic
    gameState.xp += 5;
    if(gameState.xp >= gameState.xpToNext) {
        levelUp();
    }

    updateUI();
}

function levelUp() {
    gameState.level++;
    gameState.xp = 0;
    gameState.xpToNext = Math.floor(gameState.xpToNext * 1.5);
    
    // Level Up FX
    const levelText = document.createElement('div');
    levelText.className = 'float-text';
    levelText.innerText = "LEVEL UP!";
    levelText.style.color = "#00e5ff";
    levelText.style.left = "50%";
    levelText.style.top = "50%";
    levelText.style.transform = "translate(-50%, -50%)";
    levelText.style.fontSize = "4rem";
    fxLayer.appendChild(levelText);
    setTimeout(() => levelText.remove(), 2000);
}

function updateUI() {
    goldEl.innerText = gameState.gold.toLocaleString();
    levelEl.innerText = gameState.level;
    
    let xpPercent = (gameState.xp / gameState.xpToNext) * 100;
    xpFillEl.style.width = `${xpPercent}%`;
}


// --- PHYSICS ENGINE (Loop) ---
function gameLoop() {
    // 1. Apply Friction to the velocity (Slow down the extra speed)
    gameState.velocity *= SPRITE_CONFIG.drag;

    // If velocity is super low, just snap to 0 to stop calculation floating points
    if (gameState.velocity < 0.01) gameState.velocity = 0;

    // 2. Manage Idle vs Active State
    // If we have speed (tapping), remove the gentle breathing animation
    if (gameState.velocity > 0.1) {
        wrapperEl.classList.remove('idle-mode');
    } else {
        // If we are stopped, add the gentle breathing animation
        wrapperEl.classList.add('idle-mode');
    }

    // 3. Calculate Final Speed
    // It is now Base Speed (Idle) + Velocity (Tapping)
    // This ensures it ALWAYS loops, but speeds up when you tap.
    let currentSpeed = SPRITE_CONFIG.baseSpeed + gameState.velocity;

    // 4. Advance Frames
    gameState.currentFrame += currentSpeed;
    
    // Loop the frames
    if (gameState.currentFrame >= SPRITE_CONFIG.totalFrames) {
        gameState.currentFrame = 0;
    }

    // Calculate Pixel Position
    let frameIndex = Math.floor(gameState.currentFrame);
    let posX = -(frameIndex * SPRITE_CONFIG.frameWidth);
    
    spriteEl.style.backgroundPosition = `${posX}px 0px`;

    // 5. Visual "Rumble" (Only happen if tapping fast)
    if (gameState.velocity > 2) {
        let shake = (Math.random() - 0.5) * 10;
        // We override the transform, so the 'idle' animation doesn't fight it
        wrapperEl.style.transform = `rotate(${shake}deg) scale(1.1)`;
    } else if (gameState.velocity > 0.1) {
        // Reset shake if slowing down but not yet idle
        wrapperEl.style.transform = `rotate(0deg) scale(1.0)`;
    } 
    // Note: If velocity is < 0.1, the CSS .idle-mode class takes over the transform!

    requestAnimationFrame(gameLoop);
}


// --- VISUAL FX ---

function createPulseEffect() {
    // Remove class to reset animation, then add it back (trick to restart CSS anim)
    wrapperEl.classList.remove('pulse-anim');
    void wrapperEl.offsetWidth; // Trigger reflow
    wrapperEl.classList.add('pulse-anim');
}

function screenShake() {
    container.classList.remove('shake-screen');
    void container.offsetWidth;
    container.classList.add('shake-screen');
}

function spawnFloatingText(x, y) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.style.left = `${x}px`;
    el.style.top = `${y - 50}px`;
    el.style.color = "gold";
    
    // Add randomness to position
    const randX = (Math.random() - 0.5) * 40;
    el.style.transform = `translateX(${randX}px)`;
    
    el.innerText = `+${Math.floor(1 + (gameState.combo * 0.5))}`;
    
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

const COMIC_WORDS = ["POW!", "BAM!", "ZAP!", "BOOM!", "CRITICAL!"];
function createComicText() {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.innerText = COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)];
    
    // Random position near center
    const x = (window.innerWidth / 2) + (Math.random() - 0.5) * 200;
    const y = (window.innerHeight / 2) + (Math.random() - 0.5) * 200;
    
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = Math.random() > 0.5 ? "#ff0055" : "#00e5ff";
    el.style.fontSize = "3rem";
    el.style.zIndex = 100;
    
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function spawnComicParticle(x, y) {
    // Create 'speed lines' or shapes
    const colors = ['#ff0055', '#00e5ff', '#ffeb3b'];
    const el = document.createElement('div');
    
    // Random visual properties
    const size = Math.random() * 20 + 10;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.random() * 360;
    
    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundColor = color;
    el.style.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)"; // Triangle
    el.style.pointerEvents = 'none';
    el.style.transform = `rotate(${angle}deg)`;
    el.style.transition = "all 0.5s ease-out";
    
    fxLayer.appendChild(el);
    
    // Trigger animation next frame
    requestAnimationFrame(() => {
        const moveDist = 100;
        const rad = angle * (Math.PI / 180);
        const toX = Math.cos(rad) * moveDist;
        const toY = Math.sin(rad) * moveDist;
        
        el.style.transform = `translate(${toX}px, ${toY}px) rotate(${angle}deg) scale(0)`;
        el.style.opacity = 0;
    });

    setTimeout(() => el.remove(), 500);
}

// --- INITIALIZATION ---
// Listen for inputs
spriteEl.addEventListener('mousedown', handleTap);
spriteEl.addEventListener('touchstart', handleTap, {passive: false});

// Start the loop
gameLoop();
