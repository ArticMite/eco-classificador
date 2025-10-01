const trashTypes = [
    { type: 'paper', name: 'Jornal', emoji: '📰' },
    { type: 'paper', name: 'Caixa de Papelão', emoji: '📦' },
    { type: 'paper', name: 'Revista', emoji: ' M' },
    { type: 'paper', name: 'Caderno Velho', emoji: ' 📓' },
    { type: 'paper', name: 'Envelope', emoji: ' ✉️' },
    { type: 'plastic', name: 'Garrafa PET', emoji: '🥤' },
    { type: 'plastic', name: 'Embalagem Plástica', emoji: '🛍️' },
    { type: 'plastic', name: 'Pote de Iogurte', emoji: '🍦' },
    { type: 'plastic', name: 'Sacola Plástica', emoji: '🛒' },
    { type: 'plastic', name: 'Brinquedo Quebrado', emoji: '🧸' },
    { type: 'glass', name: 'Garrafa de Vidro', emoji: '🍾' },
    { type: 'glass', name: 'Pote de Vidro', emoji: '🍯' },
    { type: 'glass', name: 'Copo Quebrado', emoji: '🥂' },
    { type: 'glass', name: 'Frasco de Perfume', emoji: '🧴' },
    { type: 'organic', name: 'Casca de Banana', emoji: '🍌' },
    { type: 'organic', name: 'Resto de Comida', emoji: '🥘' },
    { type: 'organic', name: 'Borra de Café', emoji: '☕' },
    { type: 'organic', name: 'Folhas Secas', emoji: '🍂' },
    { type: 'organic', name: 'Casca de Ovo', emoji: '🥚' }
];

const trashArea = document.getElementById('trash-area');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const messageBox = document.getElementById('message-box');
const bins = document.querySelectorAll('.bin');
const resetButton = document.getElementById('reset-button');
const resetButtonEnd = document.getElementById('reset-button-end');
const gameEndScreen = document.getElementById('game-end-screen');
const endGameTitle = document.getElementById('end-game-title');
const endGameMessage = document.getElementById('end-game-message');
const starContainer = document.getElementById('star-container');
const accuracyDisplay = document.getElementById('accuracy-display');
const curiosityButton = document.getElementById('curiosity-button');
const curiosityModalOverlay = document.getElementById('curiosity-modal-overlay');
const modalCloseButton = document.getElementById('modal-close-button');
const loadingSpinner = document.getElementById('loading-spinner');
const curiosityText = document.getElementById('curiosity-text');

let score = 0;
let timeLeft = 60;
let timerInterval;
let currentTrash = null;
let activeTrashElement = null;
let gameActive = false;
let correctAttempts = 0;
let incorrectAttempts = 0;
let totalAttempts = 0;

let isTouchDragging = false;
let touchOffsetX = 0;
let touchOffsetY = 0;

let audioContextStarted = false;

const correctSound = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.05,
        release: 0.1
    }
}).toDestination();

const incorrectSound = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: {
        attack: 0.005,
        decay: 0.2,
        sustain: 0.01,
        release: 0.2
    }
}).toDestination();

const gameEndSound = new Tone.MembraneSynth().toDestination();

function startGame() {
    score = 0;
    timeLeft = 60;
    correctAttempts = 0;
    incorrectAttempts = 0;
    totalAttempts = 0;
    gameActive = true;

    scoreDisplay.textContent = score;
    updateTimerDisplay();
    hideEndGameScreen();
    hideCuriosityButton();
    hideCuriosityModal();
    generateNewTrash();
    showMessage('Arraste o lixo para a lixeira correta!', 'info');

    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function updateScore(points) {
    if (!gameActive) return;

    score += points;
    score = Math.max(0, score);
    scoreDisplay.textContent = score;
    scoreDisplay.classList.add('score-flash');
    setTimeout(() => {
        scoreDisplay.classList.remove('score-flash');
    }, 300);

    if (score >= 100) {
        score = 100;
        scoreDisplay.textContent = score;
        endGame('win');
    }
}

function updateTimer() {
    if (!gameActive) return;

    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 10) {
        timerDisplay.classList.add('text-red-500', 'font-bold');
    } else {
        timerDisplay.classList.remove('text-red-500', 'font-bold');
    }

    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (score < 100) {
            endGame('lose');
        }
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    messageBox.className = 'message-box w-full md:w-auto flex-grow';

    if (type === 'success') {
        messageBox.classList.add('bg-green-100', 'text-green-800', 'border-green-300');
        correctSound.triggerAttackRelease("C5", "8n", Tone.context.currentTime + 0.05);
        showCuriosityButton();
    } else if (type === 'error') {
        messageBox.classList.add('bg-red-100', 'text-red-800', 'border-red-300');
        incorrectSound.triggerAttackRelease("C3", "8n", Tone.context.currentTime + 0.05);
        hideCuriosityButton();
    } else {
        messageBox.classList.add('bg-blue-50', 'text-blue-800', 'border-blue-300');
        hideCuriosityButton();
    }
    messageBox.classList.add('message-pop');
    setTimeout(() => {
        messageBox.classList.remove('message-pop');
    }, 300);
}

function generateNewTrash() {
    if (!gameActive) return;
    if (activeTrashElement) {
        activeTrashElement.remove();
        activeTrashElement = null;
    }

    const randomIndex = Math.floor(Math.random() * trashTypes.length);
    currentTrash = trashTypes[randomIndex];
    activeTrashElement = document.createElement('div');
    activeTrashElement.classList.add(
        'draggable',
        'w-28', 'h-28', 'md:w-32', 'md:h-32',
        'bg-white', 'rounded-xl', 'shadow-md', 'flex', 'flex-col', 'items-center', 'justify-center',
        'text-center', 'p-2', 'text-gray-800', 'font-semibold', 'text-sm',
        'trash-spawn'
    );
    activeTrashElement.setAttribute('draggable', 'true');
    activeTrashElement.setAttribute('data-type', currentTrash.type);
    activeTrashElement.innerHTML = `
        <span class="text-4xl md:text-5xl mb-1">${currentTrash.emoji}</span>
        <span>${currentTrash.name}</span>
    `;

    trashArea.appendChild(activeTrashElement);

    activeTrashElement.addEventListener('touchstart', touchStart, { passive: false });
    activeTrashElement.addEventListener('touchmove', touchMove, { passive: false });
    activeTrashElement.addEventListener('touchend', touchEnd);

    showMessage('Arraste o lixo para a lixeira correta!', 'info');
}

function touchStart(e) {
    if (!audioContextStarted) {
        Tone.start();
        audioContextStarted = true;
    }

    if (!gameActive || e.touches.length !== 1) return;
    isTouchDragging = true;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = activeTrashElement.getBoundingClientRect();

    touchOffsetX = touch.clientX - rect.left;
    touchOffsetY = touch.clientY - rect.top;

    activeTrashElement.style.position = 'absolute';
    activeTrashElement.style.left = (rect.left) + 'px';
    activeTrashElement.style.top = (rect.top) + 'px';
    document.body.appendChild(activeTrashElement);

    activeTrashElement.classList.add('dragging', 'touch-dragging');
}

function touchMove(e) {
    if (!isTouchDragging || !gameActive || e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0];
    const newX = touch.clientX - touchOffsetX;
    const newY = touch.clientY - touchOffsetY;

    activeTrashElement.style.left = newX + 'px';
    activeTrashElement.style.top = newY + 'px';
}

function touchEnd(e) {
    if (!isTouchDragging || !gameActive) return;
    isTouchDragging = false;
    activeTrashElement.classList.remove('dragging', 'touch-dragging');

    const touch = e.changedTouches[0];
    checkDrop(touch.clientX, touch.clientY);

    if (activeTrashElement && activeTrashElement.parentNode === document.body) {
        activeTrashElement.remove();
        activeTrashElement = null;
    }
}

function checkDrop(dropX, dropY) {
    let droppedOnBin = false;
    bins.forEach(bin => {
        const rect = bin.getBoundingClientRect();
        if (dropX >= rect.left && dropX <= rect.right &&
            dropY >= rect.top && dropY <= rect.bottom) {
            
            bin.classList.remove('drag-over');
            const droppedTrashType = currentTrash.type;
            const acceptedBinType = bin.getAttribute('data-accepts');

            totalAttempts++;

            bin.classList.add('bin-feedback');
            setTimeout(() => {
                bin.classList.remove('bin-feedback');
            }, 300);

            if (droppedTrashType === acceptedBinType) {
                correctAttempts++;
                updateScore(10);
                showMessage('Correto! +10 pontos!', 'success');
            } else {
                incorrectAttempts++;
                updateScore(-5);
                showMessage('Incorreto! Tente novamente. -5 pontos.', 'error');
            }
            droppedOnBin = true;
        }
    });

    if (!droppedOnBin) {
        showMessage('O lixo não foi descartado em uma lixeira válida.', 'info');
    }

    if (gameActive) {
        generateNewTrash();
    }
}

function calculateStars() {
    if (totalAttempts === 0) return 0;
    const accuracy = (correctAttempts / totalAttempts) * 100;

    if (accuracy === 100) {
        return 3;
    } else if (accuracy >= 75) {
        return 2;
    } else if (accuracy >= 50) {
        return 1;
    } else {
        return 0;
    }
}

function displayStars(numStars) {
    let starsHtml = '';
    for (let i = 0; i < 3; i++) {
        if (i < numStars) {
            starsHtml += '⭐';
        } else {
            starsHtml += '☆';
        }
    }
    starContainer.innerHTML = starsHtml;
}

function endGame(status) {
    gameActive = false;
    clearInterval(timerInterval);
    trashArea.style.display = 'none';
    bins.forEach(bin => bin.style.display = 'none');
    hideCuriosityButton();
    if (activeTrashElement) {
        activeTrashElement.remove();
        activeTrashElement = null;
    }
    gameEndSound.triggerAttackRelease("C2", "2n");

    gameEndScreen.classList.add('active');
    starContainer.style.display = 'block';
    accuracyDisplay.style.display = 'block';

    gameEndScreen.classList.remove('win', 'lose');

    const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : 0;
    accuracyDisplay.textContent = `Acertos: ${correctAttempts} de ${totalAttempts} (${accuracy}%)`;

    if (status === 'win') {
        gameEndScreen.classList.add('win');
        endGameTitle.textContent = 'Parabéns! Você Venceu!';
        endGameMessage.textContent = 'Você é um verdadeiro Eco-Héroi!';
        const numStars = calculateStars();
        displayStars(numStars);
        showMessage('Vitória! Confira suas estrelas!', 'success');
    } else {
        gameEndScreen.classList.add('lose');
        endGameTitle.textContent = 'Tempo Esgotado!';
        endGameMessage.textContent = 'Sua pontuação final foi: ' + score + ' pontos. Vamos tentar de novo para melhorar sua classificação!';
        displayStars(calculateStars());
        showMessage('O tempo acabou. Tente novamente!', 'error');
    }
}

function hideEndGameScreen() {
    gameEndScreen.classList.remove('active');
    trashArea.style.display = 'flex';
    bins.forEach(bin => bin.style.display = 'grid');
    starContainer.innerHTML = '';
    accuracyDisplay.textContent = '';
}

function showCuriosityButton() {
    curiosityButton.classList.add('active');
}

function hideCuriosityButton() {
    curiosityButton.classList.remove('active');
}

function showCuriosityModal() {
    curiosityModalOverlay.classList.add('active');
}

function hideCuriosityModal() {
    curiosityModalOverlay.classList.remove('active');
    curiosityText.textContent = '';
}

function showLoadingSpinner() {
    loadingSpinner.classList.add('active');
    curiosityText.textContent = 'Gerando curiosidade...';
}

function hideLoadingSpinner() {
    loadingSpinner.classList.remove('active');
}

async function getEcoCuriosity() {
    if (!currentTrash || !currentTrash.name) {
        curiosityText.textContent = 'Nenhum item de lixo para gerar curiosidade no momento.';
        return;
    }

    showLoadingSpinner();
    showCuriosityModal();

    const trashTypeName = currentTrash.name;
    const trashTypeCategory = currentTrash.type;
    const prompt = `Gere uma curiosidade ecológica ou dica rápida e interessante sobre a reciclagem, descarte correto ou o impacto ambiental de "${trashTypeName}" (${trashTypeCategory}). Seja conciso (máximo 2-3 frases) e informativo.`;
    
    const apiKey = "AIzaSyAN0Wgeffv_KeE5qrntBs-5pco-GPSScfE"; 
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
        });

        if (!response.ok) 

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            curiosityText.textContent = text;
        } else {
            curiosityText.textContent = 'Não foi possível gerar uma curiosidade no momento. Tente novamente.';
            console.warn("Unexpected API response structure:", result);
        }
    } catch (error) 
    
    finally {
        hideLoadingSpinner();
    }
}

bins.forEach(bin => {
    bin.addEventListener('dragover', (e) => {
        if (!audioContextStarted) {
            Tone.start();
            audioContextStarted = true;
        }
        if (!gameActive) {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        bin.classList.add('drag-over');
    });

    bin.addEventListener('dragleave', () => {
        bins.forEach(b => b.classList.remove('drag-over'));
    });

    bin.addEventListener('drop', (e) => {
        e.preventDefault();
        bin.classList.remove('drag-over');

        if (!gameActive || !currentTrash || !activeTrashElement) return;

        const draggedDataType = activeTrashElement.getAttribute('data-type');
        if (draggedDataType !== currentTrash.type) {
            return;
        }

        activeTrashElement.classList.remove('dragging');

        const droppedTrashType = currentTrash.type;
        const acceptedBinType = bin.getAttribute('data-accepts');

        totalAttempts++;

        bin.classList.add('bin-feedback');
        setTimeout(() => {
            bin.classList.remove('bin-feedback');
        }, 300);

        if (droppedTrashType === acceptedBinType) {
            correctAttempts++;
            updateScore(10);
            showMessage('Correto! +10 pontos!', 'success');
        } else {
            incorrectAttempts++;
            updateScore(-5);
            showMessage('Incorreto! Tente novamente. -5 pontos.', 'error');
        }
        
        if (gameActive) {
            generateNewTrash();
        }
    });
});

trashArea.addEventListener('dragstart', (e) => {
    if (!audioContextStarted) {
        Tone.start();
        audioContextStarted = true;
    }
    if (!gameActive || !activeTrashElement || e.target !== activeTrashElement) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.setData('text/plain', e.target.getAttribute('data-type'));
    e.target.classList.add('dragging');
});

trashArea.addEventListener('dragend', (e) => {
    if (activeTrashElement) {
        activeTrashElement.classList.remove('dragging');
    }
});


curiosityButton.addEventListener('click', getEcoCuriosity);
modalCloseButton.addEventListener('click', hideCuriosityModal);
curiosityModalOverlay.addEventListener('click', (e) => {
    if (e.target === curiosityModalOverlay) {
        hideCuriosityModal();
    }
});

resetButton.addEventListener('click', startGame);
resetButtonEnd.addEventListener('click', startGame);

window.onload = () => {
    startGame();

};
