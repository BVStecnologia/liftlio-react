# DataImpulse Proxy - Guia Completo de Integração Python

**Última atualização:** 14/01/2025
**Versão:** 1.0
**Escopo:** Integração de proxies residenciais rotativos DataImpulse em aplicações Python com foco em youtube-transcript-api

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração de Credenciais](#configuração-de-credenciais)
3. [Formatos de Conexão](#formatos-de-conexão)
4. [Integração com Python Requests](#integração-com-python-requests)
5. [Integração com youtube-transcript-api](#integração-com-youtube-transcript-api)
6. [Tipos de Conexão](#tipos-de-conexão)
7. [Variáveis de Ambiente](#variáveis-de-ambiente)
8. [Best Practices para Produção](#best-practices-para-produção)
9. [Troubleshooting](#troubleshooting)
10. [Exemplos Completos](#exemplos-completos)

---

## 🎯 Visão Geral

**DataImpulse** é um serviço de proxies residenciais com:
- 90+ milhões de endereços IP
- Preço pay-per-GB (a partir de $1/GB)
- Suporte a HTTP, HTTPS e SOCKS5
- Proxies rotativos e sticky sessions
- Suporte a 194 localizações geográficas

**Casos de uso:**
- Web scraping em larga escala
- Bypass de rate limiting e IP blocking
- Coleta de transcrições do YouTube sem bloqueios
- Acesso a conteúdo geo-restrito

---

## 🔑 Configuração de Credenciais

### 1. Obter Credenciais

Acesse o [DataImpulse Dashboard](https://app.dataimpulse.com/) e navegue até seu plano ativo para encontrar:

```
Proxy Host: gw.dataimpulse.com
HTTP/HTTPS Port: 823
SOCKS5 Port: 824
Login: <seu_usuario>
Password: <sua_senha>
```

### 2. Métodos de Autenticação

**Opção A: User/Password (Recomendado para rotação)**
```python
proxy_login = "seu_usuario"
proxy_password = "sua_senha"
```

**Opção B: IP Whitelisting**
- Configure no Dashboard > Settings > IP Whitelist
- Adicione o IP público do servidor
- Não requer credenciais na URL do proxy

---

## 🌐 Formatos de Conexão

### HTTP/HTTPS Proxy

#### Rotating Proxy (IP muda a cada request)
```
http://login:password@gw.dataimpulse.com:823
```

#### Sticky Proxy (IP fixo por 1-120 minutos)
```
http://login:password@gw.dataimpulse.com:10000
```
- Portas disponíveis: 10000-20000
- Cada porta mantém IP fixo por 30min (padrão)
- Use portas diferentes para múltiplos IPs fixos simultâneos

### SOCKS5 Proxy

#### Rotating
```
socks5://login:password@gw.dataimpulse.com:824
```

#### Sticky
```
socks5://login:password@gw.dataimpulse.com:10000
```

### Teste via cURL
```bash
# Rotating HTTP
curl -x "http://login:password@gw.dataimpulse.com:823" https://api.ipify.org/

# Sticky HTTP (porta 10000)
curl -x "http://login:password@gw.dataimpulse.com:10000" https://api.ipify.org/

# SOCKS5
curl -x "socks5://login:password@gw.dataimpulse.com:824" https://api.ipify.org/
```

---

## 🐍 Integração com Python Requests

### Instalação
```bash
pip install requests
```

### Configuração Básica (Rotating Proxy)
```python
import requests

# Configuração do proxy
proxy_host = 'gw.dataimpulse.com'
proxy_port = 823
proxy_login = 'seu_usuario'
proxy_password = 'sua_senha'

# URL do proxy formatada
proxy_url = f'http://{proxy_login}:{proxy_password}@{proxy_host}:{proxy_port}'

# Dicionário de proxies para requests
proxies = {
    'http': proxy_url,
    'https': proxy_url
}

# Fazer request
url = 'https://www.example.com'
response = requests.get(url, proxies=proxies)

if response.status_code == 200:
    print(response.text)
else:
    print(f'Request failed: {response.status_code}')
```

### Sticky Session (IP fixo)
```python
# Use porta entre 10000-20000 para IP fixo
proxy_port = 10000  # Mesmo IP por ~30 minutos
proxy_url = f'http://{proxy_login}:{proxy_password}@{proxy_host}:{proxy_port}'

proxies = {
    'http': proxy_url,
    'https': proxy_url
}

# Todos os requests usando esse proxy terão o mesmo IP
response1 = requests.get('https://api.ipify.org/', proxies=proxies)
response2 = requests.get('https://api.ipify.org/', proxies=proxies)

print(response1.text)  # Mesmo IP
print(response2.text)  # Mesmo IP
```

### Session com Proxy Persistente
```python
import requests

session = requests.Session()
session.proxies.update(proxies)

# Todos os requests nesta session usam o proxy
r1 = session.get('https://example.com')
r2 = session.get('https://api.example.com/data')
```

### SOCKS5 Proxy
```bash
# Instalar dependência SOCKS
pip install 'requests[socks]'
```

```python
proxies = {
    'http': 'socks5://login:password@gw.dataimpulse.com:824',
    'https': 'socks5://login:password@gw.dataimpulse.com:824'
}

response = requests.get('https://example.com', proxies=proxies)
```

---

## 📹 Integração com youtube-transcript-api

### Instalação
```bash
pip install youtube-transcript-api
```

### ⚠️ IMPORTANTE: Proxies e Environment Variables

**A biblioteca youtube-transcript-api NÃO respeita automaticamente as variáveis de ambiente `HTTP_PROXY`/`HTTPS_PROXY`.**

Você **DEVE** passar o proxy explicitamente via `ProxyConfig`.

### Opção 1: GenericProxyConfig (Recomendado para DataImpulse)

```python
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig

# Configurar credenciais DataImpulse
proxy_login = "seu_usuario"
proxy_password = "sua_senha"
proxy_host = "gw.dataimpulse.com"
proxy_port = 823  # Rotating proxy

# Criar URL do proxy
proxy_url = f"http://{proxy_login}:{proxy_password}@{proxy_host}:{proxy_port}"

# Criar configuração de proxy
proxy_config = GenericProxyConfig(
    http_url=proxy_url,
    https_url=proxy_url
)

# Inicializar API com proxy
ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)

# Buscar transcrição
video_id = "dQw4w9WgXcQ"
transcript = ytt_api.fetch(video_id)

for entry in transcript:
    print(f"[{entry['start']}s] {entry['text']}")
```

### Opção 2: Sticky Session para YouTube (Recomendado)

Para evitar detecção de bot, use sticky sessions (IP fixo):

```python
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig

# Sticky proxy - IP fixo por ~30 minutos
proxy_port = 10000  # Portas 10000-20000
proxy_url = f"http://{proxy_login}:{proxy_password}@gw.dataimpulse.com:{proxy_port}"

proxy_config = GenericProxyConfig(
    http_url=proxy_url,
    https_url=proxy_url
)

ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)

# Buscar múltiplas transcrições com MESMO IP
video_ids = ["video1", "video2", "video3"]

for vid_id in video_ids:
    try:
        transcript = ytt_api.fetch(vid_id)
        print(f"✅ {vid_id}: {len(transcript)} segments")
    except Exception as e:
        print(f"❌ {vid_id}: {e}")
```

### Opção 3: Rotação de Portas Sticky para Paralelização

```python
import concurrent.futures
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig

def fetch_transcript_with_proxy(video_id, proxy_port):
    """Fetch usando porta sticky específica"""
    proxy_url = f"http://{proxy_login}:{proxy_password}@gw.dataimpulse.com:{proxy_port}"

    proxy_config = GenericProxyConfig(
        http_url=proxy_url,
        https_url=proxy_url
    )

    ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)

    try:
        transcript = ytt_api.fetch(video_id)
        return {"video_id": video_id, "success": True, "data": transcript}
    except Exception as e:
        return {"video_id": video_id, "success": False, "error": str(e)}

# Lista de vídeos
video_ids = ["vid1", "vid2", "vid3", "vid4", "vid5"]

# Usar 5 portas sticky diferentes (5 IPs simultâneos)
sticky_ports = [10000, 10001, 10002, 10003, 10004]

# Executar em paralelo
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    futures = []

    for i, video_id in enumerate(video_ids):
        port = sticky_ports[i % len(sticky_ports)]  # Round-robin nas portas
        future = executor.submit(fetch_transcript_with_proxy, video_id, port)
        futures.append(future)

    # Coletar resultados
    for future in concurrent.futures.as_completed(futures):
        result = future.result()
        if result["success"]:
            print(f"✅ {result['video_id']}: {len(result['data'])} segments")
        else:
            print(f"❌ {result['video_id']}: {result['error']}")
```

---

## 🔄 Tipos de Conexão

### Rotating Proxies (Porta 823)
- **IP muda a cada request**
- Ideal para: scraping massivo, evitar detecção
- Porta HTTP/HTTPS: `823`
- Porta SOCKS5: `824`

**Exemplo:**
```python
proxy_url = "http://user:pass@gw.dataimpulse.com:823"
```

### Sticky Proxies (Portas 10000-20000)
- **IP fixo por 1-120 minutos (padrão 30min)**
- Ideal para: manter sessões, simular usuário real
- Portas disponíveis: 10000-20000 (11.000 portas)
- Cada porta = IP diferente simultaneamente

**Exemplo:**
```python
# 3 IPs fixos simultâneos
proxy_1 = "http://user:pass@gw.dataimpulse.com:10000"  # IP A
proxy_2 = "http://user:pass@gw.dataimpulse.com:10001"  # IP B
proxy_3 = "http://user:pass@gw.dataimpulse.com:10002"  # IP C
```

**Configurar duração de sticky session:**
```python
# Adicionar parâmetro no username (via DataImpulse dashboard)
# Exemplo: user_session-30 para 30 minutos
proxy_login = "seu_usuario_session-60"  # 60 minutos
```

---

## 🌍 Variáveis de Ambiente

### Python Requests RESPEITA variáveis de ambiente

```bash
# Bash/Linux
export HTTP_PROXY="http://login:password@gw.dataimpulse.com:823"
export HTTPS_PROXY="http://login:password@gw.dataimpulse.com:823"
export ALL_PROXY="socks5://login:password@gw.dataimpulse.com:824"
```

```python
import requests

# Requests detecta automaticamente HTTP_PROXY e HTTPS_PROXY
response = requests.get('https://api.ipify.org/')
print(response.text)  # IP do proxy DataImpulse
```

### youtube-transcript-api NÃO RESPEITA variáveis de ambiente

**❌ NÃO funciona:**
```bash
export HTTP_PROXY="http://user:pass@gw.dataimpulse.com:823"
```
```python
# Isso IGNORA HTTP_PROXY
ytt_api = YouTubeTranscriptApi()
transcript = ytt_api.fetch(video_id)  # Usa IP local!
```

**✅ FUNCIONA:**
```python
from youtube_transcript_api.proxies import GenericProxyConfig

proxy_config = GenericProxyConfig(
    http_url="http://user:pass@gw.dataimpulse.com:823",
    https_url="http://user:pass@gw.dataimpulse.com:823"
)

ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)
transcript = ytt_api.fetch(video_id)  # Usa proxy DataImpulse ✅
```

---

## 🏭 Best Practices para Produção

### 1. Gerenciamento de Credenciais

**Usar variáveis de ambiente:**
```python
import os

DATAIMPULSE_LOGIN = os.getenv("DATAIMPULSE_LOGIN")
DATAIMPULSE_PASSWORD = os.getenv("DATAIMPULSE_PASSWORD")

if not DATAIMPULSE_LOGIN or not DATAIMPULSE_PASSWORD:
    raise ValueError("DataImpulse credentials not found in environment")

proxy_url = f"http://{DATAIMPULSE_LOGIN}:{DATAIMPULSE_PASSWORD}@gw.dataimpulse.com:823"
```

**Arquivo .env (NUNCA commitar):**
```bash
# .env
DATAIMPULSE_LOGIN=seu_usuario
DATAIMPULSE_PASSWORD=sua_senha_secreta
```

```python
# Carregar .env
from dotenv import load_dotenv
import os

load_dotenv()

proxy_login = os.getenv("DATAIMPULSE_LOGIN")
proxy_password = os.getenv("DATAIMPULSE_PASSWORD")
```

### 2. Rate Limiting

DataImpulse cobra por GB, então gerencie requests:

```python
from ratelimit import limits, sleep_and_retry

# Limite: 10 requests por segundo
@sleep_and_retry
@limits(calls=10, period=1)
def fetch_with_rate_limit(url):
    return requests.get(url, proxies=proxies)
```

**Instalação:**
```bash
pip install ratelimit
```

### 3. Retry Logic com Backoff

```python
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

session = requests.Session()

# Configurar retries automáticos
retries = Retry(
    total=3,
    backoff_factor=0.5,  # 0.5s, 1s, 2s entre retries
    status_forcelist=[502, 503, 504, 429],  # Códigos para retry
    allowed_methods={'GET', 'POST'}
)

adapter = HTTPAdapter(max_retries=retries)
session.mount('https://', adapter)
session.mount('http://', adapter)

# Adicionar proxy
session.proxies.update(proxies)

# Requests agora retentam automaticamente
response = session.get('https://example.com')
```

### 4. Pool de Proxies Sticky

```python
import random

class DataImpulseStickyPool:
    def __init__(self, login, password, num_proxies=5):
        self.login = login
        self.password = password
        self.base_port = 10000
        self.num_proxies = num_proxies

        self.proxies = [
            self._create_proxy(self.base_port + i)
            for i in range(num_proxies)
        ]

    def _create_proxy(self, port):
        url = f"http://{self.login}:{self.password}@gw.dataimpulse.com:{port}"
        return {'http': url, 'https': url}

    def get_random_proxy(self):
        """Retorna proxy aleatório do pool"""
        return random.choice(self.proxies)

    def get_proxy(self, index):
        """Retorna proxy específico (para round-robin)"""
        return self.proxies[index % self.num_proxies]

# Uso
pool = DataImpulseStickyPool(
    login=DATAIMPULSE_LOGIN,
    password=DATAIMPULSE_PASSWORD,
    num_proxies=10  # 10 IPs sticky simultâneos
)

# Request com proxy aleatório
response = requests.get('https://example.com', proxies=pool.get_random_proxy())

# Round-robin
for i, url in enumerate(urls):
    proxy = pool.get_proxy(i)
    response = requests.get(url, proxies=proxy)
```

### 5. Logging e Monitoramento

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def fetch_with_proxy(url, proxies):
    try:
        logging.info(f"Fetching {url} via proxy")
        response = requests.get(url, proxies=proxies, timeout=10)

        if response.status_code == 200:
            logging.info(f"✅ Success: {url}")
            return response
        else:
            logging.warning(f"⚠️  Status {response.status_code}: {url}")
            return None

    except requests.exceptions.ProxyError:
        logging.error(f"❌ Proxy error: {url}")
        return None
    except requests.exceptions.Timeout:
        logging.error(f"⏱️  Timeout: {url}")
        return None
    except Exception as e:
        logging.error(f"❌ Error: {e}")
        return None
```

### 6. Monitoramento de Uso (GB consumido)

DataImpulse cobra por GB, então monitore:

```python
class DataImpulseUsageTracker:
    def __init__(self):
        self.total_bytes = 0

    def track_response(self, response):
        """Rastreia bytes da resposta"""
        content_length = len(response.content)
        self.total_bytes += content_length
        return content_length

    def get_usage_gb(self):
        """Retorna uso em GB"""
        return self.total_bytes / (1024 ** 3)

    def get_usage_mb(self):
        """Retorna uso em MB"""
        return self.total_bytes / (1024 ** 2)

# Uso
tracker = DataImpulseUsageTracker()

response = requests.get(url, proxies=proxies)
bytes_used = tracker.track_response(response)

print(f"Uso total: {tracker.get_usage_mb():.2f} MB")
```

### 7. Timeout Adequado

Sempre configure timeout para evitar requests travados:

```python
# Timeout: (connect_timeout, read_timeout)
response = requests.get(
    url,
    proxies=proxies,
    timeout=(5, 30)  # 5s para conectar, 30s para ler
)
```

### 8. User-Agent Rotation

Combine proxies com User-Agents variados:

```python
import random

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
]

def get_random_headers():
    return {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }

# Uso
response = requests.get(
    url,
    proxies=proxies,
    headers=get_random_headers()
)
```

---

## 🛠️ Troubleshooting

### Problema: ProxyError ou Connection Refused

**Causa:** Credenciais incorretas ou IP não whitelisted

**Solução:**
```python
# Verificar credenciais
import requests

test_url = "https://api.ipify.org/"
proxy_url = f"http://{proxy_login}:{proxy_password}@gw.dataimpulse.com:823"

try:
    response = requests.get(test_url, proxies={'http': proxy_url, 'https': proxy_url}, timeout=10)
    print(f"✅ Proxy OK. IP: {response.text}")
except requests.exceptions.ProxyError:
    print("❌ Proxy error - verifique credenciais no Dashboard")
except Exception as e:
    print(f"❌ Error: {e}")
```

### Problema: Timeout constante

**Causa:** Porta sticky pode estar saturada ou IP bloqueado

**Solução:** Trocar de porta sticky
```python
# Testar múltiplas portas
for port in range(10000, 10010):
    proxy_url = f"http://{proxy_login}:{proxy_password}@gw.dataimpulse.com:{port}"
    proxies = {'http': proxy_url, 'https': proxy_url}

    try:
        response = requests.get("https://api.ipify.org/", proxies=proxies, timeout=5)
        print(f"✅ Porta {port} OK - IP: {response.text}")
        break
    except:
        print(f"❌ Porta {port} falhou")
```

### Problema: YouTube ainda bloqueia

**Causa:** Detecção por comportamento, não só IP

**Soluções:**

1. **Usar sticky sessions** (não rotating)
2. **Delays entre requests**
```python
import time

for video_id in video_ids:
    transcript = ytt_api.fetch(video_id)
    time.sleep(random.uniform(2, 5))  # 2-5s entre requests
```

3. **Rotacionar User-Agents** (se suportado pela lib)
4. **Limitar requests por IP**
```python
# Max 50 transcrições por IP sticky antes de trocar porta
MAX_REQUESTS_PER_IP = 50
request_count = 0

for video_id in video_ids:
    if request_count >= MAX_REQUESTS_PER_IP:
        # Trocar porta sticky = novo IP
        proxy_port += 1
        proxy_url = f"http://{login}:{password}@gw.dataimpulse.com:{proxy_port}"
        proxy_config = GenericProxyConfig(http_url=proxy_url, https_url=proxy_url)
        ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)
        request_count = 0

    transcript = ytt_api.fetch(video_id)
    request_count += 1
```

### Problema: Custo alto (GB consumido)

**Causa:** Proxies consomem banda, transcrições são grandes

**Soluções:**

1. **Cachear resultados**
```python
import json
import os

CACHE_DIR = "transcript_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

def fetch_transcript_cached(video_id, ytt_api):
    cache_file = os.path.join(CACHE_DIR, f"{video_id}.json")

    # Verificar cache
    if os.path.exists(cache_file):
        with open(cache_file, 'r') as f:
            print(f"📦 Cache hit: {video_id}")
            return json.load(f)

    # Buscar via proxy
    transcript = ytt_api.fetch(video_id)

    # Salvar cache
    with open(cache_file, 'w') as f:
        json.dump(transcript, f)

    print(f"🌐 Fetched via proxy: {video_id}")
    return transcript
```

2. **Filtrar vídeos antes de buscar**
```python
# Buscar metadados via API oficial (grátis) antes de usar proxy
from youtube_transcript_api import YouTubeTranscriptApi

# Verificar se transcrição existe ANTES de usar proxy
try:
    # Isso ainda pode usar proxy, mas é mais barato que fetch completo
    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    print(f"✅ Transcrição disponível para {video_id}")
except:
    print(f"❌ Sem transcrição, pulando {video_id}")
```

---

## 📦 Exemplos Completos

### Exemplo 1: Script Simples - Buscar 1 Transcrição

```python
#!/usr/bin/env python3
"""
fetch_single_transcript.py
Busca uma transcrição do YouTube via DataImpulse proxy
"""

import os
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig

# Configuração
DATAIMPULSE_LOGIN = os.getenv("DATAIMPULSE_LOGIN")
DATAIMPULSE_PASSWORD = os.getenv("DATAIMPULSE_PASSWORD")
VIDEO_ID = "dQw4w9WgXcQ"

# Criar proxy
proxy_url = f"http://{DATAIMPULSE_LOGIN}:{DATAIMPULSE_PASSWORD}@gw.dataimpulse.com:823"
proxy_config = GenericProxyConfig(http_url=proxy_url, https_url=proxy_url)

# Buscar transcrição
ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)

try:
    transcript = ytt_api.fetch(VIDEO_ID)
    print(f"✅ Transcrição obtida: {len(transcript)} segmentos")

    for entry in transcript[:5]:  # Primeiros 5 segmentos
        print(f"[{entry['start']:.2f}s] {entry['text']}")

except Exception as e:
    print(f"❌ Erro: {e}")
```

### Exemplo 2: Scraping em Massa com Rate Limiting

```python
#!/usr/bin/env python3
"""
bulk_transcript_fetcher.py
Busca múltiplas transcrições com rate limiting e retry
"""

import os
import time
import random
import logging
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Configuração
DATAIMPULSE_LOGIN = os.getenv("DATAIMPULSE_LOGIN")
DATAIMPULSE_PASSWORD = os.getenv("DATAIMPULSE_PASSWORD")

# Lista de vídeos
VIDEO_IDS = [
    "dQw4w9WgXcQ",
    "9bZkp7q19f0",
    "kJQP7kiw5Fk"
    # ... mais vídeos
]

class TranscriptFetcher:
    def __init__(self, login, password, sticky_port=10000):
        self.login = login
        self.password = password
        self.sticky_port = sticky_port
        self.request_count = 0
        self.max_requests_per_ip = 50

        self._init_api()

    def _init_api(self):
        """Inicializa API com novo proxy"""
        proxy_url = f"http://{self.login}:{self.password}@gw.dataimpulse.com:{self.sticky_port}"
        proxy_config = GenericProxyConfig(http_url=proxy_url, https_url=proxy_url)
        self.ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)
        logging.info(f"Proxy inicializado: porta {self.sticky_port}")

    def _rotate_ip_if_needed(self):
        """Rotaciona IP após N requests"""
        if self.request_count >= self.max_requests_per_ip:
            logging.info(f"Rotacionando IP após {self.request_count} requests")
            self.sticky_port += 1
            self.request_count = 0
            self._init_api()

    def fetch(self, video_id, max_retries=3):
        """Busca transcrição com retry"""
        self._rotate_ip_if_needed()

        for attempt in range(max_retries):
            try:
                transcript = self.ytt_api.fetch(video_id)
                self.request_count += 1
                logging.info(f"✅ {video_id}: {len(transcript)} segmentos")
                return transcript

            except Exception as e:
                logging.warning(f"⚠️  Tentativa {attempt+1}/{max_retries} falhou: {e}")

                if attempt < max_retries - 1:
                    time.sleep(random.uniform(2, 5))
                else:
                    logging.error(f"❌ {video_id}: todas tentativas falharam")
                    return None

# Executar
fetcher = TranscriptFetcher(DATAIMPULSE_LOGIN, DATAIMPULSE_PASSWORD)

for video_id in VIDEO_IDS:
    transcript = fetcher.fetch(video_id)

    # Rate limiting: esperar entre requests
    time.sleep(random.uniform(1, 3))
```

### Exemplo 3: Paralelização com Pool de Proxies

```python
#!/usr/bin/env python3
"""
parallel_transcript_fetcher.py
Busca transcrições em paralelo usando pool de IPs sticky
"""

import os
import concurrent.futures
import logging
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

DATAIMPULSE_LOGIN = os.getenv("DATAIMPULSE_LOGIN")
DATAIMPULSE_PASSWORD = os.getenv("DATAIMPULSE_PASSWORD")

VIDEO_IDS = ["video1", "video2", "video3", "video4", "video5"]

def fetch_transcript(video_id, proxy_port):
    """Fetch usando proxy sticky específico"""
    proxy_url = f"http://{DATAIMPULSE_LOGIN}:{DATAIMPULSE_PASSWORD}@gw.dataimpulse.com:{proxy_port}"
    proxy_config = GenericProxyConfig(http_url=proxy_url, https_url=proxy_url)
    ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)

    try:
        transcript = ytt_api.fetch(video_id)
        logging.info(f"✅ {video_id} (porta {proxy_port}): {len(transcript)} segmentos")
        return {"video_id": video_id, "success": True, "data": transcript}
    except Exception as e:
        logging.error(f"❌ {video_id} (porta {proxy_port}): {e}")
        return {"video_id": video_id, "success": False, "error": str(e)}

# Executar em paralelo com 5 workers (5 IPs simultâneos)
NUM_WORKERS = 5
sticky_ports = range(10000, 10000 + NUM_WORKERS)

with concurrent.futures.ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
    futures = []

    for i, video_id in enumerate(VIDEO_IDS):
        port = sticky_ports[i % NUM_WORKERS]
        future = executor.submit(fetch_transcript, video_id, port)
        futures.append(future)

    # Coletar resultados
    results = [f.result() for f in concurrent.futures.as_completed(futures)]

# Análise
successful = [r for r in results if r["success"]]
failed = [r for r in results if not r["success"]]

print(f"\n📊 Resumo:")
print(f"✅ Sucesso: {len(successful)}/{len(VIDEO_IDS)}")
print(f"❌ Falhas: {len(failed)}/{len(VIDEO_IDS)}")
```

---

## 📚 Referências

- [DataImpulse Documentation](https://docs.dataimpulse.com/)
- [DataImpulse Dashboard](https://app.dataimpulse.com/)
- [Python Requests - Proxies](https://requests.readthedocs.io/en/latest/user/advanced/#proxies)
- [youtube-transcript-api GitHub](https://github.com/jdepoix/youtube-transcript-api)
- [youtube-transcript-api Proxy Docs](https://github.com/jdepoix/youtube-transcript-api#proxies)

---

## 🆘 Suporte

**DataImpulse:**
- Email: [email protected]
- Live chat: https://dataimpulse.com/

**Issues Técnicas:**
- GitHub youtube-transcript-api: https://github.com/jdepoix/youtube-transcript-api/issues

---

## 📝 Changelog

**v1.0 - 14/01/2025**
- Documentação inicial completa
- Exemplos de integração com Python Requests
- Exemplos de integração com youtube-transcript-api
- Best practices para produção
- Troubleshooting guide
