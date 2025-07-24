#!/usr/bin/env node

const readline = require('readline');
const https = require('http');

const SERVER_URL = process.env.MCP_SERVER_URL || 'http://173.249.22.2:5173';

// Interface MCP via stdio
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Processar comandos MCP
rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    
    if (request.method === 'initialize') {
      // Responder com capacidades
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              list_boards: {
                description: 'List all Trello boards',
                inputSchema: { type: 'object', properties: {} }
              },
              get_lists: {
                description: 'Get lists from active board',
                inputSchema: { type: 'object', properties: {} }
              },
              add_card_to_list: {
                description: 'Add a card to a Trello list',
                inputSchema: {
                  type: 'object',
                  properties: {
                    listId: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' }
                  },
                  required: ['listId', 'name']
                }
              }
            }
          },
          serverInfo: {
            name: 'trello-liftlio',
            version: '1.0.0'
          }
        }
      };
      console.log(JSON.stringify(response));
    } 
    else if (request.method === 'tools/call') {
      // Fazer chamada para o servidor remoto
      const toolName = request.params.name;
      const toolParams = request.params.arguments;
      
      const data = JSON.stringify({
        method: toolName,
        params: toolParams
      });
      
      const options = {
        hostname: '173.249.22.2',
        port: 5173,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };
      
      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          const result = JSON.parse(responseData);
          const response = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          };
          console.log(JSON.stringify(response));
        });
      });
      
      req.on('error', (error) => {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: error.message
          }
        };
        console.log(JSON.stringify(response));
      });
      
      req.write(data);
      req.end();
    }
    else {
      // Método não suportado
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      };
      console.log(JSON.stringify(response));
    }
  } catch (error) {
    console.error('Error:', error);
  }
});

// Log inicial
console.error('MCP Trello Client started, connecting to:', SERVER_URL);