/* =========================================
   TURBO TAP RPG - OPTIMIZED ENGINE
   ========================================= */

const CONFIG = {
    // ✅ IMAGE DIMENSIONS
    frameWidth: 480,      
    frameHeight: 690,     
    totalFrames: 9,       
    
    // PHYSICS
    baseSpeed: 0.1,
    drag: 0.94,           
    acceleration: 0.6,    
    maxVelocity: 4.0,
    
    // ✅ PERFORMANCE SETTINGS
    maxParticles: 35,     // Hard limit on active particles
    particleBase: 4,      // How many spawn per tap (reduced from 8)
    
    // GAME FEEL
    comboDecay: 2000,
    gravity: 0.8
};

// --- GAME STATE ---
let state = {
    gold: 0,
    level: 1,
    xp: 0,
    xpToNext: 100,
    combo: 0,
    maxCombo: 0,
    comboTimer: null,
    
    // Physics
    currentFrame: 0,
    velocity: 0,
    
    // Visuals
    intensity: 0,         
    pulsePhase: 0,
    activeParticles: 0   // Tracker for performance cap
};

// --- DOM CACHE ---
const dom = {
    sprite: document.getElementById('action-sprite'),
    wrapper: document.querySelector('.sprite-wrapper'),
    container: document.getElementById('game-container'),
    fxLayer: document.getElementById('fx-layer'),
    ui: {
        gold: document.getElementById('gold-display'),
        level: document.getElementById('level-display'),
        xpFill: document.getElementById('xp-fill'),
        comboContainer: document.getElementById('combo-container'),
        comboCount: document.getElementById('combo-count'),
        comboLabel: document.getElementById('combo-label')
    }
};

/* =========================================
   INITIALIZATION
   ========================================= */

// 1. Set Dimensions
dom.sprite.style.width = `${CONFIG.frameWidth}px`;
dom.sprite.style.height = `${CONFIG.frameHeight}px`;

// 2. Fix Background Scaling for 480x690
const sheetWidth = CONFIG.frameWidth * CONFIG.totalFrames;
dom.sprite.style.backgroundSize = `${sheetWidth}px ${CONFIG.frameHeight}px`;

// 3. Fit to screen (Scale down for mobile)
dom.wrapper.style.transform = "scale(0.6)"; 

/* =========================================
   CORE INPUT & LOOP
   ========================================= */

function handleTap(e) {
    if(e.cancelable && e.type === 'touchstart') e.preventDefault();

    state.velocity += CONFIG.acceleration;
    if (state.velocity > CONFIG.maxVelocity) state.velocity = CONFIG.maxVelocity;

    processRewards();

    // Get Coordinates
    let x = e.clientX;
    let y = e.clientY;
    if (e.type === 'touchstart') {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    }

    triggerTapFX(x, y);
}

function gameLoop() {
    // 1. Intensity Calculation
    let targetIntensity = Math.min(state.combo, 50) / 50;
    state.intensity += (targetIntensity - state.intensity) * 0.1;

    // 2. Physics
    state.velocity *= CONFIG.drag;
    if (state.velocity < 0.01) state.velocity = 0;

    // 3. Animation Frames
    let effectiveSpeed = CONFIG.baseSpeed + state.velocity + (state.intensity * 0.2);
    state.currentFrame += effectiveSpeed;
    if (state.currentFrame >= CONFIG.totalFrames) state.currentFrame = 0;

    // 4. Render Sprite
    let frameIndex = Math.floor(state.currentFrame);
    let posX = -(frameIndex * CONFIG.frameWidth);
    dom.sprite.style.backgroundPosition = `${posX}px 0px`;

    // 5. Render "The Throb"
    applyProceduralAnimation();

    requestAnimationFrame(gameLoop);
}

/* =========================================
   VISUALS
   ========================================= */

function applyProceduralAnimation() {
    let pulseSpeed = 0.1 + (state.intensity * 0.4);
    state.pulsePhase += pulseSpeed;
    
    // Heartbeat Sine Wave
    let scaleWave = Math.sin(state.pulsePhase) * (0.05 + (state.intensity * 0.1)); 
    let baseScale = 0.6 + (state.intensity * 0.2); // Base scale matches the init scale (0.6)
    let finalScale = baseScale + scaleWave;

    // Jitter
    let shakeX = 0, shakeY = 0, rotation = 0;
    if (state.intensity > 0.1) {
        let shakePower = state.intensity * 10; 
        shakeX = (Math.random() - 0.5) * shakePower;
        shakeY = (Math.random() - 0.5) * shakePower;
        rotation = (Math.random() - 0.5) * (state.intensity * 15);
    }

    // Apply Transform
    dom.wrapper.style.transform = 
        `translate(${shakeX}px, ${shakeY}px) ` +
        `rotate(${rotation}deg) ` +
        `scale(${finalScale})`;
        
    dom.wrapper.style.filter = `brightness(${1 + (state.intensity * 0.5)})`;
}

function triggerTapFX(x, y) {
    spawnFloatingText(x, y);
    spawnParticles(x, y);

    if (state.combo >= 15 && Math.random() > 0.7) {
        spawnHeart(x, y);
    }
}

/* =========================================
   OPTIMIZED PARTICLE ENGINE
   ========================================= */

function spawnParticles(x, y) {
    // ✅ CAP CHECK: Stop spawning if we have too many
    if (state.activeParticles >= CONFIG.maxParticles) return;

    const colors = ['#fff', '#00e5ff', '#ff0055', '#ffeb3b'];
    
    // Calculate how many to spawn (Max 4-6 per tap)
    let batchSize = CONFIG.particleBase + Math.floor(state.intensity * 2);
    
    // Double check we don't overflow the cap with this batch
    if (state.activeParticles + batchSize > CONFIG.maxParticles) {
        batchSize = CONFIG.maxParticles - state.activeParticles;
    }

    for (let i = 0; i < batchSize; i++) {
        state.activeParticles++; // Increment counter
        
        const p = document.createElement('div');
        const angle = Math.random() * Math.PI * 2;
        const velocity = 5 + Math.random() * 10;
        const size = 4 + Math.random() * 6; // Slightly smaller particles
        
        p.style.position = 'absolute';
        p.style.left = '0px'; 
        p.style.top = '0px';
        // Use transform for initial position to allow GPU movement later
        p.style.transform = `translate3d(${x}px, ${y}px, 0)`; 
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.pointerEvents = 'none';
        p.style.willChange = 'transform, opacity'; // Hint to browser
        p.style.borderRadius = '50%';
        p.style.zIndex = 1000;
        
        dom.fxLayer.appendChild(p);

        // Physics variables
        let posX = x;
        let posY = y;
        let velX = Math.cos(angle) * velocity;
        let velY = Math.sin(angle) * velocity;
        let opacity = 1;

        // ✅ ANIMATION LOOP (Using Transform)
        const animate = () => {
            velY += CONFIG.gravity;
            velX *= 0.95; 

            posX += velX;
            posY += velY;
            opacity -= 0.04; // Fade out faster

            // GPU Accelerated Movement
            p.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(${opacity})`;
            p.style.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                p.remove();
                state.activeParticles--; // Decrement counter
            }
        };
        requestAnimationFrame(animate);
    }
}

function spawnFloatingText(x, y) {
    // Only spawn text if < 10 items (prevents text lag too)
    if (dom.fxLayer.childElementCount > 40) return;

    const el = document.createElement('div');
    let isCrit = Math.random() > 0.9;
    let val = Math.floor(1 + (state.combo * 0.5));
    
    el.innerText = isCrit ? `CRIT! +${val*2}` : `+${val}`;
    el.className = 'float-text';
    el.style.left = x + 'px';
    el.style.top = (y - 50) + 'px';
    el.style.color = isCrit ? '#ffeb3b' : '#fff';
    el.style.zIndex = 1200;

    dom.fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 600); // Shorter life
}

function spawnHeart(x, y) {
    const heart = document.createElement('div');
    heart.innerText = "💖";
    heart.style.position = 'absolute';
    heart.style.left = x + 'px';
    heart.style.top = y + 'px';
    heart.style.fontSize = '30px';
    heart.style.pointerEvents = 'none';
    heart.style.zIndex = 1100;
    heart.style.transition = "all 0.8s ease-out"; // CSS Transition is cheaper than JS loop
    heart.style.opacity = 1;
    
    dom.fxLayer.appendChild(heart);

    // CSS Animation triggers
    requestAnimationFrame(() => {
        heart.style.transform = `translateY(-100px) scale(1.5)`;
        heart.style.opacity = 0;
    });

    setTimeout(() => heart.remove(), 800);
}

/* =========================================
   LOGIC & REWARDS
   ========================================= */

function processRewards() {
    state.combo++;
    clearTimeout(state.comboTimer);
    
    dom.ui.comboContainer.classList.remove('hidden');
    dom.ui.comboCount.innerText = state.combo;
    
    // Labels
    if (state.combo < 10) dom.ui.comboLabel.innerText = "COMBO";
    else if (state.combo < 30) dom.ui.comboLabel.innerText = "SUPER!";
    else dom.ui.comboLabel.innerText = "HYPER!!";

    state.comboTimer = setTimeout(() => {
        state.combo = 0;
        dom.ui.comboContainer.classList.add('hidden');
    }, CONFIG.comboDecay);

    let addedGold = Math.floor(1 + (state.combo * 0.5));
    state.gold += addedGold;
    dom.ui.gold.innerText = state.gold.toLocaleString();

    state.xp += 10 + Math.floor(state.combo / 5);
    if(state.xp >= state.xpToNext) levelUp();
    
    let xpPct = (state.xp / state.xpToNext) * 100;
    dom.ui.xpFill.style.width = `${xpPct}%`;
}

function levelUp() {
    state.level++;
    state.xp = 0;
    state.xpToNext = Math.floor(state.xpToNext * 1.5);
    dom.ui.level.innerText = state.level;
    
    // Simple level up flash
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = 0; flash.style.left = 0;
    flash.style.width = '100vw'; flash.style.height = '100vh';
    flash.style.backgroundColor = 'white';
    flash.style.opacity = 0.5;
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = 2000;
    flash.style.transition = 'opacity 0.5s';
    document.body.appendChild(flash);
    
    setTimeout(() => {
        flash.style.opacity = 0;
        setTimeout(() => flash.remove(), 500);
    }, 50);
}

// --- INIT ---
dom.sprite.addEventListener('mousedown', handleTap);
dom.sprite.addEventListener('touchstart', handleTap, {passive: false});

gameLoop();
