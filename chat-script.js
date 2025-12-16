/* --- chat-script.js (VERSÃO FINAL: CORREÇÃO DE FORMATAÇÃO E CAMINHOS) --- */

/* --- 1. VERIFICAÇÃO DE SEGURANÇA --- */
if (!localStorage.getItem('balconista_logado')) {
    // AJUSTE: Volta uma pasta para achar o login
    window.location.href = '../index.html'; 
}

/* --- 2. CONFIGURAÇÃO INICIAL DO USUÁRIO --- */
const savedName = localStorage.getItem('balconista_nome');
if(savedName) {
    const displayNome = document.getElementById('displayNome');
    if(displayNome) displayNome.textContent = savedName.toUpperCase();
}

/* --- LOGOUT --- */
const btnLogout = document.getElementById('btnLogout');
if(btnLogout) {
    btnLogout.addEventListener('click', function() {
        localStorage.removeItem('balconista_logado');
        localStorage.removeItem('balconista_nome');
        localStorage.removeItem('balconista_email');
        localStorage.removeItem('tella_chat_session_id'); 
        // AJUSTE: Redireciona para o login corretamente
        window.location.href = '../index.html';
    });
}

/* --- 3. PARTÍCULAS --- */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
const particleCount = 100;
let mouse = { x: null, y: null, radius: 150 };

window.addEventListener('mousemove', function(event) { mouse.x = event.x; mouse.y = event.y; });
window.addEventListener('mouseout', function() { mouse.x = undefined; mouse.y = undefined; });

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.size = Math.random() * 2 + 1;
        const colors = ['255, 255, 255', '0, 243, 255', '188, 19, 254'];
        this.colorBase = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random() * 0.5 + 0.1; 
        this.density = (Math.random() * 30) + 1;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if (mouse.x != undefined) {
            let dx = mouse.x - this.x; let dy = mouse.y - this.y; let distance = Math.sqrt(dx*dx + dy*dy);
            if (distance < mouse.radius) {
                const force = (mouse.radius - distance) / mouse.radius;
                const directionX = (dx / distance) * force * this.density;
                const directionY = (dy / distance) * force * this.density;
                this.x -= directionX; this.y -= directionY;
            }
        }
        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
    }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.colorBase}, ${this.opacity})`;
        ctx.shadowBlur = 5; ctx.shadowColor = `rgba(${this.colorBase}, 1)`;
        ctx.fill(); ctx.shadowBlur = 0;
    }
}
for (let i = 0; i < particleCount; i++) { particles.push(new Particle()); }
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
            let dx = particles[a].x - particles[b].x; let dy = particles[a].y - particles[b].y;
            let distance = Math.sqrt(dx*dx + dy*dy);
            if (distance < 100) {
                ctx.beginPath(); ctx.strokeStyle = `rgba(0, 243, 255, ${0.1 - distance/1000})`;
                ctx.lineWidth = 0.5; ctx.moveTo(particles[a].x, particles[a].y); ctx.lineTo(particles[b].x, particles[b].y); ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animate);
}
animate();

/* --- 4. LÓGICA DO CHATBOT --- */
const WEBHOOK_URL = "https://tella-n8n.o40vmn.easypanel.host/webhook/74f5eb0b-4919-4bc3-99fb-5d9fce85ff9f/chat"; 

const form = document.getElementById("tella-form");
const input = document.getElementById("tella-input");
const chatLog = document.getElementById("tella-chat-log");
const sendBtn = document.getElementById("tella-send");
const clearBtn = document.getElementById("tella-clear");
const uploadBtn = document.getElementById("tella-upload");
const fileInput = document.getElementById("tella-file-input");

let attachedImageBase64 = null;
let attachedImageName = null;
const MAX_IMAGE_SIZE_MB = 5; 

function getSessionId() {
    const userEmail = localStorage.getItem('balconista_email') || 'anonimo';
    let sessionId = localStorage.getItem('tella_chat_session_id');
    if (!sessionId) {
        sessionId = userEmail + '_' + Date.now().toString(36);
        localStorage.setItem('tella_chat_session_id', sessionId);
    }
    return sessionId;
}
const currentSessionId = getSessionId();

/* --- FUNÇÕES DE DISPLAY --- */
function addMessage(text, role) {
    const wrapper = document.createElement("div");
    wrapper.className = "tella-message tella-" + role;
    if(role === 'bot') text = "<strong>IA:</strong> " + text;
    wrapper.innerHTML = text;
    chatLog.appendChild(wrapper);
    chatLog.scrollTop = chatLog.scrollHeight;
}

function addImageMessage(base64Data, role, name) {
    const imgWrapper = document.createElement("div");
    imgWrapper.className = `tella-message tella-${role} image-message`;
    const img = document.createElement("img");
    img.src = `data:image/jpeg;base64,${base64Data}`; 
    imgWrapper.appendChild(img);
    chatLog.appendChild(imgWrapper);
    chatLog.scrollTop = chatLog.scrollHeight;
}

function addSystem(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "tella-system";
    wrapper.innerHTML = `<i class="fas fa-microchip"></i> ${text}`;
    chatLog.appendChild(wrapper);
    chatLog.scrollTop = chatLog.scrollHeight;
    return wrapper;
}

function addWarning(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "tella-warning"; 
    wrapper.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${text}`;
    chatLog.appendChild(wrapper);
    chatLog.scrollTop = chatLog.scrollHeight;
}

/* --- FUNÇÃO DE DIGITAÇÃO CORRIGIDA (DOM WALKER) --- */
function typeMessageHTML(html, role) {
    const wrapper = document.createElement("div");
    wrapper.className = "tella-message tella-" + role;
    chatLog.appendChild(wrapper);

    // Se for usuário, exibe direto
    if (role === 'user') {
        wrapper.innerHTML = html;
        chatLog.scrollTop = chatLog.scrollHeight;
        return;
    }

    // Configuração do Bot
    wrapper.innerHTML = "<strong>IA:</strong> ";
    const contentContainer = document.createElement('span');
    wrapper.appendChild(contentContainer);

    // 1. Cria elementos reais na memória (invisíveis)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 2. Função Recursiva para Digitação
    async function typeNode(sourceNode, targetNode) {
        // Caso A: Nó de TEXTO
        if (sourceNode.nodeType === Node.TEXT_NODE) {
            const textContent = sourceNode.textContent;
            const textNode = document.createTextNode('');
            targetNode.appendChild(textNode);

            for (let i = 0; i < textContent.length; i++) {
                textNode.textContent += textContent[i];
                
                // Scroll automático
                const distanceToBottom = chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight;
                if (distanceToBottom < 100) chatLog.scrollTop = chatLog.scrollHeight;

                await new Promise(resolve => setTimeout(resolve, 5)); // Velocidade
            }
        } 
        // Caso B: ELEMENTO HTML (b, strong, ul, li, etc)
        else if (sourceNode.nodeType === Node.ELEMENT_NODE) {
            const newElement = document.createElement(sourceNode.tagName);
            
            // Copia atributos (classes, styles)
            Array.from(sourceNode.attributes).forEach(attr => {
                newElement.setAttribute(attr.name, attr.value);
            });

            targetNode.appendChild(newElement);

            // Se for tag sem conteúdo (img, hr, br), não espera
            if (['BR', 'HR', 'IMG'].includes(sourceNode.tagName)) {
                // Passa direto
            } 
            
            // Entra nos filhos (recursão)
            for (let i = 0; i < sourceNode.childNodes.length; i++) {
                await typeNode(sourceNode.childNodes[i], newElement);
            }
        }
    }

    // Inicia o processo
    (async () => {
        for (let i = 0; i < tempDiv.childNodes.length; i++) {
            await typeNode(tempDiv.childNodes[i], contentContainer);
        }
    })();
}

/* --- EVENT LISTENERS --- */
uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) { alert(`Erro: Máximo ${MAX_IMAGE_SIZE_MB}MB.`); fileInput.value = ''; return; }
    const reader = new FileReader();
    reader.onloadend = function() {
        attachedImageBase64 = reader.result.split(',')[1]; 
        attachedImageName = file.name;
        addSystem(`ANEXADO: ${attachedImageName}`);
        addWarning("FERRAMENTA AUXILIAR: NÃO DISPENSE SEM CONFERIR A RECEITA ORIGINAL. A IA PODE COMETER ERROS.");
        uploadBtn.classList.add('attached');
    };
    reader.readAsDataURL(file); 
});

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const question = input.value.trim();
    if (!question && !attachedImageBase64) return;

    if (question) {
        const wrapper = document.createElement("div");
        wrapper.className = "tella-message tella-user";
        wrapper.textContent = question;
        chatLog.appendChild(wrapper);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    if (attachedImageBase64) {
        addImageMessage(attachedImageBase64, "user", attachedImageName);
        addSystem(`ENVIANDO PACOTE...`);
    }

    input.value = ""; input.focus(); sendBtn.disabled = true; sendBtn.innerText = "...";
    let loadingMessage = addSystem("PROCESSANDO...");

    try {
        const bodyPayload = {
            chatInput: question,
            imageBase64: attachedImageBase64, 
            imageName: attachedImageName,
            sessionId: currentSessionId,
            userEmail: localStorage.getItem('balconista_email'),
            userName: localStorage.getItem('balconista_nome')
        };
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyPayload),
        });
        
        // LIMPEZA
        attachedImageBase64 = null; 
        attachedImageName = null; 
        uploadBtn.classList.remove('attached');
        fileInput.value = ""; 
        
        if (loadingMessage) loadingMessage.remove(); 

        let payload;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await response.json();
            payload = data.html || data.message || data.text || data.output || JSON.stringify(data); 
        } else { payload = await response.text(); }

        if (!response.ok) addSystem(`ERRO ${response.status}`);
        else typeMessageHTML(payload, "bot"); 
    } catch (error) { addSystem("SEM CONEXÃO."); } finally { sendBtn.disabled = false; sendBtn.innerText = "ENVIAR"; }
});

clearBtn.addEventListener("click", function () {
    chatLog.innerHTML = ""; 
    attachedImageBase64 = null; 
    uploadBtn.classList.remove('attached');
    fileInput.value = ""; 
    
    const startMsg = document.createElement("div");
    startMsg.className = "tella-message tella-bot";
    startMsg.innerHTML = "<strong>SISTEMA:</strong> Terminal limpo.";
    chatLog.appendChild(startMsg);
});