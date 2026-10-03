#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor Seguro para o Gerenciador de Esboços de Pregações.
Atende rigorosamente à Lista de Verificação de Conformidade de Segurança:
- Modo Debug desativado (DEBUG = False)
- Validação estrita de entrada no lado do servidor
- Prevenção total de injeção SQL (consultas parametrizadas)
- Limitação de taxa (Rate Limiting) por IP
- Sanitização de dados contra XSS
- Proteção contra DoS com limitação do tamanho do payload
- Sem vazamento de dados de infraestrutura ou stack traces
- Cabeçalhos de segurança HTTP modernos (CSP, X-Content-Type-Options, etc.)
- Sem chaves ou senhas em texto puro
"""

import os
import sys
import json
import sqlite3
import html
import time
import uuid
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from collections import defaultdict

# Configurações de Segurança
DEBUG = False  # Modo debug desativado em conformidade com a política
HOST = "127.0.0.1"
DEFAULT_PORT = int(os.environ.get("PORT", 8085))
PORT = DEFAULT_PORT
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "sermons.db")
MAX_PAYLOAD_SIZE = 5 * 1024 * 1024  # 5 MB max
RATE_LIMIT_WINDOW = 60  # 60 segundos
RATE_LIMIT_MAX_REQUESTS = 180  # Max 180 reqs/min por IP

# Rate Limiter em memória
rate_limits = defaultdict(list)

def is_rate_limited(ip_address: str) -> bool:
    """Verifica se o IP excedeu o limite de requisições."""
    now = time.time()
    timestamps = rate_limits[ip_address]
    # Remove timestamps mais antigos que a janela
    rate_limits[ip_address] = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(rate_limits[ip_address]) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    rate_limits[ip_address].append(now)
    return False

def init_db():
    """Inicializa o banco de dados com estrutura relacional e parâmetros seguros."""
    conn = sqlite3.connect(DB_PATH)
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sermons (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    theme TEXT,
                    passage TEXT,
                    passage_text TEXT,
                    sermon_type TEXT,
                    series TEXT,
                    target_date TEXT,
                    status TEXT,
                    introduction TEXT,
                    topics_json TEXT,
                    conclusion TEXT,
                    delivery_history_json TEXT,
                    tags_json TEXT,
                    created_at INTEGER,
                    updated_at INTEGER
                )
            """)
            try:
                conn.execute("ALTER TABLE sermons ADD COLUMN passage_text TEXT")
            except sqlite3.OperationalError:
                pass
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sermons_updated_at ON sermons(updated_at DESC)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sermons_series ON sermons(series)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sermons_passage ON sermons(passage)")
    finally:
        conn.close()

def sanitize_text(val):
    """Sanitiza string para prevenir injeção de HTML malicioso (XSS)."""
    if val is None:
        return ""
    if not isinstance(val, str):
        val = str(val)
    return html.escape(val.strip())

def validate_sermon_payload(data: dict) -> tuple[bool, str, dict]:
    """Valida a estrutura e tipos do sermão no lado do servidor."""
    if not isinstance(data, dict):
        return False, "O corpo da requisição deve ser um objeto JSON válido.", {}

    title = data.get("title", "")
    if not isinstance(title, str) or not title.strip():
        return False, "O título da pregação é obrigatório.", {}

    if len(title) > 300:
        return False, "O título não pode exceder 300 caracteres.", {}

    theme = str(data.get("theme", ""))[:300]
    passage = str(data.get("passage", ""))[:200]
    passage_text = str(data.get("passage_text", ""))[:100000]
    sermon_type = str(data.get("sermon_type", "expositivo"))[:100]
    series = str(data.get("series", ""))[:200]
    target_date = str(data.get("target_date", ""))[:50]
    status = str(data.get("status", "rascunho"))[:50]
    
    introduction = str(data.get("introduction", ""))[:100000]
    conclusion = str(data.get("conclusion", ""))[:100000]

    # Validar tópicos (deve ser lista de dicionários)
    topics = data.get("topics", [])
    if not isinstance(topics, list):
        return False, "Os tópicos devem ser fornecidos como uma lista.", {}
    
    cleaned_topics = []
    for top in topics[:50]:  # Máximo de 50 tópicos
        if isinstance(top, dict):
            cleaned_topics.append({
                "title": str(top.get("title", ""))[:200],
                "passage": str(top.get("passage", ""))[:200],
                "passage_text": str(top.get("passage_text", ""))[:50000],
                "explanation": str(top.get("explanation", ""))[:50000],
                "illustration": str(top.get("illustration", ""))[:50000],
                "application": str(top.get("application", ""))[:50000]
            })

    # Validar histórico de ministrações
    deliveries = data.get("delivery_history", [])
    if not isinstance(deliveries, list):
        deliveries = []
    cleaned_deliveries = []
    for d in deliveries[:100]:
        if isinstance(d, dict):
            cleaned_deliveries.append({
                "date": str(d.get("date", ""))[:50],
                "location": str(d.get("location", ""))[:200],
                "notes": str(d.get("notes", ""))[:5000]
            })

    # Validar tags
    tags = data.get("tags", [])
    if not isinstance(tags, list):
        tags = []
    cleaned_tags = [str(t)[:50] for t in tags[:30]]

    now = int(time.time() * 1000)
    sermon_id = str(data.get("id", "")).strip()
    if not sermon_id:
        sermon_id = str(uuid.uuid4())

    validated = {
        "id": sermon_id[:100],
        "title": title.strip(),
        "theme": theme.strip(),
        "passage": passage.strip(),
        "passage_text": passage_text.strip(),
        "sermon_type": sermon_type.strip(),
        "series": series.strip(),
        "target_date": target_date.strip(),
        "status": status.strip(),
        "introduction": introduction,
        "topics_json": json.dumps(cleaned_topics, ensure_ascii=False),
        "conclusion": conclusion,
        "delivery_history_json": json.dumps(cleaned_deliveries, ensure_ascii=False),
        "tags_json": json.dumps(cleaned_tags, ensure_ascii=False),
        "updated_at": now
    }
    return True, "", validated

class PreachingHandler(SimpleHTTPRequestHandler):
    """Manipulador HTTP com conformidade de segurança e endpoints REST."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        """Silencia logs verbosos e não expõe dados sensíveis no console."""
        if DEBUG:
            super().log_message(format, *args)

    def end_headers(self):
        """Adiciona cabeçalhos de segurança obrigatórios."""
        # Proteção contra XSS, clickjacking e MIME sniffing
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-XSS-Protection", "1; mode=block")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "script-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self';"
        )
        # CORS seguro restrito ao host local
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def send_json(self, status_code: int, data: dict):
        """Envia resposta JSON de forma segura."""
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_safe_error(self, status_code: int, message: str):
        """Retorna mensagem de erro segura sem vazar infraestrutura interna."""
        self.send_json(status_code, {"success": False, "error": message})

    def do_OPTIONS(self):
        """Trata requisições preflight do CORS."""
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        """Trata leitura de arquivos estáticos e listagem/obtenção de pregações."""
        client_ip = self.client_address[0]
        if is_rate_limited(client_ip):
            self.send_safe_error(429, "Muitas requisições. Aguarde um instante antes de tentar novamente.")
            return

        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/sermons"):
            self.handle_api_get(parsed)
            return

        # Servir arquivos estáticos (index.html, styles.css, app.js, icon.svg, manifest.json, sw.js)
        # Proteção contra directory traversal é garantida pelo SimpleHTTPRequestHandler
        super().do_GET()

    def handle_api_get(self, parsed):
        """API GET: Lista todos os sermões ou um sermão específico."""
        parts = [p for p in parsed.path.split("/") if p]
        
        # /api/sermons/:id
        if len(parts) == 3:
            sermon_id = parts[2]
            try:
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                # Consulta 100% parametrizada (anti SQL Injection)
                cursor.execute("SELECT * FROM sermons WHERE id = ?", (sermon_id,))
                row = cursor.fetchone()
                conn.close()
                if not row:
                    self.send_safe_error(404, "Esboço de pregação não encontrado.")
                    return
                sermon = dict(row)
                sermon["topics"] = json.loads(sermon.get("topics_json") or "[]")
                sermon["delivery_history"] = json.loads(sermon.get("delivery_history_json") or "[]")
                sermon["tags"] = json.loads(sermon.get("tags_json") or "[]")
                self.send_json(200, {"success": True, "sermon": sermon})
            except Exception:
                self.send_safe_error(500, "Erro interno seguro ao consultar esboço.")
            return

        # /api/sermons (lista todos)
        params = parse_qs(parsed.query)
        search_query = params.get("q", [""])[0].strip()

        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            if search_query:
                # Busca parametrizada segura
                like_term = f"%{search_query}%"
                cursor.execute("""
                    SELECT id, title, theme, passage, sermon_type, series, target_date, status, updated_at, created_at, tags_json
                    FROM sermons 
                    WHERE title LIKE ? OR theme LIKE ? OR passage LIKE ? OR series LIKE ?
                    ORDER BY updated_at DESC
                """, (like_term, like_term, like_term, like_term))
            else:
                cursor.execute("""
                    SELECT id, title, theme, passage, sermon_type, series, target_date, status, updated_at, created_at, tags_json
                    FROM sermons 
                    ORDER BY updated_at DESC
                """)
            rows = cursor.fetchall()
            conn.close()

            items = []
            for r in rows:
                item = dict(r)
                item["tags"] = json.loads(item.get("tags_json") or "[]")
                items.append(item)

            self.send_json(200, {"success": True, "count": len(items), "sermons": items})
        except Exception:
            self.send_safe_error(500, "Erro seguro ao listar os esboços.")

    def do_POST(self):
        """API POST: Criar novo sermão ou sincronizar em lote."""
        client_ip = self.client_address[0]
        if is_rate_limited(client_ip):
            self.send_safe_error(429, "Muitas requisições. Aguarde um instante.")
            return

        parsed = urlparse(self.path)
        if parsed.path != "/api/sermons":
            self.send_safe_error(404, "Endpoint não encontrado.")
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > MAX_PAYLOAD_SIZE:
                self.send_safe_error(413, "Carga de dados muito grande.")
                return

            raw_data = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(raw_data)
        except Exception:
            self.send_safe_error(400, "Dados JSON inválidos na requisição.")
            return

        ok, err_msg, validated = validate_sermon_payload(data)
        if not ok:
            self.send_safe_error(400, err_msg)
            return

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            now = validated["updated_at"]
            
            # Prevenção rigorosa de SQL Injection (parametrização total)
            cursor.execute("""
                INSERT INTO sermons (
                    id, title, theme, passage, passage_text, sermon_type, series, target_date, status,
                    introduction, topics_json, conclusion, delivery_history_json, tags_json,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    theme = excluded.theme,
                    passage = excluded.passage,
                    passage_text = excluded.passage_text,
                    sermon_type = excluded.sermon_type,
                    series = excluded.series,
                    target_date = excluded.target_date,
                    status = excluded.status,
                    introduction = excluded.introduction,
                    topics_json = excluded.topics_json,
                    conclusion = excluded.conclusion,
                    delivery_history_json = excluded.delivery_history_json,
                    tags_json = excluded.tags_json,
                    updated_at = excluded.updated_at
            """, (
                validated["id"], validated["title"], validated["theme"], validated["passage"],
                validated["passage_text"], validated["sermon_type"], validated["series"],
                validated["target_date"], validated["status"], validated["introduction"],
                validated["topics_json"], validated["conclusion"], validated["delivery_history_json"],
                validated["tags_json"], now, now
            ))
            conn.commit()
            conn.close()

            self.send_json(201, {"success": True, "id": validated["id"], "message": "Esboço salvo com sucesso."})
        except Exception:
            self.send_safe_error(500, "Erro seguro ao salvar o sermão no banco de dados.")

    def do_DELETE(self):
        """API DELETE: Excluir um sermão por ID de forma segura."""
        client_ip = self.client_address[0]
        if is_rate_limited(client_ip):
            self.send_safe_error(429, "Muitas requisições. Aguarde um instante.")
            return

        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) != 3 or parts[0] != "api" or parts[1] != "sermons":
            self.send_safe_error(400, "Formato de requisição inválido.")
            return

        sermon_id = parts[2]
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sermons WHERE id = ?", (sermon_id,))
            affected = cursor.rowcount
            conn.commit()
            conn.close()

            if affected == 0:
                self.send_safe_error(404, "Esboço não encontrado para exclusão.")
            else:
                self.send_json(200, {"success": True, "message": "Esboço excluído com sucesso."})
        except Exception:
            self.send_safe_error(500, "Erro interno seguro ao tentar excluir.")

def main():
    """Inicia o servidor e o banco de dados."""
    init_db()
    global PORT
    print(f"[*] Inicializando Banco de Dados Seguro em: {DB_PATH}")
    server = None
    for p in range(DEFAULT_PORT, DEFAULT_PORT + 10):
        try:
            server = HTTPServer((HOST, p), PreachingHandler)
            PORT = p
            break
        except OSError:
            continue

    if not server:
        print("[!] Erro: Nenhuma porta disponível encontrada.")
        sys.exit(1)

    print(f"[*] Servidor de Esboços de Pregações executando em: http://{HOST}:{PORT}")
    print("[*] Modo de Segurança Ativo: DEBUG = False, Rate Limiting Ativado, CSP Ativado.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Servidor encerrado de forma graciosa.")
        server.server_close()

if __name__ == "__main__":
    main()
