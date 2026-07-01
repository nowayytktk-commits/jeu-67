// ============== DOM ELEMENTS ==============
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameContainer = document.getElementById('game-container');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const milestonePopup = document.getElementById('milestone-popup');
const nukeOverlay = document.getElementById('nuke-overlay');
const nukeCanvas = document.getElementById('nuke-canvas');
const tntTimerEl = document.getElementById('tnt-timer');
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

// ============== LOCAL LEADERBOARD ==============
const leaderboardList = document.getElementById('leaderboard-list');
const historyList = document.getElementById('history-list');
const btnResetScores = document.getElementById('btn-reset-scores');

// Modals & UI
const btnSettings = document.getElementById('btn-settings');
const btnLeaderboard = document.getElementById('btn-leaderboard');
const settingsModal = document.getElementById('settings-modal');
const leaderboardModal = document.getElementById('leaderboard-modal');
const volumeSlider = document.getElementById('volume-slider');
const inputPlayerName = document.getElementById('player-name');

// Boss DOM elements
const bossOverlay = document.getElementById('boss-overlay');
const bossVideo = document.getElementById('boss-video');
const bossHud = document.getElementById('boss-hud');
const bossHpFill = document.getElementById('boss-hp-fill');
const bossHpText = document.getElementById('boss-hp-text');

// ============== GAME STATE ==============
let score = 0;
let gameInterval;
const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth < 768;
let maxItems = isMobile ? 30 : 50;
let bestScore = parseInt(localStorage.getItem('jeu67-best') || '0');
let hasPlayedAudio = false;
let hasPlayedNuke = false;
let tntMode = false;
let tntTimeLeft = 0;
let tntCountdown = null;
let globalVolume = parseFloat(localStorage.getItem('jeu67-volume') || '0.7');
let playerName = localStorage.getItem('jeu67-pseudo') || '';
let lastSubmittedScore = 0;
let bossActive = false;
let bossHP = 67;
let bossElement = null;
let bossAnimFrame = null;

// ============== AUDIO POOL ==============
const audioSources = {
    click: 'Leclick.mp3',
    squish: 'squish.mp3',
    testy: '67testycrousty.mp3',
    teleport: 'teleport.mp3',
    milestone: '20-20-20-7.mp3',
    pouletboum: 'pouletboum.mp3',
    boum: 'boum.mp3',
    nuke: 'nuke.mp3',
    romance: 'Romance.mp3'
};

function playSound(name) {
    const audio = new Audio(audioSources[name]);
    audio.volume = globalVolume;
    audio.play().catch(() => {});
    return audio;
}

// ============== BACKGROUND PARTICLES ==============
let bgParticles = [];

function initBgCanvas() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    bgParticles = [];
    const particleCount = isMobile ? 40 : 80;
    for (let i = 0; i < particleCount; i++) {
        bgParticles.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            r: Math.random() * 2 + 0.5,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.3 + 0.05,
            hue: Math.random() * 60 + 280
        });
    }
}

function animateBg() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (const p of bgParticles) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = bgCanvas.width;
        if (p.x > bgCanvas.width) p.x = 0;
        if (p.y < 0) p.y = bgCanvas.height;
        if (p.y > bgCanvas.height) p.y = 0;

        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        bgCtx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.alpha})`;
        bgCtx.fill();
    }
    requestAnimationFrame(animateBg);
}

window.addEventListener('resize', () => {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
});

initBgCanvas();
animateBg();

// ============== BEST SCORE ==============
bestScoreEl.innerText = bestScore;

function updateBestScore() {
    if (score > bestScore) {
        bestScore = score;
        bestScoreEl.innerText = bestScore;
        localStorage.setItem('jeu67-best', bestScore.toString());
    }
}

// ============== VOLUME & MODALS ==============
volumeSlider.value = globalVolume;
volumeSlider.addEventListener('input', (e) => {
    globalVolume = parseFloat(e.target.value);
    localStorage.setItem('jeu67-volume', globalVolume.toString());
});

btnSettings.addEventListener('click', () => {
    settingsModal.classList.add('active');
});

btnLeaderboard.addEventListener('click', () => {
    leaderboardModal.classList.add('active');
    renderLeaderboard();
    renderHistory();
});

// ============== LEADERBOARD DATA ==============
// Load saved data
let leaderboardData = JSON.parse(localStorage.getItem('jeu67-leaderboard') || '[]');
let historyData = JSON.parse(localStorage.getItem('jeu67-history') || '[]');

function saveLeaderboard() {
    localStorage.setItem('jeu67-leaderboard', JSON.stringify(leaderboardData));
}

function saveHistory() {
    localStorage.setItem('jeu67-history', JSON.stringify(historyData));
}

function addScoreToLeaderboard(name, scoreVal) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Add to history (every game)
    historyData.unshift({ name, score: scoreVal, date: dateStr, time: timeStr });
    if (historyData.length > 50) historyData = historyData.slice(0, 50);
    saveHistory();

    // Update leaderboard (keep best score per player, top 20)
    const existing = leaderboardData.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (existing) {
        if (scoreVal > existing.score) {
            existing.score = scoreVal;
            existing.date = dateStr;
            existing.time = timeStr;
        }
    } else {
        leaderboardData.push({ name, score: scoreVal, date: dateStr, time: timeStr });
    }
    leaderboardData.sort((a, b) => b.score - a.score);
    if (leaderboardData.length > 20) leaderboardData = leaderboardData.slice(0, 20);
    saveLeaderboard();
}

function getRankEmoji(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
}

function getRankClass(index) {
    if (index === 0) return 'lb-gold';
    if (index === 1) return 'lb-silver';
    if (index === 2) return 'lb-bronze';
    return '';
}

function renderLeaderboard() {
    leaderboardList.innerHTML = '';
    if (leaderboardData.length === 0) {
        leaderboardList.innerHTML = '<div class="lb-loading">Aucun score pour le moment ! Joue pour apparaître ici.</div>';
        return;
    }
    leaderboardData.forEach((entry, index) => {
        const el = document.createElement('div');
        el.classList.add('lb-entry');
        const rankClass = getRankClass(index);
        if (rankClass) el.classList.add(rankClass);
        el.innerHTML = `
            <div class="lb-rank">${getRankEmoji(index)}</div>
            <div class="lb-name">${entry.name}</div>
            <div class="lb-score">${entry.score}</div>
            <div class="lb-date">${entry.date}</div>
        `;
        leaderboardList.appendChild(el);
    });
}

function renderHistory() {
    historyList.innerHTML = '';
    if (historyData.length === 0) {
        historyList.innerHTML = '<div class="lb-loading">Aucune partie jouée pour le moment.</div>';
        return;
    }
    historyData.forEach((entry, index) => {
        const el = document.createElement('div');
        el.classList.add('lb-entry');
        el.innerHTML = `
            <div class="lb-rank" style="color: rgba(255,255,255,0.4)">${index + 1}.</div>
            <div class="lb-name">${entry.name}</div>
            <div class="lb-score">${entry.score}</div>
            <div class="lb-date">${entry.date} ${entry.time}</div>
        `;
        historyList.appendChild(el);
    });
}

// Tab switching
document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.lb-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`lb-panel-${tab.dataset.tab}`).classList.add('active');
    });
});

// Reset button
btnResetScores.addEventListener('click', () => {
    if (confirm('Supprimer tous les scores et l\'historique ? Cette action est irréversible !')) {
        leaderboardData = [];
        historyData = [];
        saveLeaderboard();
        saveHistory();
        localStorage.removeItem('jeu67-best');
        bestScore = 0;
        bestScoreEl.innerText = '0';
        renderLeaderboard();
        renderHistory();
    }
});

// Pseudo persistence
inputPlayerName.addEventListener('change', () => {
    const name = inputPlayerName.value.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (name.length >= 3) {
        playerName = name;
        localStorage.setItem('jeu67-pseudo', playerName);
    }
});

function autoSubmitScore() {
    if (!playerName) {
        playerName = prompt("Quel est ton pseudo ? (3-10 caractères)") || "Joueur" + Math.floor(Math.random() * 1000);
        playerName = playerName.trim().replace(/[^a-zA-Z0-9_]/g, '').substring(0, 10);
        if (playerName.length < 3) playerName = "Joueur" + Math.floor(Math.random() * 1000);
        localStorage.setItem('jeu67-pseudo', playerName);
        inputPlayerName.value = playerName;
    }

    if (score > lastSubmittedScore && score > 0) {
        addScoreToLeaderboard(playerName, score);
        lastSubmittedScore = score;
    }
}

// Initial setup for the pseudo input
if (playerName) {
    inputPlayerName.value = playerName;
}

// ============== CLICK PARTICLES ==============
function spawnClickParticles(x, y, color) {
    const count = isMobile ? 5 : 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('click-particle');
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const dist = 40 + Math.random() * 60;
        particle.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
        particle.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.backgroundColor = color || '#00f0ff';
        particle.style.width = `${3 + Math.random() * 5}px`;
        particle.style.height = particle.style.width;
        gameContainer.appendChild(particle);
        setTimeout(() => { if (particle.parentNode) particle.parentNode.removeChild(particle); }, 600);
    }
}

// ============== SCORE POPUP ==============
function showScorePopup(x, y) {
    const popup = document.createElement('div');
    popup.classList.add('score-popup');
    popup.innerText = '+1';
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    gameContainer.appendChild(popup);
    setTimeout(() => { if (popup.parentNode) popup.parentNode.removeChild(popup); }, 800);
}

// ============== MILESTONE ==============
function showMilestone(text) {
    milestonePopup.innerText = text;
    milestonePopup.classList.remove('show');
    void milestonePopup.offsetWidth;
    milestonePopup.classList.add('show');
    setTimeout(() => milestonePopup.classList.remove('show'), 1600);
}

// ============== TNT MODE ==============
function activateTntMode() {
    if (tntMode) return; // Don't stack
    tntMode = true;
    tntTimeLeft = 30;
    document.body.classList.add('tnt-active');
    tntTimerEl.classList.add('show');
    tntTimerEl.innerText = `💣 TNT MODE: 30s`;
    showMilestone('🐔💥 TNT MODE ! 💥🐔');

    // Clear existing 67s and replace with TNT
    const existing67s = gameContainer.querySelectorAll('.number-67:not(.pop)');
    existing67s.forEach(el => {
        if (!el.classList.contains('ender-item') && !el.classList.contains('tasty-item') && !el.classList.contains('rose-item') && !el.classList.contains('chicken-item')) {
            el.classList.add('fade-out');
            setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
        }
    });

    // Countdown display
    tntCountdown = setInterval(() => {
        tntTimeLeft--;
        tntTimerEl.innerText = `💣 TNT MODE: ${tntTimeLeft}s`;
        if (tntTimeLeft <= 10) {
            tntTimerEl.style.color = '#ff4444';
        }
        if (tntTimeLeft <= 0) {
            deactivateTntMode();
        }
    }, 1000);
}

function deactivateTntMode() {
    tntMode = false;
    clearInterval(tntCountdown);
    document.body.classList.remove('tnt-active');
    tntTimerEl.classList.remove('show');
    tntTimerEl.style.color = '';
}

// ============== NUKE EXPLOSION ==============
function triggerNukeExplosion() {
    if (hasPlayedNuke) return;
    hasPlayedNuke = true;
    playSound('nuke');
    showMilestone('☢️ 100 ! NUKE ! ☢️');
    
    nukeOverlay.classList.add('active');
    const ctx = nukeCanvas.getContext('2d');
    nukeCanvas.width = window.innerWidth;
    nukeCanvas.height = window.innerHeight;
    
    let frame = 0;
    const totalFrames = 300; // ~5 seconds at 60fps
    const particles = [];
    
    // Generate explosion particles
    const cx = nukeCanvas.width / 2;
    const cy = nukeCanvas.height / 2;
    for (let i = 0; i < 500; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 8;
        particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            r: 2 + Math.random() * 6,
            life: 0.5 + Math.random() * 0.5,
            hue: Math.random() < 0.5 ? 20 + Math.random() * 30 : 0 + Math.random() * 15 // orange-red
        });
    }
    
    function animateNuke() {
        frame++;
        const progress = frame / totalFrames;
        
        // Flash white at the beginning
        if (progress < 0.05) {
            ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress / 0.05})`;
            ctx.fillRect(0, 0, nukeCanvas.width, nukeCanvas.height);
        } else {
            ctx.fillStyle = `rgba(0, 0, 0, 0.06)`;
            ctx.fillRect(0, 0, nukeCanvas.width, nukeCanvas.height);
        }
        
        // Draw mushroom cloud (growing circle)
        if (progress > 0.03 && progress < 0.8) {
            const cloudRadius = Math.min(300, progress * 600);
            const cloudY = cy - cloudRadius * 0.3;
            const grad = ctx.createRadialGradient(cx, cloudY, 0, cx, cloudY, cloudRadius);
            grad.addColorStop(0, `rgba(255, 200, 50, ${0.4 * (1 - progress)})`);
            grad.addColorStop(0.3, `rgba(255, 100, 0, ${0.3 * (1 - progress)})`);
            grad.addColorStop(0.6, `rgba(200, 50, 0, ${0.2 * (1 - progress)})`);
            grad.addColorStop(1, `rgba(80, 20, 0, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cloudY, cloudRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Stem
            const stemWidth = cloudRadius * 0.3;
            const stemGrad = ctx.createLinearGradient(cx - stemWidth, cy, cx + stemWidth, cy);
            stemGrad.addColorStop(0, 'rgba(100, 40, 0, 0)');
            stemGrad.addColorStop(0.3, `rgba(200, 80, 0, ${0.3 * (1 - progress)})`);
            stemGrad.addColorStop(0.7, `rgba(200, 80, 0, ${0.3 * (1 - progress)})`);
            stemGrad.addColorStop(1, 'rgba(100, 40, 0, 0)');
            ctx.fillStyle = stemGrad;
            ctx.fillRect(cx - stemWidth, cloudY, stemWidth * 2, cy - cloudY + 100);
        }
        
        // Draw particles
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.02; // gravity
            p.life -= 0.003;
            if (p.life > 0) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 100%, 50%, ${p.life * 0.8})`;
                ctx.fill();
            }
        }
        
        // Screen shake effect
        if (progress < 0.3) {
            const shake = (1 - progress / 0.3) * 10;
            document.body.style.transform = `translate(${(Math.random()-0.5)*shake}px, ${(Math.random()-0.5)*shake}px)`;
        } else {
            document.body.style.transform = '';
        }
        
        if (frame < totalFrames) {
            requestAnimationFrame(animateNuke);
        } else {
            // Fade out overlay
            nukeOverlay.classList.add('fade-out');
            document.body.style.transform = '';
            setTimeout(() => {
                nukeOverlay.classList.remove('active', 'fade-out');
                ctx.clearRect(0, 0, nukeCanvas.width, nukeCanvas.height);
            }, 1000);
        }
    }
    
    requestAnimationFrame(animateNuke);
}

// ============== BOSS FIGHT ==============
function spawnBoss() {
    if (bossActive) return;
    bossActive = true;
    bossHP = 67;

    // Show video background
    bossOverlay.classList.add('active');
    bossVideo.muted = false;
    bossVideo.volume = globalVolume;
    bossVideo.currentTime = 0;
    bossVideo.play().catch(() => {});

    // Show HP bar
    bossHud.classList.add('active');
    updateBossHP();

    // Screen shake
    document.body.classList.add('boss-active');

    // Show milestone text
    showMilestone('👾 MEGA-67 APPARAÎT ! 👾');

    // Create the boss element
    bossElement = document.createElement('div');
    bossElement.classList.add('boss-element');
    bossElement.innerText = '67';
    document.body.appendChild(bossElement);

    // DVD bounce variables
    let bx = window.innerWidth / 2 - 70;
    let by = window.innerHeight / 2 - 70;
    let bvx = (2 + Math.random() * 2) * (Math.random() < 0.5 ? 1 : -1);
    let bvy = (2 + Math.random() * 2) * (Math.random() < 0.5 ? 1 : -1);
    const bossSize = 140;

    function moveBoss() {
        if (!bossActive) return;

        bx += bvx;
        by += bvy;

        // Bounce off edges
        if (bx <= 0) { bx = 0; bvx = Math.abs(bvx); }
        if (bx >= window.innerWidth - bossSize) { bx = window.innerWidth - bossSize; bvx = -Math.abs(bvx); }
        if (by <= 0) { by = 0; bvy = Math.abs(bvy); }
        if (by >= window.innerHeight - bossSize) { by = window.innerHeight - bossSize; bvy = -Math.abs(bvy); }

        bossElement.style.left = `${bx}px`;
        bossElement.style.top = `${by}px`;

        bossAnimFrame = requestAnimationFrame(moveBoss);
    }
    bossAnimFrame = requestAnimationFrame(moveBoss);

    // Click handler for boss
    bossElement.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!bossActive || bossHP <= 0) return;

        bossHP--;
        updateBossHP();

        const rect = bossElement.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Hit feedback
        playSound('click');
        spawnClickParticles(cx, cy, '#ff3333');

        // Shake the boss
        bossElement.classList.remove('boss-hit');
        void bossElement.offsetWidth;
        bossElement.classList.add('boss-hit');

        // Speed up slightly after each hit
        bvx *= 1.01;
        bvy *= 1.01;

        // Give score
        score++;
        scoreEl.innerText = score;
        updateBestScore();
        showScorePopup(cx, cy - 20);

        // Boss killed!
        if (bossHP <= 0) {
            killBoss();
        }
    });
}

function updateBossHP() {
    const pct = (bossHP / 67) * 100;
    bossHpFill.style.width = `${pct}%`;
    bossHpText.innerText = `${bossHP} / 67`;

    // Change bar color when low
    if (pct < 25) {
        bossHpFill.style.background = 'linear-gradient(90deg, #ff0000, #990000)';
    } else if (pct < 50) {
        bossHpFill.style.background = 'linear-gradient(90deg, #ff4400, #ff0000)';
    }
}

function killBoss() {
    bossActive = false;
    cancelAnimationFrame(bossAnimFrame);

    // Death animation
    bossElement.classList.add('boss-dead');
    showMilestone('🏆 MEGA-67 VAINCU ! +67 PTS ! 🏆');

    // Big explosion of particles
    const rect = bossElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnClickParticles(cx, cy, `hsl(${Math.random()*360}, 100%, 60%)`), i * 100);
    }

    // Bonus score: +67
    score += 67;
    scoreEl.innerText = score;
    updateBestScore();
    autoSubmitScore();

    // Stop video and music
    setTimeout(() => {
        bossVideo.pause();
        bossVideo.muted = true;
        bossOverlay.classList.remove('active');
        bossHud.classList.remove('active');
        document.body.classList.remove('boss-active');

        // Remove boss element
        if (bossElement && bossElement.parentNode) {
            bossElement.parentNode.removeChild(bossElement);
        }
        bossElement = null;

        // Reset HP bar for next time
        bossHpFill.style.width = '100%';
        bossHpFill.style.background = '';
    }, 1000);
}

// ============== GAME FLOW ==============
startBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    setTimeout(() => {
        gameScreen.classList.add('active');
        startGame();
    }, 600);
});

function startGame() {
    score = 0;
    hasPlayedAudio = false;
    hasPlayedNuke = false;
    tntMode = false;
    deactivateTntMode();
    scoreEl.innerText = score;
    gameContainer.innerHTML = '';

    // Stagger initial spawn for a wave effect
    const initialCount = isMobile ? 15 : 25;
    for (let i = 0; i < initialCount; i++) {
        setTimeout(() => spawnNumber(), i * 60);
    }

    gameInterval = setInterval(() => {
        if (gameContainer.querySelectorAll('.number-67').length < maxItems) {
            spawnNumber();
        }
    }, 400);
}

// ============== SPAWN LOGIC ==============
function spawnNumber() {
    const el = document.createElement('div');
    el.classList.add('number-67', 'floating');

    const rand = Math.random();
    
    // Check if events already exist
    const hasEnder = gameContainer.querySelector('.ender-item') !== null;
    const hasRose = gameContainer.querySelector('.rose-item') !== null;
    const hasChicken = gameContainer.querySelector('.chicken-item') !== null;
    const hasTasty = gameContainer.querySelector('.tasty-item') !== null;
    
    // Evaluate probabilities, preventing duplicates
    const isEnder = !hasEnder && rand < 0.015;
    const isRose = !isEnder && !hasRose && rand < 0.030; // another 1.5% chance
    const isChicken = !isEnder && !isRose && !hasChicken && rand < 0.035; // 0.5% chance (rarer)
    const isTasty = !isEnder && !isRose && !isChicken && !hasTasty && rand < 0.065; // 3% chance
    const isTnt = !isEnder && !isRose && !isChicken && !isTasty && tntMode;
    const scale = 0.6 + Math.random() * 1.2;

    if (isChicken) {
        const img = document.createElement('img');
        img.src = 'chiken.png';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.draggable = false;
        el.style.width = `${110 * scale}px`;
        el.style.height = `${110 * scale}px`;
        el.classList.add('chicken-item');
        el.appendChild(img);
    } else if (isTasty) {
        const img = document.createElement('img');
        img.src = 'tasty.png';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.draggable = false;
        el.style.width = `${110 * scale}px`;
        el.style.height = `${110 * scale}px`;
        el.classList.add('tasty-item');
        el.appendChild(img);
    } else if (isRose) {
        const img = document.createElement('img');
        img.src = 'Rose.png';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.draggable = false;
        el.style.width = `${100 * scale}px`;
        el.style.height = `${100 * scale}px`;
        el.classList.add('rose-item');
        el.appendChild(img);
    } else if (isEnder) {
        el.classList.add('ender-item');
        const img = document.createElement('img');
        img.src = 'Ender_Pearl.png';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.draggable = false;
        el.style.width = `${90 * scale}px`;
        el.style.height = `${90 * scale}px`;
        el.appendChild(img);

        setTimeout(() => {
            if (el.parentNode && !el.classList.contains('pop')) {
                el.classList.add('fade-out');
                setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
            }
        }, 15000);
    } else if (isTnt) {
        const img = document.createElement('img');
        img.src = 'TNT.png';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.draggable = false;
        el.style.width = `${100 * scale}px`;
        el.style.height = `${100 * scale}px`;
        el.classList.add('tnt-item');
        el.appendChild(img);
    } else {
        el.innerText = '67';
        el.style.fontSize = `${2.8 * scale}rem`;
    }

    // Position
    const maxX = window.innerWidth - (isMobile ? 80 : 120);
    const maxY = window.innerHeight - (isMobile ? 80 : 120);
    let x, y;
    const hudHeight = isMobile ? 80 : 120;
    do {
        x = 10 + Math.random() * maxX;
        y = hudHeight + Math.random() * (maxY - hudHeight);
    } while (x < (isMobile ? 180 : 350) && y < hudHeight);

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // Visual variation
    const hue = Math.random() * 360;
    if (!isEnder && !isTnt && !isChicken && !isRose && !isTasty) el.style.filter = `hue-rotate(${hue}deg)`;

    const animDuration = 3 + Math.random() * 3;
    el.style.animationDuration = `${animDuration}s`;
    el.style.animationDelay = `-${Math.random() * 3}s`;

    // Despawn timer (15–20s)
    const despawnDuration = 15000 + Math.random() * 5000;
    let despawnTimer = setTimeout(() => {
        if (el.parentNode && !el.classList.contains('pop')) {
            el.classList.add('fade-out');
            setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
        }
    }, despawnDuration);

    // ============== CLICK HANDLER ==============
    el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        clearTimeout(despawnTimer);

        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Ender pearl teleports
        if (isEnder) {
            playSound('teleport');
            spawnClickParticles(cx, cy, '#a855f7');
            el.style.left = `${10 + Math.random() * maxX}px`;
            el.style.top = `${hudHeight + Math.random() * (maxY - hudHeight)}px`;

            despawnTimer = setTimeout(() => {
                if (el.parentNode && !el.classList.contains('pop')) {
                    el.classList.add('fade-out');
                    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
                }
            }, despawnDuration);
            return;
        }

        if (!el.classList.contains('pop')) {
            el.classList.remove('floating');
            el.classList.add('pop');

            // Sound
            if (isChicken) {
                playSound('pouletboum');
                spawnClickParticles(cx, cy, '#ffaa00');
                // Activate TNT mode!
                activateTntMode();
            } else if (isTnt) {
                playSound('boum');
                spawnClickParticles(cx, cy, '#ff3300');
                // Big explosion particles for TNT
                spawnClickParticles(cx, cy, '#ff6600');
                spawnClickParticles(cx, cy, '#ffaa00');
            } else if (isTasty) {
                const squish = playSound('squish');
                squish.onended = () => playSound('testy');
                spawnClickParticles(cx, cy, '#ff007f');
            } else if (isRose) {
                playSound('romance');
                spawnClickParticles(cx, cy, '#ff007f');
            } else {
                playSound('click');
                spawnClickParticles(cx, cy, `hsl(${hue}, 80%, 60%)`);
            }

            // Score
            score++;
            scoreEl.innerText = score;
            updateBestScore();

            // Auto submit score every 10 points or at milestones
            if (score > 0 && score % 10 === 0) {
                autoSubmitScore();
            }

            showScorePopup(cx, cy - 20);

            // Milestone at 67
            if (score >= 67 && !hasPlayedAudio) {
                playSound('milestone');
                showMilestone('🎉 67 ! 🎉');
                hasPlayedAudio = true;
            }

            // Nuke at 100
            if (score >= 100 && !hasPlayedNuke) {
                triggerNukeExplosion();
            }

            // Boss spawn chance: 2% every 10 points after score 50
            if (score > 50 && score % 10 === 0 && !bossActive && Math.random() < 0.02) {
                setTimeout(() => spawnBoss(), 500);
            }
            // Also guaranteed boss at score 134 (67*2) if never seen
            if (score === 134 && !bossActive) {
                setTimeout(() => spawnBoss(), 500);
            }

            // Score animation
            scoreEl.style.transform = 'scale(1.4)';
            setTimeout(() => { scoreEl.style.transform = 'scale(1)'; }, 120);

            // Remove after pop animation
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 400);
        }
    });

    gameContainer.appendChild(el);

    // Smooth appearance with slight delay
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.classList.add('visible');
        });
    });
}
