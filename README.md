# Esboço de Pregações — Gestor Homilético & Modo Púlpito

Um aplicativo completo, moderno, responsivo e seguro projetado para pregadores, pastores e líderes cristãos organizarem, estruturarem e ministrarem suas pregações com clareza homilética e foco na Palavra de Deus.

---

## 🌟 Principais Recursos

### 1. Estrutura Homilética Guiada
- **Informações Gerais:** Título, Tema Central, Texto Bíblico Principal, Série de Mensagens e Tipo Homilético (Expositivo, Temático, Textual, Santa Ceia, Festivo ou Evangelístico).
- **Introdução Homilética:** Estruturação do gancho de atenção inicial, contextualização histórica e tese central / proposição da mensagem.
- **Corpo da Mensagem (Pontos Principais):**
  - Tópicos dinâmicos que podem ser adicionados, editados e removidos.
  - Cada ponto conta com: **Passagem/Versículo de Apoio**, **Explicação Bíblica & Exegética**, **Ilustração / Metáfora Prática** e **Aplicação Congregacional Direta**.
- **Conclusão & Apelo:** Recapitulação dos pontos, desafio prático para a semana e oração de decisão/apelo.
- **Histórico de Ministrações:** Registro de quando e onde a mensagem já foi ministrada (igreja, data e notas do pregador).

### 2. Modo Púlpito (Tela de Ministração em Tempo Real)
- **Modo Tela Cheia Imersivo:** Sem distrações, com layout focado para leitura fluida no púlpito em tablets, notebooks ou smartphones.
- **Cronômetro Integrado com Alertas Visuais:**
  - Tempo em tempo real com controles de Iniciar, Pausar e Zerar.
  - Indicador de ritmo: transição suave de cor (azul $\rightarrow$ amarelo após 35 min $\rightarrow$ alerta vermelho após 45 min) para ajudar na gestão do tempo de pregação.
- **Tipografia Ajustável:** Botões `A-` e `A+` para aumentar ou diminuir a fonte instantaneamente.
- **Temas de Alto Contraste:**
  - **Escuro (Padrão):** Perfeito para telas OLED e púlpitos com iluminação direcionada.
  - **Âmbar (Alto Contraste):** Ideal para leitura noturna confortável sem cansar a visão.
  - **Claro:** Para ambientes bem iluminados ou luz do dia.

### 3. Modo Claro e Modo Escuro Global (Notion & Apple Design)
- **Suporte Nativo a Dark & Light Mode:** Alternância rápida com 1 clique no botão de Sol/Lua no cabeçalho ou pelo atalho <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd>.
- **Paleta Refinada e Confortável:**
  - **Modo Claro:** Tons arejados (`#fbfbfa`, cartões `#ffffff` e barra lateral clara `#f7f7f5`).
  - **Modo Escuro:** Grafite neutro e ardósia escuro (`#141414` e `#1e1e1e`), sem roxo, sem laranja e sem contrastes agressivos.
- **Detecção Automática:** Sincroniza com as preferências do sistema operacional (`prefers-color-scheme`) e preserva sua escolha no navegador.
- **Barra Lateral Retrátil:** Recolha ou expanda a barra a qualquer momento pelo botão ou pelo atalho <kbd>Ctrl</kbd> + <kbd>B</kbd> para foco total na escrita.

### 4. Modelos Homiléticos com 1 Clique
- **Modelo Expositivo:** Estrutura clássica com base em Romanos 8:28-30.
- **Modelo Temático:** Estrutura focada em Filipenses 4:4-9.
- **Modelo Textual:** Estrutura dividida a partir de João 14:6.

### 5. Impressão & Ficha de Púlpito em PDF
- Layout de impressão inteligente (`@media print`): ao clicar em **Imprimir / PDF**, o app gera uma ficha limpa, elegante e compacta para levar impressa para a igreja.

### 6. Local-First & PWA Offline
- Funciona 100% offline via LocalStorage e Service Worker (`sw.js`). Se a conexão com a internet cair no púlpito, você continua com acesso total ao esboço.
- Permite exportar e importar backups completos em formato JSON.
- Sincronização automática com backend local SQLite (`server.py`).

---

## 🚀 Como Executar

### Opção 1: Inicialização Rápida (Script)
No terminal, execute:
```bash
cd /home/lucsalmeida/.gemini/antigravity/scratch/esboco-pregacoes
./run_app.sh
```
O script iniciará o servidor seguro e abrirá automaticamente seu navegador em `http://127.0.0.1:8085`.

### Opção 2: Pelo Terminal com Python
```bash
cd /home/lucsalmeida/.gemini/antigravity/scratch/esboco-pregacoes
python3 server.py
```
Acesse no seu navegador: `http://127.0.0.1:8085`

### Opção 3: Atalho do Sistema Linux
Você pode abrir o aplicativo através do arquivo `esboco-pregacoes.desktop` diretamente pelo seu gerenciador de arquivos ou menu de aplicativos.

---

## 🔒 Segurança e Auditoria

O projeto foi construído atendendo a **100% dos 21 itens da Lista de Verificação de Segurança**:
- **Prevenção de Injeção SQL:** 100% das consultas no SQLite são parametrizadas (`?`).
- **Sanitização de Dados:** Proteção ativa contra Cross-Site Scripting (XSS).
- **Sem Senhas ou Chaves Expostas:** Nenhuma credencial no código ou versionamento (`.gitignore` abrangente).
- **Rate Limiting:** Proteção contra força bruta e requisições abusivas.
- **Cabeçalhos HTTP Seguros:** `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- **Modo Debug Desativado:** `DEBUG = False` em ambiente de produção.
- **Suíte de Testes:** Execute `python3 test_security.py` para rodar os testes de regressão de segurança.

Veja o relatório detalhado em [`SECURITY.md`](SECURITY.md).
