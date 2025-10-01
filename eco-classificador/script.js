// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { apiKey: "DEMO", authDomain: "DEMO", projectId: "DEMO" };
const appId = typeof __app_id !== 'undefined' ? __app_id : 'eco-classificador-default';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let userId;
let userDocRef;
let highScore = 0;

// Autenticação e busca de dados
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        userDocRef = doc(db, `artifacts/${appId}/users/${userId}/scores/highscore`);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                highScore = docSnap.data().score || 0;
            }
            elements.highScoreDisplay.textContent = highScore;
        } catch (error) {
            console.error("Erro ao buscar pontuação máxima:", error);
        }
    }
});

async function signInUser() {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error)
    {
        console.error("Falha na autenticação:", error);
    }
}

// Dados do Jogo
const trashTypes = [
    { type: 'paper', name: 'Jornal', emoji: '📰' },
    { type: 'paper', name: 'Caixa de Papelão', emoji: '📦' },
    { type: 'paper', name: 'Revista', emoji: '📖' },
    { type: 'plastic', name: 'Garrafa PET', emoji: '🥤' },
    { type: 'plastic', name: 'Embalagem Plástica', emoji: '🛍️' },
    { type: 'plastic', 'name': 'Brinquedo Quebrado', emoji: '🧸' },
    { type: 'glass', name: 'Garrafa de Vidro', emoji: '🍾' },
    { type: 'glass', name: 'Pote de Vidro', emoji: '🍯' },
    { type: 'glass', name: 'Copo Quebrado', emoji: '🍸' },
    { type: 'organic', name: 'Casca de Banana', emoji: '🍌' },
    { type: 'organic', name: 'Resto de Comida', emoji: '🍎' },
    { type: 'organic', name: 'Folha Seca', emoji: '🍂' },
    { type: 'metal', name: 'Lata de Alumínio', emoji: '🥫' },
    { type: 'metal', name: 'Lata de Aço', emoji: '🛢️' },
    { type: 'metal', name: 'Tampa de Metal', emoji: '⚙️' }
];

// Elementos do DOM
const elements = {
    startScreen: document.getElementById('start-screen'),
    gameContainer: document.getElementById('game-container'),
    startButton: document.getElementById('start-button'),
    trashArea: document.getElementById('trash-area'),
    scoreDisplay: document.getElementById('score-value'),
    timerDisplay: document.getElementById('timer'),
    messageBox: document.getElementById('message-box'),
    bins: document.querySelectorAll('.bin'),
    resetButton: document.getElementById('reset-button'),
    resetButtonEnd: document.getElementById('reset-button-end'),
    gameEndScreen: document.getElementById('game-end-screen'),
    endGameTitle: document.getElementById('end-game-title'),
    endGameMessage: document.getElementById('end-game-message'),
    starContainer: document.getElementById('star-container'),
    accuracyDisplay: document.getElementById('accuracy-display'),
    curiosityButton: document.getElementById('curiosity-button'),
    curiosityModalOverlay: document.getElementById('curiosity-modal-overlay'),
    modalCloseButton: document.getElementById('modal-close-button'),
    loadingSpinner: document.getElementById('loading-spinner'),
    curiosityText: document.getElementById('curiosity-text'),
    streakCounter: document.getElementById('streak-counter'),
    highScoreDisplay: document.getElementById('high-score-display')
};

// Estado do Jogo
let score, timeLeft, timerInterval, currentTrash, activeTrashElement, gameActive;
let correctAttempts, totalAttempts, streak;

let isDragging = false;
let offsetX, offsetY;

let audioContextStarted = false;

// Configuração de Áudio (Tone.js)
const sounds = {
    correct: new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 } }).toDestination(),
    incorrect: new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 } }).toDestination(),
    gameEnd: new Tone.MembraneSynth().toDestination(),
    streak: new Tone.PluckSynth().toDestination()
};

function initGame() {
    elements.startScreen.classList.add('hidden');
    elements.gameContainer.classList.remove('hidden');

    score = 0;
    timeLeft = 60;
    correctAttempts = 0;
    totalAttempts = 0;
    streak = 0;
    gameActive = true;

    elements.scoreDisplay.textContent = score;
    elements.streakCounter.textContent = '';
    updateTimerDisplay();
    hideEndGameScreen();
    hideCuriosityButton();
    hideCuriosityModal();
    generateNewTrash();
    showMessage('Arraste o lixo para a lixeira correta!', 'info');

    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function updateScore(points, isCorrect) {
    if (!gameActive) return;

    score += points;
    score = Math.max(0, score);
    elements.scoreDisplay.textContent = score;
    elements.scoreDisplay.parentElement.classList.add('score-flash');
    setTimeout(() => elements.scoreDisplay.parentElement.classList.remove('score-flash'), 500);

    if (isCorrect) {
        streak++;
        if (streak > 1) {
            elements.streakCounter.textContent = `🔥 Sequência de ${streak}!`;
            elements.streakCounter.classList.add('score-flash');
            setTimeout(() => elements.streakCounter.classList.remove('score-flash'), 500);
        }
        if (streak > 0 && streak % 5 === 0) {
            timeLeft += 5;
            updateTimerDisplay();
            showMessage(`+5s de bônus por ${streak} acertos seguidos!`, 'success');
            sounds.streak.triggerAttackRelease("G5", "8n", Tone.context.currentTime + 0.1);
            return; // Retorna para não sobrescrever a mensagem de bônus
        }
    } else {
        streak = 0;
        elements.streakCounter.textContent = '';
    }
}

function updateTimer() {
    if (!gameActive) return;

    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 10 && !elements.timerDisplay.classList.contains('time-warning')) {
        elements.timerDisplay.classList.add('time-warning');
    }

    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame('lose');
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    elements.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function showMessage(message, type = 'info') {
    elements.messageBox.textContent = message;
    elements.messageBox.className = 'message-box w-full md:w-auto flex-grow'; // Reset classes

    switch (type) {
        case 'success':
            elements.messageBox.classList.add('bg-green-100', 'text-green-800', 'border-green-400');
            sounds.correct.triggerAttackRelease("C5", "8n");
            showCuriosityButton();
            break;
        case 'error':
            elements.messageBox.classList.add('bg-red-100', 'text-red-800', 'border-red-400');
            sounds.incorrect.triggerAttackRelease("C3", "8n");
            hideCuriosityButton();
            break;
        default:
            elements.messageBox.classList.add('bg-blue-100', 'text-blue-800', 'border-blue-400');
            hideCuriosityButton();
    }
    elements.messageBox.classList.add('message-pop');
}

function generateNewTrash() {
    if (!gameActive) return;
    if (activeTrashElement) activeTrashElement.remove();

    currentTrash = trashTypes[Math.floor(Math.random() * trashTypes.length)];
    activeTrashElement = document.createElement('div');
    activeTrashElement.className = 'draggable w-28 h-28 md:w-32 md:h-32 bg-white rounded-xl shadow-lg flex flex-col items-center justify-center text-center p-2 text-gray-800 font-semibold text-sm trash-spawn';
    activeTrashElement.setAttribute('draggable', 'true');
    activeTrashElement.setAttribute('data-type', currentTrash.type);
    activeTrashElement.innerHTML = `<span class="text-4xl md:text-5xl mb-1">${currentTrash.emoji}</span><span>${currentTrash.name}</span>`;

    elements.trashArea.appendChild(activeTrashElement);

    activeTrashElement.addEventListener('mousedown', startDrag);
    activeTrashElement.addEventListener('touchstart', startDrag, { passive: false });
}

function handleDrop(binElement) {
    if (!gameActive || !currentTrash) return;

    const droppedTrashType = currentTrash.type;
    const acceptedBinType = binElement.getAttribute('data-accepts');

    totalAttempts++;

    binElement.classList.add('feedback-animation');

    if (droppedTrashType === acceptedBinType) {
        correctAttempts++;
        updateScore(10, true);
        showMessage('Correto! +10 pontos!', 'success');
        binElement.classList.add('correct');
        createParticles(binElement);
    } else {
        updateScore(-5, false);
        showMessage(`Ops! ${currentTrash.name} é ${translateType(currentTrash.type)}.`, 'error');
        binElement.classList.add('incorrect');
    }

    setTimeout(() => {
        binElement.classList.remove('feedback-animation', 'correct', 'incorrect');
    }, 500);

    generateNewTrash();
}

async function endGame(status) {
    gameActive = false;
    clearInterval(timerInterval);
    elements.trashArea.innerHTML = '';
    hideCuriosityButton();
    sounds.gameEnd.triggerAttackRelease("C2", "1n");

    elements.gameEndScreen.classList.remove('win', 'lose');
    elements.gameEndScreen.classList.add('active');

    const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : 0;
    elements.accuracyDisplay.textContent = `Acertos: ${correctAttempts} de ${totalAttempts} (${accuracy}%)`;

    if (score > highScore) {
        highScore = score;
        elements.highScoreDisplay.textContent = highScore;
        if (userDocRef) {
            try {
                await setDoc(userDocRef, { score: highScore }, { merge: true });
            } catch (e) {
                console.error("Erro ao salvar pontuação máxima: ", e);
            }
        }
    }

    if (status === 'lose') {
        elements.gameEndScreen.classList.add('lose');
        elements.endGameTitle.textContent = 'Tempo Esgotado!';
        elements.endGameMessage.textContent = `Sua pontuação final foi: ${score}.`;
        displayStars(calculateStars());
    }
}

function hideEndGameScreen() { elements.gameEndScreen.classList.remove('active'); }
function showCuriosityButton() { elements.curiosityButton.classList.add('active'); }
function hideCuriosityButton() { elements.curiosityButton.classList.remove('active'); }
function showCuriosityModal() { elements.curiosityModalOverlay.classList.add('active'); }
function hideCuriosityModal() { elements.curiosityModalOverlay.classList.remove('active'); }
function showLoadingSpinner() { elements.loadingSpinner.classList.add('active'); elements.curiosityText.textContent = 'Gerando curiosidade...'; }
function hideLoadingSpinner() { elements.loadingSpinner.classList.remove('active'); }

function calculateStars() {
    if (totalAttempts === 0) return 0;
    const accuracy = (correctAttempts / totalAttempts) * 100;
    if (accuracy >= 90) return 3;
    if (accuracy >= 70) return 2;
    if (accuracy >= 50) return 1;
    return 0;
}

function displayStars(numStars) {
    let starsHtml = '';
    for (let i = 0; i < 3; i++) {
        starsHtml += (i < numStars) ? '⭐' : '☆';
    }
    elements.starContainer.innerHTML = starsHtml;
}

function translateType(type) {
    const types = { paper: 'Papel', plastic: 'Plástico', glass: 'Vidro', organic: 'Orgânico', metal: 'Metal' };
    return types[type] || 'desconhecido';
}

function createParticles(element) {
    const rect = element.getBoundingClientRect();
    const containerRect = elements.gameContainer.getBoundingClientRect();

    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        const color = getComputedStyle(element).backgroundColor;
        p.style.setProperty('--color', color);

        const size = Math.random() * 10 + 5;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;

        p.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
        p.style.top = `${rect.top - containerRect.top + rect.height / 2}px`;

        const angle = Math.random() * 360;
        const radius = Math.random() * 100 + 50;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const y = Math.sin(angle * Math.PI / 180) * radius;

        p.style.setProperty('--x', `${x}px`);
        p.style.setProperty('--y', `${y}px`);

        elements.gameContainer.appendChild(p);
        setTimeout(() => p.remove(), 800);
    }
}

async function getEcoCuriosity() {
    if (!currentTrash) return;

    showLoadingSpinner();
    showCuriosityModal();

    const prompt = `Gere uma curiosidade ecológica ou dica rápida e interessante sobre a reciclagem de "${currentTrash.name}" (${translateType(currentTrash.type)}). Seja conciso (máximo 2-3 frases) e informativo, em português do Brasil.`;

    const apiKey = ""; // A chave da API será injetada pelo ambiente de execução
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        elements.curiosityText.textContent = text || 'Não foi possível gerar uma curiosidade no momento.';

    } catch (error) {
        console.error('Erro ao chamar a API Gemini:', error);
        elements.curiosityText.textContent = 'Ocorreu um erro ao buscar a curiosidade.';
    } finally {
        hideLoadingSpinner();
    }
}

// Lógica de Arrastar e Soltar (Drag and Drop)
function startDrag(e) {
    if (!gameActive || !e.target.classList.contains('draggable')) return;
    
    startAudio();
    e.preventDefault();

    activeTrashElement = e.target;
    isDragging = true;
    
    const rect = activeTrashElement.getBoundingClientRect();
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;

    activeTrashElement.style.position = 'absolute';
    activeTrashElement.style.width = `${rect.width}px`;
    activeTrashElement.style.height = `${rect.height}px`;
    activeTrashElement.style.left = `${clientX - offsetX}px`;
    activeTrashElement.style.top = `${clientY - offsetY}px`;
    
    document.body.appendChild(activeTrashElement);
    activeTrashElement.classList.add('dragging');

    document.addEventListener('mousemove', dragMove);
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}

function dragMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    moveElement(clientX, clientY);

    elements.bins.forEach(bin => {
        const rect = bin.getBoundingClientRect();
        if (clientX > rect.left && clientX < rect.right && clientY > rect.top && clientY < rect.bottom) {
            bin.classList.add('drag-over');
            const color = getComputedStyle(bin).backgroundColor;
            bin.style.setProperty('--feedback-color', color);
        } else {
            bin.classList.remove('drag-over');
        }
    });
}

function moveElement(x, y) {
    activeTrashElement.style.left = `${x - offsetX}px`;
    activeTrashElement.style.top = `${y - offsetY}px`;
}

function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;

    // We need to temporarily hide the element to check what's underneath
    activeTrashElement.style.pointerEvents = 'none';
    const clientX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.type === 'touchend' ? e.changedTouches[0].clientY : e.clientY;
    const elementUnder = document.elementFromPoint(clientX, clientY);
    activeTrashElement.style.pointerEvents = 'auto';

    let droppedOnBin = false;
    
    if (elementUnder) {
        const bin = elementUnder.closest('.bin');
        if (bin) {
            handleDrop(bin);
            droppedOnBin = true;
        }
    }

    if (!droppedOnBin) {
        generateNewTrash();
    }
    
    activeTrashElement.remove(); // Always remove the dragged clone

    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);
}

function startAudio() {
     if (!audioContextStarted) {
        Tone.start();
        audioContextStarted = true;
    }
}

// Event Listeners Iniciais
elements.startButton.addEventListener('click', initGame);
elements.resetButton.addEventListener('click', initGame);
elements.resetButtonEnd.addEventListener('click', initGame);
elements.curiosityButton.addEventListener('click', getEcoCuriosity);
elements.modalCloseButton.addEventListener('click', hideCuriosityModal);
elements.curiosityModalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.curiosityModalOverlay) hideCuriosityModal();
});

// Iniciar autenticação ao carregar a página
signInUser();
