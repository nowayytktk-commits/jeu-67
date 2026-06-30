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

// Modals & UI
const btnSettings = document.getElementById('btn-settings');
const btnLeaderboard = document.getElementById('btn-leaderboard');
const settingsModal = document.getElementById('settings-modal');
const leaderboardModal = document.getElementById('leaderboard-modal');
const volumeSlider = document.getElementById('volume-slider');
const btnSubmitScore = document.getElementById('btn-submit-score');
const inputPlayerName = document.getElementById('player-name');
const leaderboardList = document.getElementById('leaderboard-list');
const submitScoreVal = document.getElementById('submit-score-val');

// ============== GAME STATE ==============
let score = 0;
let gameInterval;
const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth < 768;
let maxItems = isMobile ? 30 : 50;
let bestScore = parseInt(localStorage.getItem('jeu67-best') || '0');
let hasPlayedAudio = false;
let hasPlayedNuke = false;
let tntMode = false;
let tntModeTimer = null;
let tntTimeLeft = 0;
let tntCountdown = null;
let globalVolume = parseFloat(localStorage.getItem('jeu67-volume') || '0.7');
let playerName = localStorage.getItem('jeu67-pseudo') || '';
let lastSubmittedScore = 0;

// Dreamlo Keys
const dreamloPublic = '6a43f8228f40bb131856e168';
const dreamloPrivate = 'LkNe2Bklx0OnMMqGkvaalA3Cb8ytP9yESxOs8QoR2Ouw';

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
    submitScoreVal.innerText = score;
    fetchLeaderboard();
});

// ============== DREAMLO LEADERBOARD ==============
function fetchLeaderboard() {
    leaderboardList.innerHTML = '<div class="lb-loading">Chargement...</div>';
    
    const url = `http://dreamlo.com/lb/${dreamloPublic}/json`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    fetch(proxyUrl)
        .then(res => res.json())
        .then(data => {
            leaderboardList.innerHTML = '';
            if (!data.dreamlo || !data.dreamlo.leaderboard || !data.dreamlo.leaderboard.entry) {
                leaderboardList.innerHTML = '<div class="lb-loading">Aucun score pour le moment !</div>';
                return;
            }
            let entries = data.dreamlo.leaderboard.entry;
            if (!Array.isArray(entries)) entries = [entries]; // If only 1 entry, dreamlo returns object

            entries.slice(0, 50).forEach((entry, index) => {
                const el = document.createElement('div');
                el.classList.add('lb-entry');
                el.innerHTML = `
                    <div class="lb-rank">#${index + 1}</div>
                    <div class="lb-name">${entry.name.substring(0, 15)}</div>
                    <div class="lb-score">${entry.score}</div>
                `;
                leaderboardList.appendChild(el);
            });
        })
        .catch(() => {
            leaderboardList.innerHTML = '<div class="lb-loading">Erreur de connexion.</div>';
        });
}

function autoSubmitScore() {
    if (!playerName) {
        playerName = prompt("Nouveau record ! Quel est ton pseudo ? (3-10 caractères)") || "Anonyme" + Math.floor(Math.random()*1000);
        playerName = playerName.trim().replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
        localStorage.setItem('jeu67-pseudo', playerName);
        inputPlayerName.value = playerName;
    }

    if (score > lastSubmittedScore && score > 0) {
        const url = `http://dreamlo.com/lb/${dreamloPrivate}/add/${playerName}/${score}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        
        fetch(proxyUrl).then(() => {
            lastSubmittedScore = score;
        }).catch(() => {});
    }
}

// Initial setup for the pseudo input
if (playerName) {
    inputPlayerName.value = playerName;
}

btnSubmitScore.addEventListener('click', () => {
    const name = inputPlayerName.value.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (name.length < 3) {
        alert("Ton pseudo doit contenir au moins 3 lettres/chiffres.");
        return;
    }
    
    playerName = name;
    localStorage.setItem('jeu67-pseudo', playerName);
    
    btnSubmitScore.disabled = true;
    btnSubmitScore.innerText = "Envoi...";
    
    const url = `http://dreamlo.com/lb/${dreamloPrivate}/add/${playerName}/${score}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    // Add score to Dreamlo
    fetch(proxyUrl)
        .then(() => {
            lastSubmittedScore = score;
            btnSubmitScore.innerText = "Score publié !";
            fetchLeaderboard();
            setTimeout(() => {
                btnSubmitScore.disabled = false;
                btnSubmitScore.innerText = `Publier mon Score (${score})`;
            }, 3000);
        })
        .catch(() => {
            btnSubmitScore.innerText = "Erreur...";
            setTimeout(() => {
                btnSubmitScore.disabled = false;
                btnSubmitScore.innerText = `Publier mon Score (${score})`;
            }, 2000);
        });
});

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
    tntTimeLeft = 60;
    document.body.classList.add('tnt-active');
    tntTimerEl.classList.add('show');
    tntTimerEl.innerText = `💣 TNT MODE: 60s`;
    showMilestone('🐔💥 TNT MODE ! 💥🐔');

    // Clear existing 67s and replace with TNT
    const existing67s = gameContainer.querySelectorAll('.number-67:not(.pop)');
    existing67s.forEach(el => {
        if (!el.classList.contains('ender-item') && !el.querySelector('img[src="tasty.png"]') && !el.querySelector('img[src="chiken.png"]')) {
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
    showMilestone('☢️ 69 ! NUKE ! ☢️');
    
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
    const isEnder = rand < 0.015;
    const isRose = !isEnder && rand < 0.030; // another 1.5% chance
    const isChicken = !isEnder && !isRose && rand < 0.040; // 1% chance
    const isTasty = !isEnder && !isRose && !isChicken && rand < 0.070; // 3% chance
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
    if (!isEnder && !isTnt && !isChicken && !isRose) el.style.filter = `hue-rotate(${hue}deg)`;

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

            // Nuke at 69
            if (score >= 69 && !hasPlayedNuke) {
                triggerNukeExplosion();
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
