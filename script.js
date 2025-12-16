/* --- script.js --- */

/* =========================================================
   1. TRADUÇÃO DAS MENSAGENS DE VALIDAÇÃO HTML5
   ========================================================= */
// Pega referências aos campos de input
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Função didática para customizar a mensagem de validação
function setCustomValidationMessage(inputElement, requiredMessage, invalidMessage) {
    if (!inputElement) return; // Garante que o elemento existe

    // 1. Escuta o evento 'invalid' (disparado ao tentar submeter com erro)
    inputElement.addEventListener('invalid', function(e) {
        // A validação padrão é interrompida (para podermos colocar a nossa)
        e.preventDefault(); 
        
        // Se o campo estiver vazio (required)
        if (e.target.validity.valueMissing) {
            e.target.setCustomValidity(requiredMessage);
        } 
        // Se o campo for de tipo email/url e o formato estiver incorreto
        else if (e.target.validity.typeMismatch) {
            e.target.setCustomValidity(invalidMessage);
        } else {
            // Limpa qualquer erro se for outro tipo de validação
            e.target.setCustomValidity('');
        }
        
        // Re-exibe a mensagem customizada em português
        e.target.reportValidity(); 
    });

    // 2. Escuta o evento 'input' (quando o usuário digita) para limpar a mensagem customizada
    inputElement.addEventListener('input', function(e) {
        // É essencial limpar a mensagem customizada para que a validação funcione corretamente
        e.target.setCustomValidity('');
    });
}

// Aplica as mensagens customizadas para os dois campos
setCustomValidationMessage(
    emailInput, 
    'Por favor, preencha seu e-mail de acesso.', // Mensagem para campo vazio
    'Por favor, insira um endereço de e-mail válido.' // Mensagem para e-mail mal formatado
);

setCustomValidationMessage(
    passwordInput, 
    'A chave de acesso é obrigatória. Por favor, preencha este campo.', // Mensagem para campo vazio
    '' // Não aplicável ao tipo 'password'
);


/* =========================================================
   2. SCRIPT DE PARTÍCULAS (ANIMAÇÃO DE FUNDO)
   ========================================================= */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d'); // Contexto de desenho 2D

let particles = [];
const particleCount = 120; // Quantidade de bolinhas na tela

// Rastreamento do rato para interatividade
let mouse = { x: null, y: null, radius: 150 }

// Atualiza coordenadas do rato
window.addEventListener('mousemove', function(event) { mouse.x = event.x; mouse.y = event.y; });
// Remove coordenadas quando o rato sai da janela
window.addEventListener('mouseout', function() { mouse.x = undefined; mouse.y = undefined; });

// Ajusta o tamanho do canvas para caber na janela inteira
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// CLASSE QUE DEFINE CADA PARTÍCULA
class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;  // Posição aleatória X
        this.y = Math.random() * canvas.height; // Posição aleatória Y
        this.vx = (Math.random() - 0.5) * 1.5;  // Velocidade Horizontal (Direção aleatória)
        this.vy = (Math.random() - 0.5) * 1.5;  // Velocidade Vertical
        this.size = Math.random() * 2 + 1;      // Tamanho da bolinha
        
        // Paleta de cores Cyberpunk
        const colors = ['255, 255, 255', '0, 243, 255', '188, 19, 254'];
        this.colorBase = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random() * 0.8 + 0.2;
        this.density = (Math.random() * 30) + 1; // Peso da partícula para interação com rato
    }

    // Calcula a nova posição a cada frame
    update() {
        this.x += this.vx;
        this.y += this.vy;

        // --- Interação com o Rato (Física de repulsão) ---
        if (mouse.x != undefined) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx*dx + dy*dy); // Teorema de Pitágoras para distância

            if (distance < mouse.radius) {
                // Se o rato estiver perto, empurra a partícula
                const force = (mouse.radius - distance) / mouse.radius;
                const directionX = (dx / distance) * force * this.density;
                const directionY = (dy / distance) * force * this.density;
                this.x -= directionX;
                this.y -= directionY;
            }
        }

        // --- Colisão com as bordas da tela ---
        // Se bater na borda, inverte a velocidade (efeito de bater e voltar)
        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
    }

    // Desenha a bolinha na tela
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.colorBase}, ${this.opacity})`;
        ctx.shadowBlur = 10; // Efeito de brilho (neon)
        ctx.shadowColor = `rgba(${this.colorBase}, 1)`;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Cria as partículas iniciais
for (let i = 0; i < particleCount; i++) { particles.push(new Particle()); }

// Loop de animação (roda aprox. 60 vezes por segundo)
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o quadro anterior
    
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    // --- Desenha as linhas de conexão (Rede Neural) ---
    for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
            // Calcula distância entre duas partículas
            let dx = particles[a].x - particles[b].x;
            let dy = particles[a].y - particles[b].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            // Se estiverem perto, desenha uma linha entre elas
            if (distance < 100) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(0, 243, 255, ${0.15 - distance/1000})`; // Linha desvanece com a distância
                ctx.lineWidth = 0.5;
                ctx.moveTo(particles[a].x, particles[a].y);
                ctx.lineTo(particles[b].x, particles[b].y);
                ctx.stroke();
            }
        }
        
        // Conexão extra com o rato
        if (mouse.x != undefined) {
            let dx = particles[a].x - mouse.x;
            let dy = particles[a].y - mouse.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(188, 19, 254, ${0.2})`; 
                ctx.lineWidth = 1;
                ctx.moveTo(particles[a].x, particles[a].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animate); // Chama o próximo frame
}
animate();


/* =========================================================
   3. SCRIPT DE LOGIN E COMUNICAÇÃO (FETCH / DEVICE ID)
   ========================================================= */
const n8nWebhookURL = 'https://tella-n8n.o40vmn.easypanel.host/webhook/login-auth'; 

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    // É importante não usar e.preventDefault() aqui se quisermos que a validação HTML5
    // com as mensagens em português ocorra antes.
    
    // Contudo, como estamos usando setCustomValidity + reportValidity acima,
    // o preventDefault() pode ficar aqui para garantir que o fetch só ocorra se válido.
    e.preventDefault(); 
    
    // Verificação adicional para garantir que não prossegue se a validação customizada falhar
    if (!e.target.checkValidity()) {
        // Se houver erros de validação, a função reportValidity() já terá exibido a mensagem em português.
        return; 
    }

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnSubmit');
    const errorMsg = document.getElementById('errorMessage');

    // --- NOVA LÓGICA DE DEVICE ID ---
    // Tenta recuperar o ID salvo no navegador
    let deviceId = localStorage.getItem('tella_device_id');
    
    // Se não existir (primeiro acesso neste navegador), cria um novo
    if (!deviceId) {
        // Gera um ID aleatório (ex: dev_a1b2c3d4_17000000)
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        // Salva para os próximos logins
        localStorage.setItem('tella_device_id', deviceId);
    }
    // --------------------------------

    const originalText = btn.innerText;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> PROCESSANDO DADOS...';
    btn.disabled = true;
    errorMsg.style.display = 'none';

    try {
        const response = await fetch(n8nWebhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                password: password,
                deviceId: deviceId // <-- Enviando o ID do dispositivo
            })
        });

        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
            throw new Error('Falha na comunicação com o servidor neural.');
        }

        if (response.ok && result.auth === true) {
            localStorage.setItem('balconista_logado', 'true');
            localStorage.setItem('balconista_email', email);
            if(result.nome) localStorage.setItem('balconista_nome', result.nome);
            
            btn.style.background = '#00ff88';
            btn.innerText = 'ACESSO PERMITIDO';
            
            setTimeout(() => {
                window.location.href = '/chat/'; 
            }, 500);
        } else {
            // Usa a mensagem de erro vinda do n8n (ex: Limite atingido) ou uma genérica
            throw new Error(result.message || 'Credenciais inválidas. Acesso negado.');
        }

    } catch (error) {
        btn.innerHTML = originalText;
        btn.style.background = '';
        btn.disabled = false;
        errorMsg.innerText = 'ERRO: ' + error.message;
        errorMsg.style.display = 'block';
    }
});
/* --- PWA INSTALLATION LOGIC --- */
let deferredPrompt;
const installContainer = document.getElementById('installContainer');
const btnInstall = document.getElementById('btnInstall');

// 1. Registar o Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registado!', reg))
            .catch(err => console.log('SW falhou:', err));
    });
}

// 2. Capturar o evento de instalação (Só funciona em Chrome/Android/Desktop Edge)
window.addEventListener('beforeinstallprompt', (e) => {
    // Impede o navegador de mostrar a barrinha padrão feia
    e.preventDefault();
    // Guarda o evento para usarmos quando o utilizador clicar no botão
    deferredPrompt = e;
    
    // Mostra o nosso botão personalizado
    installContainer.style.display = 'block';
});

// 3. Ação do Botão
btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    // Mostra o prompt nativo
    deferredPrompt.prompt();
    
    // Espera pela escolha do utilizador
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // Limpa a variável, pois o prompt só pode ser usado uma vez
    deferredPrompt = null;
    
    // Esconde o botão após a escolha (opcional, ou podes deixar até recarregar)
    installContainer.style.display = 'none';
});

// 4. Detetar se já foi instalado (Para esconder o botão se o utilizador abrir via App)
window.addEventListener('appinstalled', () => {
    installContainer.style.display = 'none';
    deferredPrompt = null;
    console.log('PWA was installed');
});