/**
 * ============================================================================
 * ESBOÇO DE PREGAÇÕES - PÚLPITO & HOMILÉTICA
 * Lógica do Cliente (PWA, Local-first, Sincronização, Modo Púlpito e Cronômetro)
 * ============================================================================
 */

(function () {
  'use strict';

  // Chaves de armazenamento local e estado da aplicação
  const STORAGE_KEY = 'esboco_pregacoes_store_v1';
  const API_ENDPOINT = '/api/sermons';

  let sermons = [];
  let currentSermonId = null;
  let saveDebounceTimer = null;
  let activeFilter = 'all';
  let searchTerm = '';

  // Estado do Modo Púlpito e Cronômetro
  let timerInterval = null;
  let timerSeconds = 0;
  let isTimerRunning = false;
  let pulpitFontSize = 24;
  let pulpitClockInterval = null;

  // Modelos Homiléticos Pré-configurados
  const TEMPLATES = {
    expositivo: {
      title: 'O Propósito Eterno de Deus',
      theme: 'A soberania e a certeza da salvação para os que amam a Deus',
      passage: 'Romanos 8:28-30',
      passage_text: '28 E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados por seu decreto.\n29 Porque os que dantes conheceu, também os predestinou para serem conformes à imagem de seu Filho, a fim de que ele seja o primogênito entre muitos irmãos.\n30 E aos que predestinou, a estes também chamou; e aos que chamou, a estes também justificou; e aos que justificou, a estes também glorificou.',
      sermon_type: 'expositivo',
      series: 'Inabaláveis na Fé',
      status: 'pronto',
      introduction: '1. Gancho: Diante do sofrimento e das incertezas da vida, onde repousa nossa esperança?\n2. Contexto: Paulo escreve à igreja em Roma lembrando que as aflições presentes não se comparam à glória futura.\n3. Tese: Tudo na vida do crente é orquestrado pela providência divina para o bem final e conformidade com Cristo.',
      topics: [
        {
          title: '1. A Providência Soberana de Deus',
          passage: 'Romanos 8:28',
          passage_text: 'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.',
          explanation: 'Deus age ativamente em todas as coisas, não de forma passiva. Isso inclui tanto as alegrias quanto as tribulações.',
          illustration: 'Como uma tapeçaria vista pelo avesso: cheia de nós e fios soltos, mas vista por cima revela uma obra-prima perfeita.',
          application: 'Descanse seu coração hoje. Deus não perdeu o controle das áreas mais difíceis da sua vida.'
        },
        {
          title: '2. A Corrente de Ouro da Redenção',
          passage: 'Romanos 8:29-30',
          passage_text: 'Porque os que dantes conheceu, também os predestinou para serem conformes à imagem de seu Filho... e aos que justificou, a estes também glorificou.',
          explanation: 'Conheceu, predestinou, chamou, justificou e glorificou. Cada elo foi forjado na eternidade pelo próprio Deus.',
          illustration: 'Uma âncora lançada no próprio céu: o navio pode balançar na tempestade, mas a âncora não se solta.',
          application: 'Sua segurança espiritual não se apoia no seu humor ou sentimentos passageiros, mas na fidelidade dAquele que te chamou.'
        }
      ],
      conclusion: '1. Recapitulação: Vimos que Deus comanda todas as circunstâncias e nos garante a vitória final.\n2. Desafio: Nesta semana, quando a ansiedade surgir, declare Romanos 8:28.\n3. Oração: Clamor por fortalecimento e perseverança na soberania do Pai.'
    },
    tematico: {
      title: 'Vencendo a Ansiedade com Fé',
      theme: 'Como desfrutar da paz de Deus em tempos de pressões diárias',
      passage: 'Filipenses 4:4-7',
      passage_text: '4 Alegrai-vos sempre no Senhor; outra vez digo: alegrai-vos.\n5 Seja a vossa moderação conhecida de todos os homens. Perto está o Senhor.\n6 Não estejais inquietos por coisa alguma; antes, as vossas petições sejam em tudo conhecidas diante de Deus, pela oração e súplicas, com ação de graças.\n7 E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus.',
      sermon_type: 'tematico',
      series: 'Saúde Emocional & Vida Cristã',
      status: 'pronto',
      introduction: '1. Gancho: A ansiedade tem sido chamada de mal do século XXI. Como o Evangelho responde às nossas noites em claro?\n2. Contexto: Paulo escreveu da prisão, mas fala mais de alegria do que qualquer outra carta.\n3. Proposição: A paz de Deus não depende da ausência de problemas, mas da presença de Cristo.',
      topics: [
        {
          title: '1. O Antídoto da Oração Específica',
          passage: 'Filipenses 4:6',
          passage_text: 'Não estejais inquietos por coisa alguma; antes, as vossas petições sejam em tudo conhecidas diante de Deus, pela oração e súplicas, com ação de graças.',
          explanation: 'Substitua a preocupação estéril pela súplica com ações de graças. Entregue cada detalhe a Deus.',
          illustration: 'Transferir a carga pesada de uma mochila para as mãos de um guia confiável na subida da montanha.',
          application: 'Faça hoje uma lista dos seus medos e transforme cada item em uma oração entregue nas mãos do Senhor.'
        },
        {
          title: '2. A Guarda da Mente e do Coração',
          passage: 'Filipenses 4:7-8',
          passage_text: 'E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus.',
          explanation: 'A paz de Deus atua como uma sentinela militar protegendo nossa mente de pensamentos destrutivos.',
          illustration: 'Um filtro de água pura que barra as impurezas antes que cheguem ao copo.',
          application: 'O que você tem consumido nas redes sociais e notícias? Alimente sua mente com o que é puro, justo e amável.'
        }
      ],
      conclusion: '1. Recapitulação: Oração em vez de inquietação, mente renovada e a presença do Deus de paz.\n2. Convite: Venha ao altar entregar suas aflições a Cristo.\n3. Oração de paz e libertação de todo peso emocional.'
    },
    textual: {
      title: 'O Caminho, a Verdade e a Vida',
      theme: 'A exclusividade e suficiência de Cristo Jesus',
      passage: 'João 14:6',
      passage_text: 'Disse-lhe Jesus: Eu sou o caminho, e a verdade, e a vida. Ninguém vem ao Pai senão por mim.',
      sermon_type: 'textual',
      series: 'Conhecendo a Jesus',
      status: 'pronto',
      introduction: '1. Gancho: Há muitos caminhos propostos pela sabedoria humana. Mas existe apenas um caminho que reconcilia o homem com Deus.\n2. Contexto: A despedida de Jesus no cenáculo antes da cruz.\n3. Tese: Jesus é a única resposta plenamente suficiente para as três maiores buscas da alma humana.',
      topics: [
        {
          title: '1. Ele é o Caminho (Direção para a alma)',
          passage: 'João 14:6a',
          passage_text: 'Eu sou o caminho...',
          explanation: 'Ele não apenas ensina o caminho; Ele é a própria ponte entre o céu e a terra.',
          illustration: 'Um mapa pode te mostrar a estrada, mas um amigo que te carrega no colo te leva com segurança até a casa.',
          application: 'Pare de tentar construir caminhos próprios de mérito humano. Confie somente na obra da cruz.'
        },
        {
          title: '2. Ele é a Verdade (Certeza em um mundo de mentiras)',
          passage: 'João 14:6b',
          passage_text: '...e a verdade...',
          explanation: 'A verdade não é apenas um conceito abstrato, é uma Pessoa viva que nos liberta.',
          illustration: 'A luz de um farol que dissipa o nevoeiro no mar revolto.',
          application: 'Firme suas decisões diárias na Palavra infalível de Deus, não nas opiniões mutáveis da cultura.'
        },
        {
          title: '3. Ele é a Vida (Esperança além da morte)',
          passage: 'João 14:6c',
          passage_text: '...e a vida. Ninguém vem ao Pai senão por mim.',
          explanation: 'Vida abundante no presente e vida eterna na consumação.',
          illustration: 'A seiva da videira que dá vida permanente aos ramos secos.',
          application: 'Receba hoje o sopro da vida de Deus sobre os seus sonhos e sobre a sua família.'
        }
      ],
      conclusion: '1. Recapitulação: Em Jesus encontramos o único Caminho, a única Verdade e a única Vida.\n2. Apelo evangelístico: Entregue sua vida ao Senhor agora mesmo.'
    }
  };

  /**
   * Sanitização de texto contra XSS
   */
  function sanitize(str) {
    if (!str) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return String(str).replace(/[&<>"'/]/g, (s) => map[s]);
  }

  /**
   * Notificação Toast
   */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Atualiza o indicador de salvamento
   */
  function updateSaveStatus(status, text) {
    const dot = document.getElementById('saveStatusDot');
    const label = document.getElementById('saveStatusText');
    if (!dot || !label) return;

    if (status === 'saving') {
      dot.style.background = 'var(--warning)';
      label.textContent = 'Salvando...';
    } else if (status === 'saved') {
      dot.style.background = 'var(--success)';
      label.textContent = text || 'Salvo com sucesso';
    } else if (status === 'error') {
      dot.style.background = 'var(--danger)';
      label.textContent = text || 'Erro ao sincronizar';
    }
  }

  /**
   * Gera UUID v4 seguro
   */
  function generateUUID() {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'sermon-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  }

  const THEME_KEY = 'esboco_app_theme';

  /**
   * Aplica o tema visual (light ou dark)
   */
  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#141414' : '#f7f7f5');
    }

    const iconSun = document.getElementById('themeIconSun');
    const iconMoon = document.getElementById('themeIconMoon');
    if (iconSun && iconMoon) {
      if (isDark) {
        iconSun.classList.remove('hidden');
        iconMoon.classList.add('hidden');
      } else {
        iconSun.classList.add('hidden');
        iconMoon.classList.remove('hidden');
      }
    }

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }

  /**
   * Alterna entre modo claro e escuro
   */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(next === 'dark' ? 'Modo Escuro ativado' : 'Modo Claro ativado');
  }

  /**
   * Inicializa o tema com base no LocalStorage ou preferência do sistema
   */
  function initTheme() {
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem(THEME_KEY);
    } catch (e) {}

    if (savedTheme === 'dark' || savedTheme === 'light') {
      applyTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }

    // Monitora mudança na preferência do sistema se não houver preferência forçada
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        let currentStored = null;
        try {
          currentStored = localStorage.getItem(THEME_KEY);
        } catch (err) {}
        if (!currentStored) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /**
   * Inicialização e carregamento dos dados
   */
  function initApp() {
    initTheme();
    loadLocalSermons();
    setupEventListeners();
    registerServiceWorker();

    // Se não houver nenhum sermão, criar um exemplo com o template expositivo
    if (sermons.length === 0) {
      createNewSermon(TEMPLATES.expositivo);
    } else {
      selectSermon(sermons[0].id);
    }

    // Tentar sincronizar com a API do servidor se estiver rodando
    syncWithBackend();
  }

  /**
   * Registra Service Worker para PWA
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          reg.update();
        }).catch(() => {});
      });
    }
  }

  /**
   * Carrega sermões do LocalStorage
   */
  function loadLocalSermons() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Purga automaticamente registros de teste de penetração do armazenamento local
          const cleaned = parsed.filter((s) => {
            if (!s || !s.title) return false;
            const t = String(s.title).toLowerCase();
            return !t.includes('<script>') && !t.includes('alert(') && !t.includes('mensagem teste');
          });

          sermons = cleaned;
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          }
        }
      }
    } catch (e) {
      console.error('Erro ao ler do armazenamento local:', e);
      sermons = [];
    }
  }

  /**
   * Salva sermões no LocalStorage e aciona sync com o servidor
   */
  function saveLocalSermons() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sermons));
      renderSermonList();
      updateSermonCount();
      updateSaveStatus('saved', 'Salvo localmente');

      // Tenta enviar para o backend
      const current = getCurrentSermon();
      if (current) {
        pushSermonToBackend(current);
      }
    } catch (e) {
      updateSaveStatus('error', 'Falha ao salvar');
    }
  }

  /**
   * Sincroniza com backend SQLite via API REST
   */
  async function syncWithBackend() {
    try {
      const resp = await fetch(API_ENDPOINT);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data && data.success && Array.isArray(data.sermons) && data.sermons.length > 0) {
        // Mesclar dados do servidor com os locais respeitando updated_at
        const serverMap = new Map();
        for (const s of data.sermons) {
          serverMap.set(s.id, s);
        }

        let updated = false;
        for (const s of sermons) {
          if (serverMap.has(s.id)) {
            const serverSermon = serverMap.get(s.id);
            if (serverSermon.updated_at > (s.updated_at || 0)) {
              // Buscar detalhes completos do sermão
              fetchSermonDetailFromBackend(s.id);
            }
            serverMap.delete(s.id);
          } else {
            // Enviar sermão novo local para o servidor
            pushSermonToBackend(s);
          }
        }

        // Sermões novos do servidor que não estavam no local
        for (const [id, s] of serverMap.entries()) {
          fetchSermonDetailFromBackend(id);
        }
      }
    } catch (e) {
      // Backend offline ou rodando como arquivo estático - funcionamento local perfeito mantido
    }
  }

  async function fetchSermonDetailFromBackend(id) {
    try {
      const res = await fetch(`${API_ENDPOINT}/${id}`);
      if (res.ok) {
        const payload = await res.json();
        if (payload.success && payload.sermon) {
          const idx = sermons.findIndex((item) => item.id === id);
          if (idx >= 0) {
            sermons[idx] = payload.sermon;
          } else {
            sermons.unshift(payload.sermon);
          }
          saveLocalSermons();
          if (currentSermonId === id) {
            populateEditor(payload.sermon);
          }
        }
      }
    } catch (e) {
      // Ignorar com segurança
    }
  }

  async function pushSermonToBackend(sermon) {
    try {
      await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sermon)
      });
      updateSaveStatus('saved', 'Salvo e Sincronizado');
    } catch (e) {
      // Servidor offline, dados estão seguros no LocalStorage
    }
  }

  /**
   * Obtém o sermão atualmente selecionado
   */
  function getCurrentSermon() {
    return sermons.find((s) => s.id === currentSermonId) || null;
  }

  /**
   * Cria novo esboço
   */
  function createNewSermon(template = null) {
    const newId = generateUUID();
    const newSermon = {
      id: newId,
      title: template ? template.title : 'Novo Esboço de Pregação',
      theme: template ? template.theme : '',
      passage: template ? template.passage : '',
      passage_text: template ? (template.passage_text || '') : '',
      sermon_type: template ? template.sermon_type : 'expositivo',
      series: template ? template.series : '',
      target_date: new Date().toISOString().split('T')[0],
      status: template ? template.status : 'rascunho',
      introduction: template ? template.introduction : '',
      topics: template ? JSON.parse(JSON.stringify(template.topics)) : [
        {
          title: '1. Primeiro Ponto Principal',
          passage: '',
          passage_text: '',
          explanation: '',
          illustration: '',
          application: ''
        }
      ],
      conclusion: template ? template.conclusion : '',
      delivery_history: [],
      tags: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };

    sermons.unshift(newSermon);
    currentSermonId = newId;
    saveLocalSermons();
    populateEditor(newSermon);
    showToast('Novo esboço criado com sucesso!');
  }

  /**
   * Seleciona um sermão para edição
   */
  function selectSermon(id) {
    currentSermonId = id;
    const sermon = getCurrentSermon();
    if (sermon) {
      populateEditor(sermon);
      renderSermonList();
    }
  }

  /**
   * Atualiza barra de estatísticas homiléticas em tempo real
   */
  function updateSermonStats() {
    const sermon = getCurrentSermon();
    const statEstimatedTime = document.getElementById('statEstimatedTime');
    const statWordCount = document.getElementById('statWordCount');
    const statTopicCount = document.getElementById('statTopicCount');

    if (!sermon) {
      if (statEstimatedTime) statEstimatedTime.textContent = '~0 min de pregação';
      if (statWordCount) statWordCount.textContent = '0 palavras';
      if (statTopicCount) statTopicCount.textContent = '0 pontos';
      return;
    }

    // Coleta todo o texto homilético relevante
    const parts = [
      sermon.title || '',
      sermon.passage || '',
      sermon.passage_text || '',
      sermon.theme || '',
      sermon.series || '',
      sermon.introduction || '',
      sermon.conclusion || ''
    ];

    if (Array.isArray(sermon.topics)) {
      sermon.topics.forEach((t) => {
        parts.push(t.title || '');
        parts.push(t.passage || '');
        parts.push(t.passage_text || '');
        parts.push(t.explanation || '');
        parts.push(t.illustration || '');
        parts.push(t.application || '');
      });
    }

    const fullText = parts.join(' ').trim();
    const words = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
    const topicCount = Array.isArray(sermon.topics) ? sermon.topics.length : 0;

    // Ritmo de fala homilético padrão: média de ~130 palavras por minuto
    let estimatedMinutes = 0;
    if (words > 0) {
      estimatedMinutes = Math.max(1, Math.round(words / 130));
    }

    if (statEstimatedTime) {
      statEstimatedTime.textContent = `~${estimatedMinutes} min de pregação`;
    }
    if (statWordCount) {
      statWordCount.textContent = `${words} ${words === 1 ? 'palavra' : 'palavras'}`;
    }
    if (statTopicCount) {
      statTopicCount.textContent = `${topicCount} ${topicCount === 1 ? 'ponto' : 'pontos'}`;
    }
  }

  /**
   * Preenche o formulário do editor com os dados do sermão
   */
  function populateEditor(sermon) {
    document.getElementById('sermonTitle').value = sermon.title || '';
    document.getElementById('sermonPassage').value = sermon.passage || '';
    document.getElementById('sermonPassageText').value = sermon.passage_text || '';
    document.getElementById('sermonTheme').value = sermon.theme || '';
    document.getElementById('sermonType').value = sermon.sermon_type || 'expositivo';
    document.getElementById('sermonSeries').value = sermon.series || '';
    document.getElementById('sermonDate').value = sermon.target_date || '';
    document.getElementById('sermonStatus').value = sermon.status || 'rascunho';
    document.getElementById('sermonIntro').value = sermon.introduction || '';
    document.getElementById('sermonConclusion').value = sermon.conclusion || '';

    renderTopics(sermon.topics || []);
    renderDeliveries(sermon.delivery_history || []);
    updateSermonStats();
  }

  /**
   * Salva alterações do formulário com debounce
   */
  function triggerAutosave() {
    updateSaveStatus('saving');
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      readEditorToCurrentSermon();
      saveLocalSermons();
    }, 400);
  }

  /**
   * Lê campos do formulário para o objeto atual
   */
  function readEditorToCurrentSermon() {
    const sermon = getCurrentSermon();
    if (!sermon) return;

    sermon.title = document.getElementById('sermonTitle').value.trim() || 'Sem Título';
    sermon.passage = document.getElementById('sermonPassage').value.trim();
    sermon.passage_text = document.getElementById('sermonPassageText').value.trim();
    sermon.theme = document.getElementById('sermonTheme').value.trim();
    sermon.sermon_type = document.getElementById('sermonType').value;
    sermon.series = document.getElementById('sermonSeries').value.trim();
    sermon.target_date = document.getElementById('sermonDate').value;
    sermon.status = document.getElementById('sermonStatus').value;
    sermon.introduction = document.getElementById('sermonIntro').value;
    sermon.conclusion = document.getElementById('sermonConclusion').value;
    sermon.updated_at = Date.now();
    updateSermonStats();
  }

  /**
   * Move posição de um tópico (reordenação homilética)
   */
  function moveTopic(fromIndex, delta) {
    const sermon = getCurrentSermon();
    if (!sermon || !Array.isArray(sermon.topics)) return;
    const toIndex = fromIndex + delta;
    if (toIndex < 0 || toIndex >= sermon.topics.length) return;

    const [moved] = sermon.topics.splice(fromIndex, 1);
    sermon.topics.splice(toIndex, 0, moved);
    renderTopics(sermon.topics);
    triggerAutosave();
  }

  /**
   * Renderiza os tópicos dinâmicos do sermão
   */
  function renderTopics(topics) {
    const container = document.getElementById('topicsContainer');
    if (!container) return;
    container.innerHTML = '';

    topics.forEach((topic, index) => {
      const card = document.createElement('div');
      card.className = 'topic-card';

      card.innerHTML = `
        <div class="topic-top-bar">
          <div class="topic-top-left">
            <span class="topic-number-badge">Ponto ${index + 1}</span>
            <div class="topic-order-controls">
              <button type="button" class="btn-topic-move btn-topic-up" data-index="${index}" ${index === 0 ? 'disabled' : ''} title="Mover ponto para cima (anterior)">↑</button>
              <button type="button" class="btn-topic-move btn-topic-down" data-index="${index}" ${index === topics.length - 1 ? 'disabled' : ''} title="Mover ponto para baixo (seguinte)">↓</button>
            </div>
          </div>
          <button type="button" class="btn-remove-topic" data-index="${index}" title="Remover este ponto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px; margin-right: 4px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Remover Ponto
          </button>
        </div>

        <div class="form-grid">
          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label sub-field-label">
              <span>🏷️ Título da Divisão / Afirmação do Ponto</span>
            </label>
            <input type="text" class="input-text topic-title-input" data-index="${index}" value="${sanitize(topic.title)}" placeholder="Ex: 1. A Fidelidade de Deus no Deserto">
          </div>
          <div class="form-group">
            <label class="form-label sub-field-label">
              <span>📖 Referência Bíblica de Apoio</span>
            </label>
            <input type="text" class="input-text topic-passage-input" data-index="${index}" value="${sanitize(topic.passage)}" placeholder="Ex: Salmo 23:4">
          </div>
          <div class="form-group">
            <label class="form-label sub-field-label">
              <span>📜 Texto dos Versículos de Apoio</span>
              <span class="hint">Visível no Modo Púlpito</span>
            </label>
            <textarea class="textarea-custom topic-passagetext-input" data-index="${index}" rows="2" placeholder="Cole os versículos deste ponto...">${sanitize(topic.passage_text || '')}</textarea>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label sub-field-label">
            <span>✍️ Explicação Bíblica & Teológica</span>
          </label>
          <textarea class="textarea-custom topic-explanation-input" data-index="${index}" rows="3" placeholder="O que o texto bíblico diz e ensina doutrinariamente...">${sanitize(topic.explanation)}</textarea>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label sub-field-label">
              <span>💡 Ilustração / Exemplo Prático</span>
            </label>
            <textarea class="textarea-custom topic-illustration-input" data-index="${index}" rows="2" placeholder="História, metáfora, testemunho ou comparação contemporânea...">${sanitize(topic.illustration)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label sub-field-label">
              <span>🎯 Aplicação para a Igreja</span>
            </label>
            <textarea class="textarea-custom topic-application-input" data-index="${index}" rows="2" placeholder="O que o ouvinte deve fazer a respeito desta verdade...">${sanitize(topic.application)}</textarea>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    // Reordenação de tópicos
    container.querySelectorAll('.btn-topic-up').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        if (idx > 0) moveTopic(idx, -1);
      });
    });

    container.querySelectorAll('.btn-topic-down').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const sermon = getCurrentSermon();
        if (sermon && sermon.topics && idx < sermon.topics.length - 1) {
          moveTopic(idx, 1);
        }
      });
    });

    // Eventos dos campos dos tópicos
    container.querySelectorAll('.topic-title-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const sermon = getCurrentSermon();
        if (sermon && sermon.topics[idx]) {
          sermon.topics[idx].title = e.target.value;
          triggerAutosave();
          updateSermonStats();
        }
      });
    });

    container.querySelectorAll('.topic-passage-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const sermon = getCurrentSermon();
        if (sermon && sermon.topics[idx]) {
          sermon.topics[idx].passage = e.target.value;
          triggerAutosave();
          updateSermonStats();
        }
      });
    });

    container.querySelectorAll('.topic-passagetext-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const sermon = getCurrentSermon();
        if (sermon && sermon.topics[idx]) {
          sermon.topics[idx].passage_text = e.target.value;
          triggerAutosave();
          updateSermonStats();
        }
      });
    });

    container.querySelectorAll('.topic-explanation-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const sermon = getCurrentSermon();
        if (sermon && sermon.topics[idx]) {
          sermon.topics[idx].explanation = e.target.value;
          triggerAutosave();
          updateSermonStats();
        }
      });
    });

    container.querySelectorAll('.topic-illustration-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const sermon = getCurrentSermon();
        if (sermon && sermon.topics[idx]) {
          sermon.topics[idx].illustration = e.target.value;
          triggerAutosave();
          updateSermonStats();
        }
      });
    });

    container.querySelectorAll('.topic-application-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const sermon = getCurrentSermon();
        if (sermon && sermon.topics[idx]) {
          sermon.topics[idx].application = e.target.value;
          triggerAutosave();
          updateSermonStats();
        }
      });
    });

    container.querySelectorAll('.btn-remove-topic').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const sermon = getCurrentSermon();
        if (sermon && sermon.topics.length > 1) {
          sermon.topics.splice(idx, 1);
          renderTopics(sermon.topics);
          triggerAutosave();
          updateSermonStats();
        } else {
          showToast('O sermão deve ter pelo menos um ponto principal.', 'error');
        }
      });
    });

    updateSermonStats();
  }

  /**
   * Adiciona novo tópico ao sermão atual
   */
  function addTopic() {
    const sermon = getCurrentSermon();
    if (!sermon) return;
    if (!sermon.topics) sermon.topics = [];

    const nextNum = sermon.topics.length + 1;
    sermon.topics.push({
      title: `${nextNum}. Novo Ponto`,
      passage: '',
      passage_text: '',
      explanation: '',
      illustration: '',
      application: ''
    });

    renderTopics(sermon.topics);
    triggerAutosave();
  }

  /**
   * Renderiza histórico de ministrações
   */
  function renderDeliveries(deliveries) {
    const container = document.getElementById('deliveriesContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!deliveries || deliveries.length === 0) {
      container.innerHTML = '<div style="color: #94a3b8; font-size: 0.85rem; font-style: italic;">Nenhuma ministração registrada ainda para este esboço.</div>';
      return;
    }

    deliveries.forEach((d, idx) => {
      const item = document.createElement('div');
      item.className = 'delivery-item';
      item.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${sanitize(d.date || 'Data não informada')}
            </span>
            <span style="color: #94a3b8;">•</span>
            <span style="display: inline-flex; align-items: center; gap: 4px; color: #475569;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V11l7-5 7 5v10"/><path d="M9 21v-6a3 3 0 0 1 6 0v6"/></svg>
              ${sanitize(d.location || 'Local')}
            </span>
          </div>
          ${d.notes ? `<div style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; color: #64748b;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${sanitize(d.notes)}</div>` : ''}
        </div>
        <button type="button" class="btn-remove-topic" data-index="${idx}" title="Excluir este registro">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;

      item.querySelector('button').addEventListener('click', () => {
        const sermon = getCurrentSermon();
        if (sermon) {
          sermon.delivery_history.splice(idx, 1);
          renderDeliveries(sermon.delivery_history);
          triggerAutosave();
        }
      });

      container.appendChild(item);
    });
  }

  /**
   * Adiciona nova ministração
   */
  function addDelivery() {
    const dateInput = document.getElementById('newDeliveryDate');
    const locInput = document.getElementById('newDeliveryLocation');
    const notesInput = document.getElementById('newDeliveryNotes');

    const location = locInput.value.trim();
    if (!location) {
      showToast('Informe o local da ministração (igreja ou congregação).', 'error');
      return;
    }

    const sermon = getCurrentSermon();
    if (!sermon) return;
    if (!sermon.delivery_history) sermon.delivery_history = [];

    sermon.delivery_history.unshift({
      date: dateInput.value || new Date().toISOString().split('T')[0],
      location: location,
      notes: notesInput.value.trim()
    });

    // Se estava em rascunho ou pronto, mudar para pregado
    sermon.status = 'pregado';
    document.getElementById('sermonStatus').value = 'pregado';

    dateInput.value = '';
    locInput.value = '';
    notesInput.value = '';

    renderDeliveries(sermon.delivery_history);
    triggerAutosave();
    showToast('Ministração registrada com sucesso!');
  }

  /**
   * Renderiza a lista de sermões na barra lateral
   */
  function renderSermonList() {
    const container = document.getElementById('sermonListContainer');
    if (!container) return;
    container.innerHTML = '';

    const term = searchTerm.toLowerCase();
    const filtered = sermons.filter((s) => {
      // Filtro de status
      if (activeFilter !== 'all' && s.status !== activeFilter) {
        return false;
      }
      // Filtro de busca
      if (!term) return true;
      const titleMatch = (s.title || '').toLowerCase().includes(term);
      const passageMatch = (s.passage || '').toLowerCase().includes(term);
      const themeMatch = (s.theme || '').toLowerCase().includes(term);
      const seriesMatch = (s.series || '').toLowerCase().includes(term);
      return titleMatch || passageMatch || themeMatch || seriesMatch;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b; font-size: 0.85rem;">Nenhum esboço encontrado.</div>';
      return;
    }

    filtered.forEach((s) => {
      const item = document.createElement('div');
      item.className = `sermon-item ${s.id === currentSermonId ? 'active' : ''}`;
      
      let badgeClass = 'badge-default';
      if (s.sermon_type === 'expositivo') badgeClass = 'badge-expositivo';
      else if (s.sermon_type === 'tematico') badgeClass = 'badge-tematico';
      else if (s.sermon_type === 'textual') badgeClass = 'badge-textual';

      item.setAttribute('title', s.title || 'Esboço');
      item.innerHTML = `
        <div class="sermon-item-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <div class="sermon-item-content">
          <div class="sermon-item-title">${sanitize(s.title || 'Sem título')}</div>
          <div class="sermon-item-meta">
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              ${sanitize(s.passage || 'Texto não definido')}
            </span>
            <span class="sermon-item-badge ${badgeClass}">${sanitize(s.sermon_type || 'Geral')}</span>
          </div>
          ${s.series ? `<div class="sermon-item-series">Série: ${sanitize(s.series)}</div>` : ''}
        </div>
      `;

      item.addEventListener('click', () => {
        selectSermon(s.id);
      });

      container.appendChild(item);
    });
  }

  /**
   * Atualiza contador no rodapé da barra lateral
   */
  function updateSermonCount() {
    const label = document.getElementById('sermonCountLabel');
    if (label) {
      label.textContent = `${sermons.length} ${sermons.length === 1 ? 'esboço salvo' : 'esboços salvos'}`;
    }
  }

  /**
   * Exclui o sermão selecionado
   */
  async function deleteCurrentSermon() {
    const sermon = getCurrentSermon();
    if (!sermon) return;

    if (!confirm(`Deseja realmente excluir o esboço "${sermon.title}"?`)) {
      return;
    }

    const sermonId = sermon.id;
    sermons = sermons.filter((s) => s.id !== sermonId);

    // Tentar excluir no backend
    try {
      await fetch(`${API_ENDPOINT}/${sermonId}`, { method: 'DELETE' });
    } catch (e) {
      // Ignora offline
    }

    if (sermons.length === 0) {
      createNewSermon();
    } else {
      selectSermon(sermons[0].id);
    }

    saveLocalSermons();
    showToast('Esboço excluído com sucesso.');
  }

  /**
   * Aplica template homilético ao sermão atual
   */
  function applyTemplate(type) {
    const tmpl = TEMPLATES[type];
    if (!tmpl) return;

    const sermon = getCurrentSermon();
    if (!sermon) return;

    sermon.title = tmpl.title;
    sermon.theme = tmpl.theme;
    sermon.passage = tmpl.passage;
    sermon.passage_text = tmpl.passage_text || '';
    sermon.sermon_type = tmpl.sermon_type;
    sermon.series = tmpl.series;
    sermon.introduction = tmpl.introduction;
    sermon.topics = JSON.parse(JSON.stringify(tmpl.topics));
    sermon.conclusion = tmpl.conclusion;
    sermon.updated_at = Date.now();

    populateEditor(sermon);
    saveLocalSermons();
    document.getElementById('templatesModal').classList.remove('active');
    showToast(`Modelo ${tmpl.sermon_type} aplicado!`);
  }

  /**
   * MODO PÚLPITO (Apresentação / Tela de Ministração)
   */
  function enterPulpitMode() {
    const sermon = getCurrentSermon();
    if (!sermon) return;

    const overlay = document.getElementById('pulpitOverlay');
    const headerTitle = document.getElementById('pulpitHeaderTitle');
    const renderArea = document.getElementById('pulpitRenderArea');

    headerTitle.textContent = sermon.title || 'Ministração';

    // Bloco nobre da Leitura Bíblica da Mensagem
    let bibleReadingHtml = '';
    if (sermon.passage || sermon.passage_text) {
      bibleReadingHtml = `
        <div class="pulpit-bible-card">
          <div class="pulpit-bible-card-header">
            <div class="pulpit-bible-badge">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span>Texto Bíblico Base</span>
            </div>
            <div class="pulpit-bible-reference">${sanitize(sermon.passage || 'Escrituras')}</div>
          </div>
          ${sermon.passage_text ? `<div class="pulpit-bible-text">“${sanitize(sermon.passage_text).replace(/\n/g, '<br>')}”</div>` : ''}
        </div>
      `;
    }

    // Montagem do conteúdo limpo do púlpito
    let topicsHtml = '';
    (sermon.topics || []).forEach((top, idx) => {
      let scriptureBox = '';
      if (top.passage || top.passage_text) {
        scriptureBox = `
          <div class="pulpit-topic-scripture">
            <div class="pulpit-topic-scripture-ref">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span>${sanitize(top.passage || 'Texto de Apoio')}</span>
            </div>
            ${top.passage_text ? `<div class="pulpit-topic-scripture-text">“${sanitize(top.passage_text).replace(/\n/g, '<br>')}”</div>` : ''}
          </div>
        `;
      }

      topicsHtml += `
        <div class="pulpit-topic-item">
          <div class="pulpit-topic-title">${sanitize(top.title || `Ponto ${idx + 1}`)}</div>
          ${scriptureBox}
          ${top.explanation ? `<div style="margin: 12px 0;">${sanitize(top.explanation).replace(/\n/g, '<br>')}</div>` : ''}
          ${top.illustration ? `<div class="pulpit-illustration-box"><strong style="display: inline-flex; align-items: center; gap: 5px; margin-bottom: 4px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>Ilustração:</strong><br>${sanitize(top.illustration).replace(/\n/g, '<br>')}</div>` : ''}
          ${top.application ? `<div class="pulpit-application-box"><strong style="display: inline-flex; align-items: center; gap: 5px; margin-bottom: 4px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>Aplicação:</strong><br>${sanitize(top.application).replace(/\n/g, '<br>')}</div>` : ''}
        </div>
      `;
    });

    renderArea.innerHTML = `
      <div class="pulpit-title-hero">
        <h1 class="pulpit-hero-title">${sanitize(sermon.title)}</h1>
        <div class="pulpit-hero-meta">
          ${sermon.passage ? `<span style="display: inline-flex; align-items: center; gap: 5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>Texto: <strong>${sanitize(sermon.passage)}</strong></span>` : ''}
          ${sermon.theme ? `<span style="display: inline-flex; align-items: center; gap: 5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>Tema: <strong>${sanitize(sermon.theme)}</strong></span>` : ''}
          ${sermon.series ? `<span style="display: inline-flex; align-items: center; gap: 5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>Série: <strong>${sanitize(sermon.series)}</strong></span>` : ''}
        </div>
      </div>

      ${bibleReadingHtml}

      ${sermon.introduction ? `
        <div class="pulpit-section">
          <div class="pulpit-section-label">Introdução Homilética</div>
          <div>${sanitize(sermon.introduction).replace(/\n/g, '<br>')}</div>
        </div>
      ` : ''}

      ${topicsHtml ? `
        <div class="pulpit-section">
          <div class="pulpit-section-label">Corpo da Mensagem (Pontos)</div>
          ${topicsHtml}
        </div>
      ` : ''}

      ${sermon.conclusion ? `
        <div class="pulpit-section">
          <div class="pulpit-section-label">Conclusão & Apelo</div>
          <div>${sanitize(sermon.conclusion).replace(/\n/g, '<br>')}</div>
        </div>
      ` : ''}
    `;

    overlay.classList.add('active');

    // Inicializar relógio de púlpito em tempo real
    updatePulpitClock();
    if (pulpitClockInterval) clearInterval(pulpitClockInterval);
    pulpitClockInterval = setInterval(updatePulpitClock, 1000);

    // Tentar tela cheia
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  function exitPulpitMode() {
    const overlay = document.getElementById('pulpitOverlay');
    overlay.classList.remove('active');
    if (pulpitClockInterval) {
      clearInterval(pulpitClockInterval);
      pulpitClockInterval = null;
    }
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  /**
   * Atualiza relógio em tempo real do púlpito (hora local)
   */
  function updatePulpitClock() {
    const clockValue = document.getElementById('pulpitCurrentTimeValue');
    if (!clockValue) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clockValue.textContent = `${hours}:${minutes}`;
  }

  /**
   * Alterna Tela Cheia Nativa do Navegador no Modo Púlpito
   */
  function togglePulpitFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  /**
   * Cronômetro do Modo Púlpito
   */
  function toggleTimer() {
    const btn = document.getElementById('btnTimerToggle');
    const label = document.getElementById('btnTimerToggleLabel');
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      if (label) {
        label.textContent = 'Continuar';
        const svg = btn.querySelector('svg');
        if (svg) svg.outerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      } else {
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Continuar`;
      }
    } else {
      isTimerRunning = true;
      if (label) {
        label.textContent = 'Pausar';
        const svg = btn.querySelector('svg');
        if (svg) svg.outerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
      } else {
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar`;
      }
      timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
      }, 1000);
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerSeconds = 0;
    const btn = document.getElementById('btnTimerToggle');
    const label = document.getElementById('btnTimerToggleLabel');
    if (label) {
      label.textContent = 'Iniciar';
      const svg = btn.querySelector('svg');
      if (svg) svg.outerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    } else if (btn) {
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Iniciar`;
    }
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const display = document.getElementById('pulpitTimerDisplay');
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    display.textContent = formatted;

    // Alertas de cor conforme tempo de fala
    display.classList.remove('warning', 'danger');
    if (mins >= 45) {
      display.classList.add('danger');
    } else if (mins >= 35) {
      display.classList.add('warning');
    }
  }

  function adjustFontSize(delta) {
    pulpitFontSize = Math.min(42, Math.max(18, pulpitFontSize + delta));
    const body = document.getElementById('pulpitBodyScroll');
    if (body) {
      body.style.setProperty('--pulpit-font-size', `${pulpitFontSize}px`);
      body.style.fontSize = `${pulpitFontSize}px`;
    }
  }

  /**
   * Exportação e Importação de Backup JSON
   */
  function exportJSONBackup() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sermons, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_esbocos_pregacoes_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON exportado com sucesso!');
  }

  function importJSONBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('O arquivo excede o limite seguro de 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) {
          throw new Error('Formato inválido.');
        }

        // Validação sanitizada de cada sermão
        let count = 0;
        imported.forEach((item) => {
          if (item && item.title) {
            const existsIdx = sermons.findIndex((s) => s.id === item.id);
            if (existsIdx >= 0) {
              sermons[existsIdx] = item;
            } else {
              sermons.push(item);
            }
            count++;
          }
        });

        saveLocalSermons();
        if (sermons.length > 0) {
          selectSermon(sermons[0].id);
        }
        document.getElementById('backupModal').classList.remove('active');
        showToast(`${count} esboços restaurados com sucesso!`);
      } catch (err) {
        showToast('Erro ao importar arquivo. Verifique o formato JSON.', 'error');
      }
    };
    reader.readAsText(file);
  }

  /**
   * Configuração de ouvintes de eventos
   */
  function setupEventListeners() {
    // Alternância da Barra Lateral: Fixar Aberta vs Modo Ícones Automático
    const sidebar = document.getElementById('sidebar');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    if (btnToggleSidebar && sidebar) {
      // Remover resíduo de collapsed legado para garantir visualização dos ícones
      sidebar.classList.remove('collapsed');
      try {
        localStorage.removeItem('sidebar_collapsed');
      } catch (e) {}

      btnToggleSidebar.addEventListener('click', () => {
        if (sidebar.classList.contains('pinned')) {
          sidebar.classList.remove('pinned');
          showToast('Barra lateral: Modo ícones automático (expande no cursor)');
        } else {
          sidebar.classList.add('pinned');
          showToast('Barra lateral fixada aberta');
        }
      });
    }

    // Atalho de Teclado: Ctrl+B ou Cmd+B para fixar/desfixar barra lateral
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        if (sidebar) {
          sidebar.classList.toggle('pinned');
          showToast(sidebar.classList.contains('pinned') ? 'Barra lateral fixada aberta' : 'Barra lateral: Modo ícones automático');
        }
      }
    });

    // Ações principais do cabeçalho
    const btnToggleTheme = document.getElementById('btnToggleTheme');
    if (btnToggleTheme) {
      btnToggleTheme.addEventListener('click', toggleTheme);
    }

    // Atalho de Teclado: Ctrl+Shift+D ou Cmd+Shift+D para alternar tema
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        toggleTheme();
      }
    });

    document.getElementById('btnNewSermon').addEventListener('click', () => createNewSermon());
    document.getElementById('btnDeleteSermon').addEventListener('click', deleteCurrentSermon);
    document.getElementById('btnEnterPulpit').addEventListener('click', enterPulpitMode);
    document.getElementById('btnPrint').addEventListener('click', () => window.print());

    // Pesquisa e Filtros
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderSermonList();
    });

    document.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeFilter = e.currentTarget.dataset.filter;
        renderSermonList();
      });
    });

    // Inputs do formulário para salvar automaticamente
    const formInputIds = [
      'sermonTitle', 'sermonPassage', 'sermonPassageText', 'sermonTheme', 'sermonType',
      'sermonSeries', 'sermonDate', 'sermonStatus', 'sermonIntro', 'sermonConclusion'
    ];

    formInputIds.forEach((id) => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.addEventListener('input', triggerAutosave);
        elem.addEventListener('change', triggerAutosave);
      }
    });

    // Botão de Adicionar Ponto
    document.getElementById('btnAddTopic').addEventListener('click', addTopic);

    // Botão de Ministração
    document.getElementById('btnAddDelivery').addEventListener('click', addDelivery);

    // Atalho de Teclado: Ctrl+Enter ou Cmd+Enter para entrar no Modo Púlpito
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const overlay = document.getElementById('pulpitOverlay');
        if (overlay && !overlay.classList.contains('active')) {
          e.preventDefault();
          enterPulpitMode();
        }
      }
    });

    // Modo Púlpito Controles
    document.getElementById('btnExitPulpit').addEventListener('click', exitPulpitMode);
    const btnPulpitFullscreen = document.getElementById('btnPulpitFullscreen');
    if (btnPulpitFullscreen) {
      btnPulpitFullscreen.addEventListener('click', togglePulpitFullscreen);
    }
    document.getElementById('btnTimerToggle').addEventListener('click', toggleTimer);
    document.getElementById('btnTimerReset').addEventListener('click', resetTimer);
    document.getElementById('btnFontInc').addEventListener('click', () => adjustFontSize(2));
    document.getElementById('btnFontDec').addEventListener('click', () => adjustFontSize(-2));

    document.getElementById('pulpitThemeSelect').addEventListener('change', (e) => {
      document.body.setAttribute('data-pulpit-theme', e.target.value);
    });

    // Tecla ESC para sair do Modo Púlpito
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('pulpitOverlay');
        if (overlay && overlay.classList.contains('active')) {
          exitPulpitMode();
        }
      }
    });

    // Modais
    const templatesModal = document.getElementById('templatesModal');
    document.getElementById('btnTemplates').addEventListener('click', () => {
      templatesModal.classList.add('active');
    });
    document.getElementById('btnCloseTemplatesModal').addEventListener('click', () => {
      templatesModal.classList.remove('active');
    });

    document.getElementById('btnApplyExpository').addEventListener('click', () => applyTemplate('expositivo'));
    document.getElementById('btnApplyThematic').addEventListener('click', () => applyTemplate('tematico'));
    document.getElementById('btnApplyTextual').addEventListener('click', () => applyTemplate('textual'));

    const backupModal = document.getElementById('backupModal');
    document.getElementById('btnOpenBackupModal').addEventListener('click', () => {
      backupModal.classList.add('active');
    });
    document.getElementById('btnCloseBackupModal').addEventListener('click', () => {
      backupModal.classList.remove('active');
    });

    document.getElementById('btnExportJSON').addEventListener('click', exportJSONBackup);
    document.getElementById('importFileInput').addEventListener('change', importJSONBackup);
  }

  // Inicializar quando a página carregar
  document.addEventListener('DOMContentLoaded', initApp);
})();
