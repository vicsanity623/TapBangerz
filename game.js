const SPRITE_CONFIG = {
    frameWidth: 320,      // Width of ONE single frame
    frameHeight: 468,     // Height of the image 
    totalFrames: 10,      // Total count 
    
    baseSpeed: 0.09,      // Idle speed
    drag: 0.95,           // Friction 
    acceleration: 0.5     // Speed per tap
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
    // 1. Apply Friction to the velocity
    gameState.velocity *= SPRITE_CONFIG.drag;

    if (gameState.velocity < 0.01) gameState.velocity = 0;

    // 2. Manage Idle vs Active State
    if (gameState.velocity > 0.1) {
        // Tapping mode
        spriteEl.classList.remove('idle-mode'); // Apply to spriteEl directly for scale transform
    } else {
        // Idle mode
        spriteEl.classList.add('idle-mode');
    }

    // 3. Calculate Final Speed
    let currentSpeed = SPRITE_CONFIG.baseSpeed + gameState.velocity;

    // 4. Advance Frames
    gameState.currentFrame += currentSpeed;
    
    if (gameState.currentFrame >= SPRITE_CONFIG.totalFrames) {
        gameState.currentFrame = 0;
    }

    // Calculate Pixel Position
    let frameIndex = Math.floor(gameState.currentFrame);
    let posX = -(frameIndex * SPRITE_CONFIG.frameWidth);
    
    spriteEl.style.backgroundPosition = `${posX}px 0px`;

    // 5. Visual "Rumble"
    if (gameState.velocity > 2) {
        let shake = (Math.random() - 0.5) * 10;
        // Apply rotate to wrapper, so it doesn't conflict with scaling on the sprite
        wrapperEl.style.transform = `rotate(${shake}deg)`;
    } else {
        wrapperEl.style.transform = `rotate(0deg)`;
    }

    requestAnimationFrame(gameLoop);
}


// --- VISUAL FX ---

function createPulseEffect() {
    spriteEl.classList.remove('pulse-anim');
    void spriteEl.offsetWidth; 
    spriteEl.classList.add('pulse-anim');
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
    const colors = ['#ff0055', '#00e5ff', '#ffeb3b'];
    const el = document.createElement('div');
    
    const size = Math.random() * 20 + 10;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.random() * 360;
    
    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundColor = color;
    el.style.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)"; 
    el.style.pointerEvents = 'none';
    el.style.transform = `rotate(${angle}deg)`;
    el.style.transition = "all 0.5s ease-out";
    
    fxLayer.appendChild(el);
    
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

// --- AUTO-SCALER (Responsive Fix) ---
function resizeGame() {
    const headerHeight = 90; // The height of UI bar + padding
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Calculate available space for the sprite
    const availableWidth = screenWidth; 
    const availableHeight = screenHeight - headerHeight;

    const baseW = SPRITE_CONFIG.frameWidth;
    const baseH = SPRITE_CONFIG.frameHeight;

    // Calculate how much we need to scale to fit
    const scaleX = availableWidth / baseW;
    const scaleY = availableHeight / baseH;

    // Pick the smaller scale so it doesn't cut off
    let finalScale = Math.min(scaleX, scaleY) * 0.90; // 90% fill to leave breathing room

    // Apply the zoom
    spriteEl.style.transform = `scale(${finalScale})`;
    
    // Shift it down slightly to center in the empty space
    spriteEl.style.marginTop = `${headerHeight / 2}px`;
}

// --- INITIALIZATION ---
spriteEl.addEventListener('mousedown', handleTap);
spriteEl.addEventListener('touchstart', handleTap, {passive: false});

// Run resize immediately and on window change
resizeGame();
window.addEventListener('resize', resizeGame);

gameLoop();
