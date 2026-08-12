import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Trash2, Camera, Power } from 'lucide-react';
import ParticleBackground from '../../components/ParticleBackground';
import { useAuth } from '../../contexts/AuthContext';
import './chat.css';

const WEBHOOK_URL = 'https://chat-n8n-main.wcvao0.easypanel.host/webhook/74f5eb0b-4919-4bc3-99fb-5d9fce85ff9f/chat';
const MAX_IMAGE_SIZE_MB = 5;

type LogEntry =
  | { id: number; kind: 'user'; text: string }
  | { id: number; kind: 'image'; base64: string }
  | { id: number; kind: 'system'; text: string }
  | { id: number; kind: 'warning'; text: string }
  | { id: number; kind: 'bot'; html: string };

let nextId = 1;

/** Anima o HTML de resposta da IA nó a nó, caractere a caractere — portado de chat-script.js. */
function BotMessage({ html, scrollContainer }: { html: string; scrollContainer: () => HTMLElement | null }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const target = containerRef.current;
    if (!target) return;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Guarda o scrollTop que NÓS mesmos escrevemos por último. Comparar
    // com o valor atual do DOM a cada tick (em vez de confiar num evento
    // "scroll" assíncrono) evita a corrida: o evento pode chegar depois
    // do próximo tick de 5ms, e aí o loop forçava o scroll de volta pro
    // fim antes mesmo de perceber que o usuário tinha acabado de rolar
    // pra cima. Sem margem de "perto do fim" aqui de propósito — uma
    // margem tipo "<80px volta sozinho" competia bem no início do gesto
    // de rolar (o conteúdo cresce a cada 5ms, então mesmo parado o
    // usuário "entra" nessa margem), causando o efeito ímã. Uma vez que
    // o usuário mexe no scroll, fica destravado até a mensagem terminar.
    let lastSetScrollTop = scrollContainer()?.scrollTop ?? 0;

    function maybeStickToBottom() {
      const log = scrollContainer();
      if (!log) return;
      const untouchedSinceOurLastWrite = Math.abs(log.scrollTop - lastSetScrollTop) < 2;
      if (untouchedSinceOurLastWrite) {
        log.scrollTop = log.scrollHeight;
        lastSetScrollTop = log.scrollTop;
      }
    }

    async function typeNode(sourceNode: ChildNode, targetNode: Node) {
      if (sourceNode.nodeType === Node.TEXT_NODE) {
        const textContent = sourceNode.textContent ?? '';
        const textNode = document.createTextNode('');
        targetNode.appendChild(textNode);

        for (let i = 0; i < textContent.length; i++) {
          textNode.textContent += textContent[i];
          maybeStickToBottom();
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      } else if (sourceNode.nodeType === Node.ELEMENT_NODE) {
        const el = sourceNode as Element;
        const newElement = document.createElement(el.tagName);
        Array.from(el.attributes).forEach((attr) => newElement.setAttribute(attr.name, attr.value));
        targetNode.appendChild(newElement);
        for (let i = 0; i < el.childNodes.length; i++) {
          await typeNode(el.childNodes[i], newElement);
        }
      }
    }

    (async () => {
      for (let i = 0; i < tempDiv.childNodes.length; i++) {
        await typeNode(tempDiv.childNodes[i], target);
      }
    })();
  }, [html, scrollContainer]);

  return (
    <div className="tecvancel-message tecvancel-bot">
      <strong>IA:</strong> <span ref={containerRef} />
    </div>
  );
}

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [entries, setEntries] = useState<LogEntry[]>([
    { id: nextId++, kind: 'bot', html: 'Terminal online. Aguardando imagem ou comando...' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ base64: string; name: string } | null>(null);

  const chatLogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fica "grudado" no fim enquanto o usuário não rolar pra cima de propósito;
  // some assim que ele sai da zona perto do fim, e só volta quando ele
  // mesmo rolar de volta pro fim (ou mandar uma mensagem nova).
  const stickToBottomRef = useRef(true);

  const displayName = user?.organization?.name?.toUpperCase() || 'OPERADOR';

  function scrollToBottom() {
    const el = chatLogRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  useEffect(() => {
    const el = chatLogRef.current;
    if (!el) return;
    function handleScroll() {
      const distanceToBottom = el!.scrollHeight - el!.scrollTop - el!.clientHeight;
      stickToBottomRef.current = distanceToBottom < 80;
    }
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current) scrollToBottom();
  }, [entries]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      alert(`Erro: Máximo ${MAX_IMAGE_SIZE_MB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setAttachedImage({ base64, name: file.name });
      setEntries((prev) => [
        ...prev,
        { id: nextId++, kind: 'system', text: `ANEXADO: ${file.name}` },
        {
          id: nextId++,
          kind: 'warning',
          text: 'FERRAMENTA AUXILIAR: NÃO DISPENSE SEM CONFERIR A RECEITA ORIGINAL. A IA PODE COMETER ERROS.',
        },
      ]);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question && !attachedImage) return;

    stickToBottomRef.current = true;

    const newEntries: LogEntry[] = [];
    if (question) newEntries.push({ id: nextId++, kind: 'user', text: question });
    if (attachedImage) {
      newEntries.push({ id: nextId++, kind: 'image', base64: attachedImage.base64 });
      newEntries.push({ id: nextId++, kind: 'system', text: 'ENVIANDO PACOTE...' });
    }
    const loadingId = nextId++;
    newEntries.push({ id: loadingId, kind: 'system', text: 'PROCESSANDO...' });
    setEntries((prev) => [...prev, ...newEntries]);

    setInput('');
    setSending(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatInput: question,
          imageBase64: attachedImage?.base64 ?? null,
          imageName: attachedImage?.name ?? null,
          sessionId: user?.id,
          userEmail: user?.email,
          userName: user?.organization?.name,
        }),
      });

      setAttachedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      let payload: string;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        payload = data.html || data.message || data.text || data.output || JSON.stringify(data);
      } else {
        payload = await response.text();
      }

      setEntries((prev) => {
        const withoutLoading = prev.filter((entry) => entry.id !== loadingId);
        if (!response.ok) {
          return [...withoutLoading, { id: nextId++, kind: 'system', text: `ERRO ${response.status}` }];
        }
        return [...withoutLoading, { id: nextId++, kind: 'bot', html: payload }];
      });
    } catch {
      setEntries((prev) => [
        ...prev.filter((entry) => entry.id !== loadingId),
        { id: nextId++, kind: 'system', text: 'SEM CONEXÃO.' },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleClear() {
    setEntries([{ id: nextId++, kind: 'bot', html: '<strong>SISTEMA:</strong> Terminal limpo.' }]);
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="chat-page">
      <ParticleBackground count={100} />

      <div className="hud-header">
        <div className="brand-logo">
          BALCONISTA <span>PRO IA</span>
        </div>
        <div className="user-status">
          <span>{displayName}</span>
          <button className="btn-logout" onClick={() => logout()}>
            <Power className="w-3.5 h-3.5 inline mr-1" /> SAIR
          </button>
        </div>
      </div>

      <div className="terminal-container">
        <div id="tecvancel-chat-log" ref={chatLogRef}>
          {entries.map((entry) => {
            switch (entry.kind) {
              case 'user':
                return (
                  <div key={entry.id} className="tecvancel-message tecvancel-user">
                    {entry.text}
                  </div>
                );
              case 'image':
                return (
                  <div key={entry.id} className="tecvancel-message tecvancel-user image-message">
                    <img src={`data:image/jpeg;base64,${entry.base64}`} alt="Anexo" />
                  </div>
                );
              case 'system':
                return (
                  <div key={entry.id} className="tecvancel-system">
                    <i className="fas fa-microchip" /> {entry.text}
                  </div>
                );
              case 'warning':
                return (
                  <div key={entry.id} className="tecvancel-warning">
                    <i className="fas fa-exclamation-triangle" /> {entry.text}
                  </div>
                );
              case 'bot':
                return <BotMessage key={entry.id} html={entry.html} scrollContainer={() => chatLogRef.current} />;
            }
          })}
        </div>

        <form className="command-area" onSubmit={handleSubmit}>
          <button type="button" className="btn-action" title="Limpar" onClick={handleClear}>
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={`btn-action${attachedImage ? ' attached' : ''}`}
            title="Anexar Foto"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            type="file"
            id="tecvancel-file-input"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div className="input-wrapper">
            <input
              type="text"
              id="tecvancel-input"
              placeholder="Digite sua dúvida..."
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          <button type="submit" id="tecvancel-send" className="btn-action" disabled={sending}>
            {sending ? '...' : 'ENVIAR'}
          </button>
        </form>
      </div>
    </div>
  );
}
