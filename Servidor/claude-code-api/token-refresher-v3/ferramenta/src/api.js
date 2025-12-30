/**
 * =============================================================================
 * FERRAMENTA API - Token Refresher v3
 * =============================================================================
 *
 * Express API que expoe endpoints para geracao de tokens OAuth via Claude CLI.
 *
 * Endpoints:
 *   GET  /health         - Health check
 *   GET  /token-status   - Verifica status do token atual
 *   POST /generate-token - Executa claude setup-token para gerar novo token
 *
 * Porta: 3001
 */

const express = require('express');
const cors = require('cors');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Paths
const CLAUDE_CREDS_PATH = '/home/browseruser/.claude/.credentials.json';
const SHARED_CREDS_PATH = '/opt/claude-credentials/.credentials.json';

app.use(cors());
app.use(express.json());

// =============================================================================
// Utilities
// =============================================================================

/**
 * Verifica se um arquivo existe
 */
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch {
        return false;
    }
}

/**
 * Le o arquivo de credenciais
 */
function readCredentials(filePath) {
    try {
        if (!fileExists(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading credentials from ${filePath}:`, error.message);
        return null;
    }
}

/**
 * Copia credenciais para o volume compartilhado
 */
function copyToShared() {
    try {
        if (fileExists(CLAUDE_CREDS_PATH)) {
            const content = fs.readFileSync(CLAUDE_CREDS_PATH, 'utf8');

            // Garante que o diretorio existe
            const dir = path.dirname(SHARED_CREDS_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(SHARED_CREDS_PATH, content);
            console.log('Credentials copied to shared volume');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error copying credentials:', error.message);
        return false;
    }
}

/**
 * Calcula tempo restante ate expiracao
 */
function getTimeUntilExpiry(credentials) {
    if (!credentials || !credentials.expiresAt) {
        return null;
    }

    const expiresAt = new Date(credentials.expiresAt);
    const now = new Date();
    const diffMs = expiresAt - now;

    if (diffMs <= 0) {
        return { expired: true, hours: 0, minutes: 0 };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { expired: false, hours, minutes };
}

// =============================================================================
// Endpoints
// =============================================================================

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'token-refresher-ferramenta',
        timestamp: new Date().toISOString(),
        version: '3.0.0'
    });
});

/**
 * GET /token-status - Verifica status do token atual
 *
 * Retorna informacoes sobre o token:
 * - exists: se o arquivo existe
 * - valid: se o token nao expirou
 * - expiresAt: data/hora de expiracao
 * - timeRemaining: tempo restante
 */
app.get('/token-status', (req, res) => {
    try {
        // Verifica credenciais locais do Claude
        const localCreds = readCredentials(CLAUDE_CREDS_PATH);
        const sharedCreds = readCredentials(SHARED_CREDS_PATH);

        const localStatus = {
            exists: !!localCreds,
            path: CLAUDE_CREDS_PATH
        };

        const sharedStatus = {
            exists: !!sharedCreds,
            path: SHARED_CREDS_PATH
        };

        // Usa credenciais locais como referencia
        if (localCreds) {
            const timeRemaining = getTimeUntilExpiry(localCreds);
            localStatus.expiresAt = localCreds.expiresAt;
            localStatus.timeRemaining = timeRemaining;
            localStatus.valid = timeRemaining && !timeRemaining.expired;
            localStatus.needsRefresh = timeRemaining && (timeRemaining.expired || timeRemaining.hours < 2);
        }

        if (sharedCreds) {
            const timeRemaining = getTimeUntilExpiry(sharedCreds);
            sharedStatus.expiresAt = sharedCreds.expiresAt;
            sharedStatus.timeRemaining = timeRemaining;
            sharedStatus.valid = timeRemaining && !timeRemaining.expired;
        }

        res.json({
            success: true,
            local: localStatus,
            shared: sharedStatus,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /generate-token - Executa claude setup-token
 *
 * Inicia o processo de geracao de token.
 * Requer sessao do Claude Max ja logada no browser.
 */
app.post('/generate-token', async (req, res) => {
    console.log('Starting token generation...');

    try {
        // Executa claude setup-token
        // Este comando abre o browser para OAuth
        const result = await new Promise((resolve, reject) => {
            const child = spawn('claude', ['setup-token'], {
                env: {
                    ...process.env,
                    DISPLAY: ':1',
                    HOME: '/home/browseruser'
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
                console.log('stdout:', data.toString());
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
                console.log('stderr:', data.toString());
            });

            // Timeout de 2 minutos
            const timeout = setTimeout(() => {
                child.kill();
                reject(new Error('Token generation timed out after 2 minutes'));
            }, 120000);

            child.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    resolve({ stdout, stderr, code });
                } else {
                    reject(new Error(`Process exited with code ${code}: ${stderr}`));
                }
            });

            child.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });

        // Copia para volume compartilhado
        const copied = copyToShared();

        // Verifica resultado
        const creds = readCredentials(CLAUDE_CREDS_PATH);
        const timeRemaining = creds ? getTimeUntilExpiry(creds) : null;

        res.json({
            success: true,
            message: 'Token generation completed',
            copied: copied,
            tokenInfo: creds ? {
                expiresAt: creds.expiresAt,
                timeRemaining: timeRemaining,
                valid: timeRemaining && !timeRemaining.expired
            } : null,
            output: result.stdout,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /copy-to-shared - Copia credenciais para volume compartilhado
 */
app.post('/copy-to-shared', (req, res) => {
    try {
        const copied = copyToShared();

        if (copied) {
            res.json({
                success: true,
                message: 'Credentials copied to shared volume',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'No credentials found to copy',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /browser-status - Verifica se o browser esta acessivel
 */
app.get('/browser-status', (req, res) => {
    try {
        // Verifica se Chromium esta instalado
        const chromiumPath = execSync('which chromium', { encoding: 'utf8' }).trim();

        // Verifica se DISPLAY esta configurado
        const display = process.env.DISPLAY || ':1';

        res.json({
            success: true,
            chromium: {
                path: chromiumPath,
                available: true
            },
            display: display,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// =============================================================================
// Start Server
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
=============================================================================
FERRAMENTA API - Token Refresher v3
=============================================================================
Port: ${PORT}
VNC: :1 (port 5901)

Endpoints:
  GET  /health         - Health check
  GET  /token-status   - Check token status
  POST /generate-token - Generate new token via Claude CLI
  POST /copy-to-shared - Copy credentials to shared volume
  GET  /browser-status - Check browser availability

Paths:
  Local creds:  ${CLAUDE_CREDS_PATH}
  Shared creds: ${SHARED_CREDS_PATH}
=============================================================================
    `);
});
