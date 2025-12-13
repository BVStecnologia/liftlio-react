#!/usr/bin/env python3
"""
Refresh automatico do token OAuth do Claude Max.
Rodar via cron a cada 6 horas ou como container sempre-ativo.
"""

import json
import requests
from datetime import datetime
from pathlib import Path
import os
import sys

# Configuracao
CREDS_FILE = os.environ.get("CREDS_FILE", "/opt/claude/credentials/.credentials.json")
CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"  # Client ID oficial do Claude Code
REFRESH_ENDPOINT = "https://console.anthropic.com/v1/oauth/token"

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}")

def refresh_token():
    """Renova o access token usando o refresh token."""

    # Ler credenciais atuais
    creds_path = Path(CREDS_FILE)
    if not creds_path.exists():
        log(f"ERROR: Credentials file not found: {CREDS_FILE}")
        return False

    try:
        with open(creds_path) as f:
            creds = json.load(f)
    except json.JSONDecodeError as e:
        log(f"ERROR: Invalid JSON in credentials file: {e}")
        return False

    # Extrair tokens
    oauth_data = creds.get("claudeAiOauth", {})
    refresh_token_value = oauth_data.get("refreshToken")

    if not refresh_token_value:
        log("ERROR: No refresh token found in credentials!")
        return False

    # Verificar se precisa refresh (expira em menos de 2h)
    expires_at = oauth_data.get("expiresAt", 0)
    now_ms = datetime.now().timestamp() * 1000
    hours_until_expiry = (expires_at - now_ms) / (1000 * 60 * 60)

    if hours_until_expiry > 2:
        log(f"Token still valid for {hours_until_expiry:.1f} hours, skipping refresh")
        return True

    log(f"Token expires in {hours_until_expiry:.1f} hours, refreshing...")

    # Chamar API de refresh
    try:
        resp = requests.post(
            REFRESH_ENDPOINT,
            json={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token_value,
                "client_id": CLIENT_ID
            },
            timeout=30,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "claude-code-token-refresher/1.0"
            }
        )

        if resp.status_code != 200:
            log(f"ERROR: Refresh failed with status {resp.status_code}: {resp.text}")
            return False

        data = resp.json()

    except requests.exceptions.RequestException as e:
        log(f"ERROR: Network error during refresh: {e}")
        return False
    except json.JSONDecodeError as e:
        log(f"ERROR: Invalid JSON response: {e}")
        return False

    # Extrair novo token
    new_access_token = data.get("access_token")
    expires_in = data.get("expires_in", 28800)  # default 8h

    if not new_access_token:
        log(f"ERROR: No access token in response! Response: {data}")
        return False

    # Atualizar credenciais
    creds["claudeAiOauth"]["accessToken"] = new_access_token
    creds["claudeAiOauth"]["expiresAt"] = int(
        datetime.now().timestamp() * 1000 + expires_in * 1000
    )

    # Se a API retornar novo refresh token, atualizar tambem
    if "refresh_token" in data:
        creds["claudeAiOauth"]["refreshToken"] = data["refresh_token"]
        log("Refresh token also renewed!")

    # Salvar credenciais atualizadas
    try:
        with open(creds_path, "w") as f:
            json.dump(creds, f, indent=2)
    except IOError as e:
        log(f"ERROR: Failed to save credentials: {e}")
        return False

    log(f"SUCCESS: Token renewed! Expires in {expires_in/3600:.1f} hours")
    return True


def main():
    """Loop principal - roda refresh e depois dorme."""

    log("=" * 60)
    log("Claude Code Token Refresher Started")
    log(f"Credentials file: {CREDS_FILE}")
    log("=" * 60)

    # Verificar se arquivo existe
    if not Path(CREDS_FILE).exists():
        log(f"FATAL: Credentials file not found: {CREDS_FILE}")
        log("Please copy your ~/.claude/.credentials.json to this location")
        sys.exit(1)

    # Modo daemon (loop infinito) ou single-run
    daemon_mode = os.environ.get("DAEMON_MODE", "true").lower() == "true"
    sleep_seconds = int(os.environ.get("REFRESH_INTERVAL_HOURS", "6")) * 3600

    if daemon_mode:
        log(f"Running in daemon mode, refresh interval: {sleep_seconds/3600:.0f} hours")

        import time
        while True:
            try:
                refresh_token()
            except Exception as e:
                log(f"ERROR: Unexpected error: {e}")

            log(f"Sleeping for {sleep_seconds/3600:.0f} hours...")
            time.sleep(sleep_seconds)
    else:
        # Single run
        success = refresh_token()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
