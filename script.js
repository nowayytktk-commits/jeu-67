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
const trophiesModal = document.getElementById('trophies-modal');
const trophiesGrid = document.getElementById('trophies-grid');
const volumeSlider = document.getElementById('volume-slider');
const inputPlayerName = document.getElementById('player-name');
const btnTrophies = document.getElementById('btn-trophies');
const trophyNotif = document.getElementById('trophy-notification');
const trophyNameNotif = document.getElementById('trophy-name-notif');

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
    romance: 'Romance.mp3',
    chest_open: 'Ouverture.mp3',
    star1: 'Etoile1.mp3',
    star2: 'Etoile2.mp3',
    star3: 'Etoile3.mp3',
    star4: 'Etoile4.mp3'
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

// ============== TROPHIES SYSTEM ==============
const TROPHIES = [
    { id: 'ender', name: 'Perle de l\'Ender', emoji: '🟣', src: 'Ender_Pearl.png' },
    { id: 'rose', name: 'Rose', emoji: '🌹', src: 'Rose.png' },
    { id: 'tasty', name: 'TastyCrousty', emoji: '🍪', src: 'tasty.png' },
    { id: 'chicken', name: 'Poulet Explosif', emoji: '🐔', src: 'chiken.png' },
    { id: 'tnt', name: 'Bloc de TNT', emoji: '🧨', src: 'TNT.png' },
    { id: 'nuke', name: 'Survivant (100 pts)', emoji: '☢️' },
    { id: 'boss', name: 'Tueur de Boss', emoji: '👾' },
    { id: 'osu', name: 'Joueur d\'Osu!', emoji: '🎵', src: 'osu.png' },
    { id: 'rickroll', name: 'Never Gonna Give You Up', emoji: '🎤' },
    { id: 'gacha', name: 'Collectionneur', emoji: '🎁' }
];

let unlockedTrophies = JSON.parse(localStorage.getItem('jeu67-trophies') || '[]');

function unlockTrophy(id) {
    if (!unlockedTrophies.includes(id)) {
        unlockedTrophies.push(id);
        localStorage.setItem('jeu67-trophies', JSON.stringify(unlockedTrophies));
        
        const trophy = TROPHIES.find(t => t.id === id);
        if (trophy) {
            trophyNameNotif.innerText = trophy.name;
            trophyNotif.classList.add('show');
            setTimeout(() => trophyNotif.classList.remove('show'), 3000);
        }
    }
}

function renderTrophies() {
    trophiesGrid.innerHTML = '';
    TROPHIES.forEach(t => {
        const isUnlocked = unlockedTrophies.includes(t.id);
        const el = document.createElement('div');
        el.className = `trophy-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        const imgContent = t.src 
            ? `<img src="${t.src}" alt="${t.name}">`
            : `<span class="trophy-emoji">${t.emoji}</span>`;
            
        el.innerHTML = `
            <div class="trophy-img-wrapper">${imgContent}</div>
            <div class="trophy-name">${isUnlocked ? t.name : '???'}</div>
        `;
        trophiesGrid.appendChild(el);
    });
}

btnTrophies.addEventListener('click', () => {
    trophiesModal.classList.add('active');
    renderTrophies();
});

// ============== LEADERBOARD DATA ==============
// Dreamlo Keys
const dreamloPublic = '6a43f8228f40bb131856e168';
const dreamloPrivate = 'LkNe2Bklx0OnMMqGkvaalA3Cb8ytP9yESxOs8QoR2Ouw';

// Load saved data
let historyData = JSON.parse(localStorage.getItem('jeu67-history') || '[]');

function saveHistory() {
    localStorage.setItem('jeu67-history', JSON.stringify(historyData));
}

function addScoreToHistory(name, scoreVal) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Add to history (every game)
    historyData.unshift({ name, score: scoreVal, date: dateStr, time: timeStr });
    if (historyData.length > 50) historyData = historyData.slice(0, 50);
    saveHistory();
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
    leaderboardList.innerHTML = '<div class="lb-loading">Chargement Mondial... 🌍</div>';
    
    const url = `http://dreamlo.com/lb/${dreamloPublic}/json`;
    // Try another proxy if allorigins is flaky:
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    
    fetch(proxyUrl)
        .then(res => res.json())
        .then(data => {
            leaderboardList.innerHTML = '';
            if (!data.dreamlo || !data.dreamlo.leaderboard || !data.dreamlo.leaderboard.entry) {
                leaderboardList.innerHTML = '<div class="lb-loading">Aucun score pour le moment !</div>';
                return;
            }
            let entries = data.dreamlo.leaderboard.entry;
            if (!Array.isArray(entries)) entries = [entries];

            entries.slice(0, 50).forEach((entry, index) => {
                const el = document.createElement('div');
                el.classList.add('lb-entry');
                const rankClass = getRankClass(index);
                if (rankClass) el.classList.add(rankClass);
                el.innerHTML = `
                    <div class="lb-rank">${getRankEmoji(index)}</div>
                    <div class="lb-name">${entry.name.substring(0, 15)}</div>
                    <div class="lb-score">${entry.score}</div>
                `;
                leaderboardList.appendChild(el);
            });
        })
        .catch(() => {
            // Fallback proxy
            const fallbackProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            fetch(fallbackProxy)
                .then(res => res.json())
                .then(data => {
                    leaderboardList.innerHTML = '';
                    let entries = data.dreamlo.leaderboard.entry;
                    if (!Array.isArray(entries)) entries = [entries];
                    entries.slice(0, 50).forEach((entry, index) => {
                        const el = document.createElement('div');
                        el.classList.add('lb-entry');
                        const rankClass = getRankClass(index);
                        if (rankClass) el.classList.add(rankClass);
                        el.innerHTML = `
                            <div class="lb-rank">${getRankEmoji(index)}</div>
                            <div class="lb-name">${entry.name.substring(0, 15)}</div>
                            <div class="lb-score">${entry.score}</div>
                        `;
                        leaderboardList.appendChild(el);
                    });
                })
                .catch(() => {
                    leaderboardList.innerHTML = '<div class="lb-loading">Erreur de connexion serveur... 😞</div>';
                });
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
    if (confirm('Supprimer l\'historique local ?')) {
        historyData = [];
        saveHistory();
        localStorage.removeItem('jeu67-best');
        bestScore = 0;
        bestScoreEl.innerText = '0';
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
        addScoreToHistory(playerName, score);
        
        // Push to Dreamlo (Mondial)
        const url = `http://dreamlo.com/lb/${dreamloPrivate}/add/${playerName}/${score}`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        fetch(proxyUrl).catch(() => {
            const fallbackProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            fetch(fallbackProxy).catch(() => {});
        });

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
    unlockTrophy('nuke');
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

    unlockTrophy('boss');

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
        if (!osuActive && !rickrollActive && !gachaActive && gameContainer.querySelectorAll('.number-67').length < maxItems) {
            spawnNumber();
        }
    }, 400);
}

// ============== SPAWN LOGIC ==============
function spawnNumber() {
    if (osuActive || rickrollActive || gachaActive) return; // Don't spawn during events
    const el = document.createElement('div');
    el.classList.add('number-67', 'floating');

    const rand = Math.random();
    
    // Check if events already exist
    const hasEnder = gameContainer.querySelector('.ender-item') !== null;
    const hasRose = gameContainer.querySelector('.rose-item') !== null;
    const hasChicken = gameContainer.querySelector('.chicken-item') !== null;
    const hasTasty = gameContainer.querySelector('.tasty-item') !== null;
    const hasOsu = gameContainer.querySelector('.osu-item') !== null;
    const hasRickroll = gameContainer.querySelector('.rickroll-item') !== null;
    const hasGacha = gameContainer.querySelector('.gacha-item') !== null;
    
    // Evaluate probabilities, preventing duplicates
    const isEnder = !hasEnder && rand < 0.015;
    const isRose = !isEnder && !hasRose && rand < 0.030;
    const isChicken = !isEnder && !isRose && !hasChicken && rand < 0.035;
    const isOsu = !isEnder && !isRose && !isChicken && !hasOsu && rand < 0.045; // 1% chance
    const isRickroll = !isEnder && !isRose && !isChicken && !isOsu && !hasRickroll && rand < 0.055; // 1% chance
    const isGacha = !isEnder && !isRose && !isChicken && !isOsu && !isRickroll && !hasGacha && rand < 0.065; // 1% chance
    const isTasty = !isEnder && !isRose && !isChicken && !isOsu && !isRickroll && !isGacha && !hasTasty && rand < 0.095;
    const isTnt = !isEnder && !isRose && !isChicken && !isOsu && !isRickroll && !isGacha && !isTasty && tntMode;
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
    } else if (isOsu) {
        const img = document.createElement('img');
        img.src = 'osu.png';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.draggable = false;
        el.style.width = `${100 * scale}px`;
        el.style.height = `${100 * scale}px`;
        el.classList.add('osu-item');
        el.appendChild(img);
    } else if (isRickroll) {
        el.innerText = '67';
        el.style.fontSize = `${2.8 * scale}rem`;
        el.classList.add('rickroll-item');
    } else if (isGacha) {
        const img = document.createElement('img');
        img.src = 'Coffre.png';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.draggable = false;
        el.style.width = `${100 * scale}px`;
        el.style.height = `${100 * scale}px`;
        el.classList.add('gacha-item');
        el.appendChild(img);
        el.style.filter = 'drop-shadow(0 0 10px rgba(255,215,0,0.6))';
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
    if (!isEnder && !isTnt && !isChicken && !isRose && !isTasty && !isOsu && !isRickroll && !isGacha) el.style.filter = `hue-rotate(${hue}deg)`;

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
            unlockTrophy('ender');
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

        // Osu item starts mini-game
        if (isOsu) {
            unlockTrophy('osu');
            playSound('click');
            spawnClickParticles(cx, cy, '#ff6699');
            el.classList.add('pop');
            setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
            startOsuMiniGame();
            return;
        }

        // Rickroll item starts trap
        if (isRickroll) {
            unlockTrophy('rickroll');
            playSound('click');
            spawnClickParticles(cx, cy, '#ffd700');
            el.classList.add('pop');
            setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
            startRickrollEvent();
            return;
        }

        // Gacha item starts lootbox
        if (isGacha) {
            playSound('click');
            spawnClickParticles(cx, cy, '#ffd700');
            el.classList.add('pop');
            setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
            startGachaEvent();
            return;
        }

        if (!el.classList.contains('pop')) {
            el.classList.remove('floating');
            el.classList.add('pop');

            // Sound
            if (isChicken) {
                unlockTrophy('chicken');
                playSound('pouletboum');
                spawnClickParticles(cx, cy, '#ffaa00');
                // Activate TNT mode!
                activateTntMode();
            } else if (isTnt) {
                unlockTrophy('tnt');
                playSound('boum');
                spawnClickParticles(cx, cy, '#ff3300');
                // Big explosion particles for TNT
                spawnClickParticles(cx, cy, '#ff6600');
                spawnClickParticles(cx, cy, '#ffaa00');
            } else if (isTasty) {
                unlockTrophy('tasty');
                const squish = playSound('squish');
                squish.onended = () => playSound('testy');
                spawnClickParticles(cx, cy, '#ff007f');
            } else if (isRose) {
                unlockTrophy('rose');
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

// ============== OSU MINI-GAME ==============
const osuOverlay = document.getElementById('osu-overlay');
const osuVideo = document.getElementById('osu-video');
const osuGameArea = document.getElementById('osu-game-area');
const osuTimerEl = document.getElementById('osu-timer');
const osuScoreDisplay = document.getElementById('osu-score-display');
const osuComboEl = document.getElementById('osu-combo');
const osuResults = document.getElementById('osu-results');
const osuResultsScore = document.getElementById('osu-results-score');
const osuResultsDetail = document.getElementById('osu-results-detail');

let osuActive = false;
let osuScore = 0;
let osuCombo = 0;
let osuMaxCombo = 0;
let osuGreats = 0;
let osuOks = 0;
let osuMisses = 0;
let osuTimer = null;
let osuTimeLeft = 20;
let osuBeatIndex = 0;
let osuBeatTimer = null;

// Beatmap: timestamps in ms when circles should appear (simulates a ~130 BPM rhythm)
const OSU_BEATMAP = [
    300, 760, 1220, 1680,
    2370, 2830, 3290,
    3980, 4210, 4440, 4670, 4900,
    5590, 6050, 6510,
    7200, 7660, 8120, 8580,
    9270, 9500, 9730, 9960,
    10650, 11110, 11570,
    12260, 12720, 13180, 13640,
    14330, 14560, 14790, 15020, 15250,
    15940, 16400, 16860,
    17550, 18010, 18470,
    19160, 19390, 19620
];

function startOsuMiniGame() {
    if (osuActive) return;
    osuActive = true;
    osuScore = 0;
    osuCombo = 0;
    osuMaxCombo = 0;
    osuGreats = 0;
    osuOks = 0;
    osuMisses = 0;
    osuTimeLeft = 20;
    osuBeatIndex = 0;

    // Show overlay
    osuOverlay.classList.add('active');
    osuResults.classList.remove('show');
    osuGameArea.innerHTML = '';
    osuTimerEl.innerText = '20s';
    osuScoreDisplay.innerText = '0 pts';
    osuComboEl.innerText = '0x Combo';

    // Play video
    osuVideo.muted = false;
    osuVideo.volume = globalVolume;
    osuVideo.currentTime = 0;
    osuVideo.play().catch(() => {});

    // Hide existing game elements
    gameContainer.style.visibility = 'hidden';
    document.getElementById('hud').style.visibility = 'hidden';

    showMilestone('🎵 OSU MODE ! 🎵');

    // Start timer countdown
    const startTime = Date.now();

    osuTimer = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        osuTimeLeft = Math.max(0, 20 - Math.floor(elapsed));
        osuTimerEl.innerText = `${osuTimeLeft}s`;
        if (osuTimeLeft <= 5) osuTimerEl.style.color = '#ff3333';
        if (elapsed >= 20) {
            endOsuMiniGame();
        }
    }, 200);

    // Schedule beats
    OSU_BEATMAP.forEach((beatTime, i) => {
        setTimeout(() => {
            if (!osuActive) return;
            spawnOsuCircle(i + 1);
        }, beatTime);
    });
}

function spawnOsuCircle(number) {
    const circle = document.createElement('div');
    circle.classList.add('osu-circle');
    circle.innerText = number;

    // Random position (with margins)
    const margin = 60;
    const x = margin + Math.random() * (window.innerWidth - margin * 2);
    const y = margin + 60 + Math.random() * (window.innerHeight - margin * 2 - 60);
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;

    // Approach circle
    const approach = document.createElement('div');
    approach.classList.add('osu-approach');
    circle.appendChild(approach);

    const spawnTime = Date.now();
    let wasHit = false;

    circle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (wasHit) return;
        wasHit = true;

        const hitTime = Date.now() - spawnTime;
        const accuracy = Math.abs(hitTime - 1000); // Ideal hit at 1000ms (when approach ring meets circle)

        let hitClass, hitText, pts;
        if (accuracy < 200) {
            hitClass = 'osu-hit-great';
            hitText = 'GREAT!';
            pts = 100;
            osuGreats++;
            osuCombo++;
        } else if (accuracy < 400) {
            hitClass = 'osu-hit-ok';
            hitText = 'OK';
            pts = 50;
            osuOks++;
            osuCombo++;
        } else {
            hitClass = 'osu-hit-ok';
            hitText = 'OK';
            pts = 30;
            osuOks++;
            osuCombo++;
        }

        if (osuCombo > osuMaxCombo) osuMaxCombo = osuCombo;

        // Combo bonus
        const comboBonus = Math.floor(osuCombo / 5) * 10;
        pts += comboBonus;

        osuScore += pts;
        osuScoreDisplay.innerText = `${osuScore} pts`;
        osuComboEl.innerText = `${osuCombo}x Combo`;

        // Hit effect
        const hit = document.createElement('div');
        hit.className = hitClass;
        hit.innerText = hitText;
        hit.style.left = circle.style.left;
        hit.style.top = circle.style.top;
        osuGameArea.appendChild(hit);
        setTimeout(() => { if (hit.parentNode) hit.remove(); }, 700);

        // Burst ring
        const burst = document.createElement('div');
        burst.className = 'osu-hit-burst';
        burst.style.left = circle.style.left;
        burst.style.top = circle.style.top;
        osuGameArea.appendChild(burst);
        setTimeout(() => { if (burst.parentNode) burst.remove(); }, 400);

        playSound('click');
        circle.remove();
    });

    osuGameArea.appendChild(circle);

    // Auto-miss after 1.5s
    setTimeout(() => {
        if (!wasHit && circle.parentNode) {
            wasHit = true;
            osuMisses++;
            osuCombo = 0;
            osuComboEl.innerText = '0x Combo';

            const miss = document.createElement('div');
            miss.className = 'osu-hit-miss';
            miss.innerText = 'MISS';
            miss.style.left = circle.style.left;
            miss.style.top = circle.style.top;
            osuGameArea.appendChild(miss);
            setTimeout(() => { if (miss.parentNode) miss.remove(); }, 700);

            circle.remove();
        }
    }, 1500);
}

function endOsuMiniGame() {
    if (!osuActive) return;
    osuActive = false;
    clearInterval(osuTimer);
    osuTimerEl.style.color = '';

    // Clear remaining circles
    osuGameArea.querySelectorAll('.osu-circle').forEach(c => c.remove());

    // Show results
    osuResultsScore.innerText = `${osuScore} pts`;
    const total = osuGreats + osuOks + osuMisses;
    const accuracy = total > 0 ? Math.round(((osuGreats * 100 + osuOks * 50) / (total * 100)) * 100) : 0;
    osuResultsDetail.innerHTML = `
        GREAT: ${osuGreats} &nbsp;|&nbsp; OK: ${osuOks} &nbsp;|&nbsp; MISS: ${osuMisses}<br>
        Max Combo: ${osuMaxCombo}x<br>
        Précision: ${accuracy}%
    `;
    osuResults.classList.add('show');

    // Add Osu score to main game score
    const bonusPoints = Math.floor(osuScore / 10);
    score += bonusPoints;
    scoreEl.innerText = score;
    updateBestScore();

    if (score > 0 && score % 10 === 0) {
        autoSubmitScore();
    }

    showMilestone(`🎵 Osu! +${bonusPoints} PTS ! 🎵`);

    // Close overlay after delay
    setTimeout(() => {
        osuVideo.pause();
        osuVideo.muted = true;
        osuResults.classList.remove('show');
        osuOverlay.classList.remove('active');
        osuGameArea.innerHTML = '';

        // Show game elements again
        gameContainer.style.visibility = 'visible';
        document.getElementById('hud').style.visibility = 'visible';
    }, 3500);
}

// ============== RICKROLL EVENT ==============
const rickrollOverlay = document.getElementById('rickroll-overlay');
const rickrollVideo = document.getElementById('rickroll-video');
const rickrollGameArea = document.getElementById('rickroll-game-area');

let rickrollActive = false;
let rickrollTimer = null;
let fakeButtonsInterval = null;

function startRickrollEvent() {
    if (rickrollActive) return;
    rickrollActive = true;

    // Show overlay
    rickrollOverlay.classList.add('active');
    rickrollGameArea.innerHTML = '';

    // Hide existing game elements
    gameContainer.style.visibility = 'hidden';
    document.getElementById('hud').style.visibility = 'hidden';

    // Play video
    rickrollVideo.muted = false;
    rickrollVideo.volume = globalVolume;
    rickrollVideo.currentTime = 0;
    rickrollVideo.play().catch(() => {});

    showMilestone('🎤 NEVER GONNA GIVE YOU UP 🎤');

    // Spawn fake buttons
    fakeButtonsInterval = setInterval(spawnFakeCloseButton, 800);

    // End after 20 seconds
    rickrollTimer = setTimeout(() => {
        endRickrollEvent();
    }, 20000);
}

function spawnFakeCloseButton() {
    if (!rickrollActive) return;

    const btn = document.createElement('div');
    btn.className = 'fake-close-btn';
    btn.innerText = 'Fermer la pub ✖';

    const margin = 50;
    const x = margin + Math.random() * (window.innerWidth - margin * 2 - 120);
    const y = margin + Math.random() * (window.innerHeight - margin * 2 - 40);
    
    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;

    // Troll interaction: moving on hover/touch
    const moveBtn = () => {
        const newX = margin + Math.random() * (window.innerWidth - margin * 2 - 120);
        const newY = margin + Math.random() * (window.innerHeight - margin * 2 - 40);
        btn.style.left = `${newX}px`;
        btn.style.top = `${newY}px`;
    };

    // Make it very hard to click by moving it on hover (mouse)
    btn.addEventListener('mouseenter', moveBtn);

    // If they manage to click it (touchscreen or fast clicker)
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        playSound('squish');
        moveBtn();
        // Spawn an extra button just to annoy them more
        spawnFakeCloseButton();
    });

    rickrollGameArea.appendChild(btn);

    // Despawn after a few seconds to avoid cluttering too much
    setTimeout(() => {
        if (btn.parentNode) btn.remove();
    }, 4000 + Math.random() * 2000);
}

function endRickrollEvent() {
    if (!rickrollActive) return;
    rickrollActive = false;

    clearInterval(fakeButtonsInterval);
    clearTimeout(rickrollTimer);

    // Give bonus points for surviving
    score += 50;
    scoreEl.innerText = score;
    updateBestScore();

    showMilestone('🎤 SURVIVANT DU RICKROLL +50 PTS 🎤');

    rickrollVideo.pause();
    rickrollVideo.muted = true;
    rickrollOverlay.classList.remove('active');
    rickrollGameArea.innerHTML = '';

    // Show game elements again
    gameContainer.style.visibility = 'visible';
    document.getElementById('hud').style.visibility = 'visible';
}

// ============== GACHA / LOOTBOX EVENT ==============
const gachaOverlay = document.getElementById('gacha-overlay');
const gachaChest = document.getElementById('gacha-chest');
const gachaReveal = document.getElementById('gacha-reveal');
const gachaRays = document.getElementById('gacha-rays');
const gachaParticles = document.getElementById('gacha-particles');
const gachaStars = document.getElementById('gacha-stars');
const gachaRarityEl = document.getElementById('gacha-rarity');
const gachaItemEmoji = document.getElementById('gacha-item-emoji');
const gachaItemName = document.getElementById('gacha-item-name');
const gachaItemDesc = document.getElementById('gacha-item-desc');
const gachaEquipBtn = document.getElementById('gacha-equip-btn');
const gachaCloseBtn = document.getElementById('gacha-close-btn');
const customCursorEl = document.getElementById('custom-cursor');
const cursorGrid = document.getElementById('cursor-grid');

let gachaActive = false;
let lastGachaItem = null;

// Cursor loot table
const CURSOR_ITEMS = [
    // Common (55%)
    { id: 'potato', emoji: '🥔', name: 'Patate Cosmique', desc: '« La plus belle des patates »', rarity: 'common' },
    { id: 'sock', emoji: '🧦', name: 'Chaussette Usagée', desc: '« Sent bon le gaming »', rarity: 'common' },
    { id: 'rock', emoji: '🪨', name: 'Caillou Brillant', desc: '« C\'est juste un caillou... »', rarity: 'common' },
    { id: 'toilet', emoji: '🧻', name: 'Rouleau de PQ', desc: '« Plus rare qu\'on le pense »', rarity: 'common' },
    { id: 'spoon', emoji: '🥄', name: 'Cuillère Mythique', desc: '« Il n\'y a pas de cuillère »', rarity: 'common' },
    { id: 'toothbrush', emoji: '🪥', name: 'Brosse à Dents', desc: '« L\'hygiène avant tout »', rarity: 'common' },
    { id: 'poop', emoji: '💩', name: 'Emoji Caca', desc: '« Chef d\'œuvre moderne »', rarity: 'common' },
    { id: 'clown', emoji: '🤡', name: 'Le Clown', desc: '« C\'est toi le clown »', rarity: 'common' },
    // Rare (25%)
    { id: 'sword', emoji: '⚔️', name: 'Épée de 67', desc: '« Tranche les scores »', rarity: 'rare' },
    { id: 'diamond', emoji: '💎', name: 'Diamant', desc: '« Craft un pickaxe »', rarity: 'rare' },
    { id: 'fire', emoji: '🔥', name: 'Flamme', desc: '« Ça chauffe ici »', rarity: 'rare' },
    { id: 'ghost', emoji: '👻', name: 'Fantôme', desc: '« Boo ! »', rarity: 'rare' },
    { id: 'alien', emoji: '👽', name: 'Alien', desc: '« Venu de la planète 67 »', rarity: 'rare' },
    // Epic (15%)
    { id: 'star', emoji: '🌟', name: 'Étoile Filante', desc: '« Fais un vœu ! »', rarity: 'epic' },
    { id: 'crystal', emoji: '🔮', name: 'Boule Magique', desc: '« Je vois... un 67 »', rarity: 'epic' },
    { id: 'target', emoji: '🎯', name: 'Cible', desc: '« Précision maximale »', rarity: 'epic' },
    { id: 'dragon', emoji: '🐉', name: 'Dragon', desc: '« Dracarys! »', rarity: 'epic' },
    // Legendary (5%)
    { id: 'crown', emoji: '👑', name: 'Couronne Royale', desc: '« Le roi des 67 »', rarity: 'legendary' },
    { id: 'skull', emoji: '💀', name: 'Crâne Doré', desc: '« Skull emoji = FR »', rarity: 'legendary' },
    { id: 'rainbow', emoji: '🌈', name: 'Arc-en-ciel', desc: '« Ultra méga rare »', rarity: 'legendary' },
];

const RARITY_WEIGHTS = { common: 55, rare: 25, epic: 15, legendary: 5 };
const RARITY_LABELS = { common: 'Commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' };

// Cursor persistence
let unlockedCursors = JSON.parse(localStorage.getItem('jeu67-cursors') || '["default"]');
let activeCursor = localStorage.getItem('jeu67-active-cursor') || 'default';

let gachaPity = parseInt(localStorage.getItem('jeu67-gacha-pity') || '0');

function rollGachaItem() {
    gachaPity++;
    localStorage.setItem('jeu67-gacha-pity', gachaPity);

    let rarity;
    // Pity system: guaranteed epic+ every 15, rare+ every 5
    if (gachaPity >= 15) {
        rarity = Math.random() < 0.3 ? 'legendary' : 'epic';
        gachaPity = 0;
        localStorage.setItem('jeu67-gacha-pity', 0);
    } else if (gachaPity >= 5 && gachaPity % 5 === 0) {
        const roll = Math.random() * 100;
        if (roll < 8) rarity = 'legendary';
        else if (roll < 30) rarity = 'epic';
        else rarity = 'rare';
    } else {
        const roll = Math.random() * 100;
        if (roll < RARITY_WEIGHTS.legendary) rarity = 'legendary';
        else if (roll < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.epic) rarity = 'epic';
        else if (roll < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.epic + RARITY_WEIGHTS.rare) rarity = 'rare';
        else rarity = 'common';
    }

    if (rarity !== 'common') {
        gachaPity = 0;
        localStorage.setItem('jeu67-gacha-pity', 0);
    }

    const pool = CURSOR_ITEMS.filter(c => c.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)];
}

function startGachaEvent() {
    if (gachaActive || osuActive || rickrollActive) return;
    gachaActive = true;
    unlockTrophy('gacha');

    // Hide game
    gameContainer.style.visibility = 'hidden';
    document.getElementById('hud').style.visibility = 'hidden';

    // Reset state
    gachaChest.classList.remove('hidden', 'opening', 'shake-intense');
    document.querySelector('#gacha-chest .chest-img').src = 'Coffre.png';
    gachaReveal.classList.remove('active', 'rarity-common', 'rarity-rare', 'rarity-epic', 'rarity-legendary');
    gachaRays.classList.remove('active');
    gachaParticles.innerHTML = '';
    gachaStars.innerHTML = '';

    // Show overlay
    gachaOverlay.classList.add('active');

    // Start sparkle particles
    const sparkleInterval = setInterval(() => {
        if (!gachaActive) { clearInterval(sparkleInterval); return; }
        spawnGachaSparkle();
    }, 300);
}

function spawnGachaSparkle() {
    const sparkle = document.createElement('div');
    sparkle.className = 'gacha-sparkle';
    sparkle.innerText = ['✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 4)];
    sparkle.style.left = `${Math.random() * 100}%`;
    sparkle.style.top = `${50 + Math.random() * 40}%`;
    gachaParticles.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 2000);
}

function spawnGachaConfetti(rarityColor) {
    const colors = {
        common: ['#9ca3af', '#d1d5db', '#6b7280'],
        rare: ['#3b82f6', '#60a5fa', '#93c5fd'],
        epic: ['#a855f7', '#c084fc', '#7c3aed'],
        legendary: ['#fbbf24', '#f59e0b', '#fcd34d', '#ff6b6b', '#4ade80']
    };
    const palette = colors[rarityColor] || colors.common;
    const count = rarityColor === 'legendary' ? 80 : rarityColor === 'epic' ? 60 : 40;
    
    for (let i = 0; i < count; i++) {
        const piece = document.createElement('div');
        piece.className = 'gacha-confetti-piece';
        piece.style.left = `${Math.random() * 100}vw`;
        piece.style.top = `${-10 + Math.random() * 20}vh`;
        piece.style.background = palette[Math.floor(Math.random() * palette.length)];
        piece.style.animationDuration = `${2 + Math.random() * 2}s`;
        piece.style.animationDelay = `${Math.random() * 0.5}s`;
        piece.style.width = `${6 + Math.random() * 10}px`;
        piece.style.height = `${6 + Math.random() * 10}px`;
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 4000);
    }
}

function spawnScreenFlash(rarity) {
    const flash = document.createElement('div');
    flash.className = `gacha-flash flash-${rarity}`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 700);
}

// Chest click handler
gachaChest.addEventListener('pointerdown', () => {
    if (gachaChest.classList.contains('opening')) return;
    gachaChest.classList.add('opening');
    gachaRays.classList.add('active');
    document.querySelector('#gacha-chest .chest-img').src = 'CoffreOuvert.png';

    // Play buildup sound
    playSound('chest_open');

    const item = rollGachaItem();
    lastGachaItem = item;
    
    // Determine number of stars based on rarity
    const starsCount = { common: 1, rare: 2, epic: 3, legendary: 4 }[item.rarity];
    const starColorClass = `star-${item.rarity}`;
    
    // Create stars (colored by rarity)
    gachaStars.innerHTML = '';
    const starEls = [];
    for (let i = 0; i < starsCount; i++) {
        const star = document.createElement('div');
        star.className = `gacha-star ${starColorClass}`;
        star.innerText = '⭐';
        gachaStars.appendChild(star);
        starEls.push(star);
    }

    // Crescendo shake: intensify after half the stars
    const intensifyAt = Math.max(1, Math.floor(starsCount / 2));
    setTimeout(() => {
        gachaChest.classList.add('shake-intense');
    }, 500 + intensifyAt * 400);

    // Sequence the stars animation
    for (let i = 0; i < starsCount; i++) {
        setTimeout(() => {
            starEls[i].classList.add('show');
            playSound(`star${i + 1}`);
        }, 500 + i * 400);
    }

    // Reveal delay
    const revealDelay = 500 + (starsCount - 1) * 400 + 800;

    // Screen flash + reveal
    setTimeout(() => {
        spawnScreenFlash(item.rarity);
        gachaStars.innerHTML = '';
        gachaChest.classList.remove('shake-intense');
        revealGachaItem(item);
    }, revealDelay);
});

function revealGachaItem(item) {
    // Hide chest
    gachaChest.classList.add('hidden');

    // Set rarity class on reveal
    gachaReveal.className = 'gacha-reveal active rarity-' + item.rarity;

    // Fill reveal content
    gachaRarityEl.innerText = RARITY_LABELS[item.rarity];
    gachaItemEmoji.innerText = item.emoji;
    gachaItemName.innerText = item.name;
    gachaItemDesc.innerText = item.desc;

    // Check if already owned
    const alreadyOwned = unlockedCursors.includes(item.id);
    if (alreadyOwned) {
        gachaEquipBtn.innerText = '🔄 Doublon ! +67 pts';
        gachaEquipBtn.style.opacity = '0.7';
    } else {
        gachaEquipBtn.innerText = '✅ Équiper !';
        gachaEquipBtn.style.opacity = '1';
        // Unlock the cursor
        unlockedCursors.push(item.id);
        localStorage.setItem('jeu67-cursors', JSON.stringify(unlockedCursors));
    }

    // Confetti!
    spawnGachaConfetti(item.rarity);

    // Play sound based on rarity
    if (item.rarity === 'legendary') {
        playSound('nuke');
    } else if (item.rarity === 'epic') {
        playSound('boum');
    } else if (item.rarity === 'rare') {
        playSound('click');
    } else {
        playSound('squish');
    }

    // Show milestone for legendary
    if (item.rarity === 'legendary') {
        showMilestone('👑 LÉGENDAIRE ! 👑');
    } else if (item.rarity === 'common') {
        showMilestone('🥔 Wow... +1 pt 🥔');
    }
}

// Equip button
gachaEquipBtn.addEventListener('pointerdown', () => {
    if (lastGachaItem) {
        const alreadyOwned = unlockedCursors.filter(id => id === lastGachaItem.id).length > 1 ||
                             (unlockedCursors.includes(lastGachaItem.id) && gachaEquipBtn.innerText.includes('Doublon'));
        if (alreadyOwned || gachaEquipBtn.innerText.includes('Doublon')) {
            // Doublon bonus
            score += 67;
            scoreEl.innerText = score;
            updateBestScore();
            showMilestone('🔄 Doublon ! +67 pts');
        } else {
            setActiveCursor(lastGachaItem.id);
        }
        endGachaEvent();
    }
});

// Close button
gachaCloseBtn.addEventListener('pointerdown', () => {
    endGachaEvent();
});

function endGachaEvent() {
    if (!gachaActive) return;
    gachaActive = false;

    // Points based on rarity
    const rarityPoints = { common: 1, rare: 10, epic: 25, legendary: 67 };
    const pts = lastGachaItem ? (rarityPoints[lastGachaItem.rarity] || 1) : 1;
    score += pts;
    scoreEl.innerText = score;
    updateBestScore();

    // Clean up
    gachaOverlay.classList.remove('active');
    gachaRays.classList.remove('active');
    gachaParticles.innerHTML = '';
    gachaStars.innerHTML = '';

    // Show game again
    gameContainer.style.visibility = 'visible';
    document.getElementById('hud').style.visibility = 'visible';

    lastGachaItem = null;
}

// ============== CUSTOM CURSOR SYSTEM ==============
const cursorsModal = document.getElementById('cursors-modal');
const btnCursors = document.getElementById('btn-cursors');
const cursorStats = document.getElementById('cursor-stats');
const cursorEffectInfo = document.getElementById('cursor-effect-info');
let cursorTrailThrottle = 0;
let orbitStars = [];
let orbitAngle = 0;
let orbitAnimFrame = null;

function setActiveCursor(cursorId) {
    activeCursor = cursorId;
    localStorage.setItem('jeu67-active-cursor', cursorId);
    applyCursor();
    renderCursorGrid();
}

function getActiveCursorRarity() {
    if (activeCursor === 'default') return null;
    const item = CURSOR_ITEMS.find(c => c.id === activeCursor);
    return item ? item.rarity : null;
}

function applyCursor() {
    // Clean up old orbiting stars
    orbitStars.forEach(s => s.remove());
    orbitStars = [];
    if (orbitAnimFrame) { cancelAnimationFrame(orbitAnimFrame); orbitAnimFrame = null; }

    customCursorEl.classList.remove('epic-aura', 'legendary-aura');

    if (activeCursor === 'default') {
        customCursorEl.classList.remove('active');
        document.body.classList.remove('custom-cursor-active');
    } else {
        const item = CURSOR_ITEMS.find(c => c.id === activeCursor);
        if (item) {
            customCursorEl.innerText = item.emoji;
            customCursorEl.classList.add('active');
            document.body.classList.add('custom-cursor-active');

            // Apply aura
            if (item.rarity === 'epic') {
                customCursorEl.classList.add('epic-aura');
            } else if (item.rarity === 'legendary') {
                customCursorEl.classList.add('legendary-aura');
                initOrbitStars();
            }
        }
    }
}

// Legendary orbiting stars
function initOrbitStars() {
    const starEmojis = ['✨', '⭐', '💫'];
    for (let i = 0; i < 3; i++) {
        const s = document.createElement('div');
        s.className = 'cursor-orbit-star';
        s.innerText = starEmojis[i];
        document.body.appendChild(s);
        orbitStars.push(s);
    }
    animateOrbit();
}

function animateOrbit() {
    orbitAngle += 0.03;
    const cx = parseFloat(customCursorEl.style.left) || 0;
    const cy = parseFloat(customCursorEl.style.top) || 0;
    const radius = 30;

    orbitStars.forEach((star, i) => {
        const angle = orbitAngle + (i * Math.PI * 2 / 3);
        star.style.left = (cx + Math.cos(angle) * radius) + 'px';
        star.style.top = (cy + Math.sin(angle) * radius) + 'px';
    });

    orbitAnimFrame = requestAnimationFrame(animateOrbit);
}

// Trail effect for epic+ cursors
function spawnCursorTrail(x, y) {
    const rarity = getActiveCursorRarity();
    if (rarity !== 'epic' && rarity !== 'legendary') return;

    const trail = document.createElement('div');
    trail.className = `cursor-trail ${rarity}`;
    trail.style.left = x + 'px';
    trail.style.top = y + 'px';
    document.body.appendChild(trail);

    const dur = rarity === 'legendary' ? 900 : 700;
    setTimeout(() => trail.remove(), dur);
}

// Sparkle particles for epic & legendary cursors
function spawnCursorSparkle(x, y) {
    const rarity = getActiveCursorRarity();
    
    if (rarity === 'epic') {
        if (Math.random() > 0.15) return;
        const sparkle = document.createElement('div');
        sparkle.className = 'cursor-sparkle epic-sparkle';
        sparkle.innerText = ['✨', '💜', '🔮'][Math.floor(Math.random() * 3)];
        sparkle.style.left = (x + (Math.random() - 0.5) * 30) + 'px';
        sparkle.style.top = (y + (Math.random() - 0.5) * 30) + 'px';
        document.body.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 600);
    } else if (rarity === 'legendary') {
        if (Math.random() > 0.25) return;
        const sparkle = document.createElement('div');
        sparkle.className = 'cursor-sparkle legendary-sparkle';
        sparkle.innerText = ['✨', '⭐', '💫', '🌟', '💛', '🔥'][Math.floor(Math.random() * 6)];
        sparkle.style.left = (x + (Math.random() - 0.5) * 50) + 'px';
        sparkle.style.top = (y + (Math.random() - 0.5) * 50) + 'px';
        document.body.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 1200);
    }
}

// Click effects
function spawnClickEffect(x, y) {
    const rarity = getActiveCursorRarity();
    
    if (rarity === 'epic') {
        // Purple shockwave ring
        const wave = document.createElement('div');
        wave.className = 'cursor-shockwave';
        wave.style.left = x + 'px';
        wave.style.top = y + 'px';
        document.body.appendChild(wave);
        setTimeout(() => wave.remove(), 600);
    } else if (rarity === 'legendary') {
        // Golden burst explosion
        const burstEmojis = ['✨', '⭐', '💫', '🌟', '💥', '🔥'];
        for (let i = 0; i < 8; i++) {
            const burst = document.createElement('div');
            burst.className = 'cursor-burst';
            burst.innerText = burstEmojis[Math.floor(Math.random() * burstEmojis.length)];
            const angle = (i / 8) * Math.PI * 2;
            const dist = 40 + Math.random() * 30;
            burst.style.left = x + 'px';
            burst.style.top = y + 'px';
            burst.style.setProperty('--bx', `${Math.cos(angle) * dist}px`);
            burst.style.setProperty('--by', `${Math.sin(angle) * dist}px`);
            document.body.appendChild(burst);
            setTimeout(() => burst.remove(), 700);
        }

        // Shockwave too
        const wave = document.createElement('div');
        wave.className = 'cursor-shockwave';
        wave.style.left = x + 'px';
        wave.style.top = y + 'px';
        wave.style.borderColor = 'rgba(255, 200, 40, 0.8)';
        document.body.appendChild(wave);
        setTimeout(() => wave.remove(), 600);
    }
}

// Follow mouse/touch with trail effects
document.addEventListener('mousemove', (e) => {
    if (activeCursor !== 'default') {
        customCursorEl.style.left = e.clientX + 'px';
        customCursorEl.style.top = e.clientY + 'px';

        // Throttle trail spawning
        const now = Date.now();
        if (now - cursorTrailThrottle > 25) {
            cursorTrailThrottle = now;
            spawnCursorTrail(e.clientX, e.clientY);
            spawnCursorSparkle(e.clientX, e.clientY);
        }
    }
});

document.addEventListener('touchmove', (e) => {
    if (activeCursor !== 'default' && e.touches.length > 0) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        customCursorEl.style.left = tx + 'px';
        customCursorEl.style.top = ty + 'px';

        const now = Date.now();
        if (now - cursorTrailThrottle > 25) {
            cursorTrailThrottle = now;
            spawnCursorTrail(tx, ty);
            spawnCursorSparkle(tx, ty);
        }
    }
}, { passive: true });

// Click animation
document.addEventListener('pointerdown', (e) => {
    if (activeCursor !== 'default') {
        customCursorEl.style.transform = 'translate(-50%, -50%) scale(0.75)';
        setTimeout(() => {
            customCursorEl.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 100);
        spawnClickEffect(e.clientX, e.clientY);
    }
});

// ============== CURSOR GALLERY ==============
btnCursors.addEventListener('click', () => {
    cursorsModal.classList.add('active');
    renderCursorGrid();
});

function renderCursorGrid() {
    cursorGrid.innerHTML = '';

    // Stats
    const totalCursors = CURSOR_ITEMS.length;
    const ownedCount = unlockedCursors.filter(id => id !== 'default').length;
    cursorStats.innerHTML = `Collection : <span>${ownedCount}</span> / <span>${totalCursors}</span> curseurs débloqués`;

    // Effect info
    const rarity = getActiveCursorRarity();
    if (rarity === 'legendary') {
        cursorEffectInfo.innerText = '🔥 Trainée dorée + Étoiles orbitales + Explosion au clic';
    } else if (rarity === 'epic') {
        cursorEffectInfo.innerText = '✨ Trainée violette + Onde de choc au clic';
    } else if (rarity === 'rare') {
        cursorEffectInfo.innerText = '💎 Pas d\'effet de trainée (épique+ requis)';
    } else if (activeCursor !== 'default') {
        cursorEffectInfo.innerText = '🥔 Pas d\'effet de trainée (épique+ requis)';
    } else {
        cursorEffectInfo.innerText = 'Ouvre des coffres 🎁 pour débloquer des curseurs !';
    }

    // Default cursor option
    const defaultEl = document.createElement('div');
    defaultEl.className = `cursor-item ${activeCursor === 'default' ? 'selected' : ''}`;
    defaultEl.innerHTML = `
        <span class="cursor-emoji">🖱️</span>
        <span class="cursor-name">Par défaut</span>
    `;
    defaultEl.addEventListener('click', () => setActiveCursor('default'));
    cursorGrid.appendChild(defaultEl);

    // Sort: legendary first, then epic, rare, common
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    const sorted = [...CURSOR_ITEMS].sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);

    sorted.forEach(item => {
        const isUnlocked = unlockedCursors.includes(item.id);
        const isSelected = activeCursor === item.id;
        const el = document.createElement('div');
        el.className = `cursor-item ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
        
        let effectBadge = '';
        if (item.rarity === 'legendary') effectBadge = '<span style="font-size:0.5rem;position:absolute;top:2px;left:4px">🔥</span>';
        else if (item.rarity === 'epic') effectBadge = '<span style="font-size:0.5rem;position:absolute;top:2px;left:4px">✨</span>';
        
        el.innerHTML = `
            ${effectBadge}
            <span class="cursor-rarity-dot ${item.rarity}"></span>
            <span class="cursor-emoji">${isUnlocked ? item.emoji : '❓'}</span>
            <span class="cursor-name">${isUnlocked ? item.name : '???'}</span>
        `;
        if (isUnlocked) {
            el.addEventListener('click', () => setActiveCursor(item.id));
        }
        cursorGrid.appendChild(el);
    });
}

// Init cursor system on load
applyCursor();

// Render cursor grid when settings opens (keep backward compat)
btnSettings.addEventListener('click', () => {
    // No longer has cursor grid in settings
});
