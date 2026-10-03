#!/usr/bin/env bash
# ==============================================================================
# Script de Inicialização - Esboço de Pregações (Púlpito & Homilética)
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

PORT=8085
URL="http://127.0.0.1:${PORT}"

echo "=========================================================="
echo "    Esboço de Pregações - Púlpito & Gestor Homilético     "
echo "=========================================================="
echo "[*] Diretório do Projeto: $DIR"
echo "[*] Porta: $PORT"
echo "[*] Abrindo navegador em: $URL"
echo "----------------------------------------------------------"

# Iniciar navegador após breve pausa
(
  sleep 1.2
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
  elif command -v gio >/dev/null 2>&1; then
    gio open "$URL" >/dev/null 2>&1 &
  else
    python3 -m webbrowser "$URL" >/dev/null 2>&1 &
  fi
) &

# Executar servidor Python seguro
python3 server.py
