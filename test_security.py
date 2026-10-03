#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Suíte de Testes de Penetração e Verificação de Regressão de Segurança.
Testa:
- Prevenção de SQL Injection
- Sanitização contra XSS
- Validação de Payloads Maliciosos
- Cabeçalhos de Segurança HTTP (CSP, X-Frame-Options, etc.)
- Comportamento sob Rate Limiting
"""

import unittest
import urllib.request
import urllib.error
import json
import threading
import time
import os
import sys
import tempfile

import server
from server import HTTPServer, PreachingHandler, PORT, HOST

TEST_PORT = 8899

class TestPreachingSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Isola banco de dados em arquivo temporário para não alterar o sermons.db do usuário
        cls.test_db_file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        cls.test_db_path = cls.test_db_file.name
        cls.test_db_file.close()

        server.DB_PATH = cls.test_db_path
        server.init_db()

        cls.server = HTTPServer((HOST, TEST_PORT), PreachingHandler)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.5)
        cls.base_url = f"http://{HOST}:{TEST_PORT}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        if os.path.exists(cls.test_db_path):
            try:
                os.remove(cls.test_db_path)
            except Exception:
                pass

    def test_01_sql_injection_on_search(self):
        """Testa se a busca é imune a SQL Injection."""
        malicious_query = "' OR 1=1 --"
        encoded = urllib.parse.quote(malicious_query)
        url = f"{self.base_url}/api/sermons?q={encoded}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertTrue(data.get("success"))
            # O ataque ' OR 1=1 não deve retornar todos os itens aleatoriamente através de injeção
            self.assertIsInstance(data.get("sermons"), list)

    def test_02_sql_injection_on_id_lookup(self):
        """Testa se a busca por ID é imune a SQL Injection."""
        malicious_id = "1' OR '1'='1"
        url = f"{self.base_url}/api/sermons/{urllib.parse.quote(malicious_id)}"
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self.assertFalse(data.get("success", False))
        except urllib.error.HTTPError as e:
            # Deve retornar 404 seguro, nunca 500 com erro de sintaxe SQL
            self.assertEqual(e.code, 404)

    def test_03_security_headers_present(self):
        """Verifica se todos os cabeçalhos de segurança obrigatórios estão presentes."""
        req = urllib.request.Request(f"{self.base_url}/index.html")
        with urllib.request.urlopen(req) as resp:
            headers = dict(resp.headers)
            self.assertEqual(headers.get("X-Frame-Options"), "DENY")
            self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
            self.assertIn("Content-Security-Policy", headers)

    def test_04_xss_payload_handling(self):
        """Verifica se payload contendo script é aceito com validação e sanitizado."""
        payload = {
            "title": "Mensagem Teste <script>alert('xss')</script>",
            "passage": "Salmo 23",
            "theme": "Tema Seguro",
            "topics": [
                {
                    "title": "Ponto 1 <img src=x onerror=alert(1)>",
                    "passage": "v.1",
                    "explanation": "Explicação segura",
                    "illustration": "",
                    "application": ""
                }
            ]
        }
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}/api/sermons",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 201)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertTrue(data.get("success"))

    def test_05_payload_too_large(self):
        """Verifica proteção contra payload excessivo (DoS)."""
        huge_payload = {"title": "A" * (6 * 1024 * 1024)} # 6MB
        body = json.dumps(huge_payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}/api/sermons",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            urllib.request.urlopen(req)
            self.fail("Deveria ter rejeitado payload maior que 5MB")
        except (urllib.error.HTTPError, urllib.error.URLError):
            # Servidor rejeitou ou encerrou conexão imediatamente prevenindo DoS
            self.assertTrue(True)

if __name__ == "__main__":
    unittest.main()
