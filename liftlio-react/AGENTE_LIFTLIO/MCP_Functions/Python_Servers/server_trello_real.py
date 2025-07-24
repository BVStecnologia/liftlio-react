#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import requests
from urllib.parse import urlparse

# Carregar credenciais do .env
TRELLO_API_KEY = os.getenv('TRELLO_API_KEY', '3436c02dafd3cedc7015fd5e881a850c')
TRELLO_TOKEN = os.getenv('TRELLO_TOKEN', 'ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6')
TRELLO_BOARD_ID = os.getenv('TRELLO_BOARD_ID', '686b43ced8d30f8eb12b9d12')

class MCPHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'healthy',
                'server': 'MCP Trello Real API',
                'version': '3.0',
                'board_id': TRELLO_BOARD_ID
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == '/mcp':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            method = data.get('method', '')
            params = data.get('params', {})
            
            try:
                # API do Trello
                base_url = 'https://api.trello.com/1'
                auth = {'key': TRELLO_API_KEY, 'token': TRELLO_TOKEN}
                
                if method == 'get_lists':
                    # Buscar listas do board
                    url = f'{base_url}/boards/{TRELLO_BOARD_ID}/lists'
                    response = requests.get(url, params=auth)
                    lists = response.json()
                    
                    result = {
                        'success': True,
                        'lists': lists,
                        'count': len(lists)
                    }
                
                elif method == 'get_cards_by_list':
                    # Buscar cards de uma lista
                    list_id = params.get('listId', '686b4422d297ee28b3d92163')
                    url = f'{base_url}/lists/{list_id}/cards'
                    response = requests.get(url, params=auth)
                    cards = response.json()
                    
                    result = {
                        'success': True,
                        'cards': cards,
                        'count': len(cards),
                        'list_id': list_id
                    }
                
                elif method == 'add_card_to_list':
                    # Criar card
                    list_id = params.get('listId', '686b4422d297ee28b3d92163')
                    name = params.get('name', 'New Card from MCP Server')
                    desc = params.get('description', '')
                    
                    url = f'{base_url}/cards'
                    card_data = {
                        'idList': list_id,
                        'name': name,
                        'desc': desc,
                        **auth
                    }
                    response = requests.post(url, data=card_data)
                    card = response.json()
                    
                    result = {
                        'success': True,
                        'card': card,
                        'message': 'Card created successfully!'
                    }
                
                else:
                    # Método não implementado
                    result = {
                        'success': False,
                        'error': f'Method {method} not implemented',
                        'available_methods': ['get_lists', 'get_cards_by_list', 'add_card_to_list']
                    }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': str(e),
                    'method': method
                }).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    print(f'MCP Trello Real API Server starting on port 5173...')
    print(f'Board ID: {TRELLO_BOARD_ID}')
    print(f'API Key: {TRELLO_API_KEY[:10]}...')
    server = HTTPServer(('0.0.0.0', 5173), MCPHandler)
    server.serve_forever()