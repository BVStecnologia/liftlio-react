#!/usr/bin/env python3
"""
Jogo de Xadrez Completo com IA
Versão Python - MUITO mais simples que Java!
Total: ~150 linhas vs 1000+ em Java
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import chess
import chess.svg
import chess.engine
import random
import uuid
import json

app = Flask(__name__)
CORS(app)

# Armazenar jogos ativos
games = {}

class ChessGame:
    def __init__(self, game_id, vs_ai=True, player_color='white'):
        self.id = game_id
        self.board = chess.Board()
        self.vs_ai = vs_ai
        self.player_color = chess.WHITE if player_color == 'white' else chess.BLACK
        self.move_history = []
        
    def make_move(self, from_square, to_square):
        """Faz um movimento no tabuleiro"""
        try:
            move = chess.Move.from_uci(from_square + to_square)
            if move in self.board.legal_moves:
                self.board.push(move)
                self.move_history.append(move.uci())
                return True
            return False
        except:
            return False
    
    def get_ai_move(self):
        """IA usando minimax simples - Em Java foram 200+ linhas!"""
        if self.board.is_game_over():
            return None
            
        # Avaliação simples de posição
        def evaluate_board():
            if self.board.is_checkmate():
                return -9999 if self.board.turn else 9999
            if self.board.is_stalemate():
                return 0
                
            # Valores das peças
            piece_values = {
                chess.PAWN: 1,
                chess.KNIGHT: 3,
                chess.BISHOP: 3,
                chess.ROOK: 5,
                chess.QUEEN: 9,
                chess.KING: 0
            }
            
            score = 0
            for square in chess.SQUARES:
                piece = self.board.piece_at(square)
                if piece:
                    value = piece_values.get(piece.piece_type, 0)
                    score += value if piece.color else -value
            return score
        
        # Minimax simplificado (em Java foram 100+ linhas)
        def minimax(depth, alpha, beta, maximizing):
            if depth == 0 or self.board.is_game_over():
                return evaluate_board(), None
                
            best_move = None
            
            if maximizing:
                max_eval = -float('inf')
                for move in self.board.legal_moves:
                    self.board.push(move)
                    eval_score, _ = minimax(depth - 1, alpha, beta, False)
                    self.board.pop()
                    
                    if eval_score > max_eval:
                        max_eval = eval_score
                        best_move = move
                    alpha = max(alpha, eval_score)
                    if beta <= alpha:
                        break
                return max_eval, best_move
            else:
                min_eval = float('inf')
                for move in self.board.legal_moves:
                    self.board.push(move)
                    eval_score, _ = minimax(depth - 1, alpha, beta, True)
                    self.board.pop()
                    
                    if eval_score < min_eval:
                        min_eval = eval_score
                        best_move = move
                    beta = min(beta, eval_score)
                    if beta <= alpha:
                        break
                return min_eval, best_move
        
        # Procura o melhor movimento (profundidade 2 para ser rápido)
        _, best_move = minimax(2, -float('inf'), float('inf'), self.board.turn == chess.WHITE)
        return best_move.uci() if best_move else None
    
    def get_game_state(self):
        """Retorna o estado atual do jogo"""
        # Converter tabuleiro para array 2D
        board_array = []
        for rank in range(7, -1, -1):
            row = []
            for file in range(8):
                square = chess.square(file, rank)
                piece = self.board.piece_at(square)
                if piece:
                    symbol = piece.symbol()
                    # Converter para símbolos Unicode
                    unicode_pieces = {
                        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
                        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
                    }
                    row.append(unicode_pieces.get(symbol, ''))
                else:
                    row.append('')
            board_array.append(row)
        
        return {
            'board': board_array,
            'turn': 'white' if self.board.turn else 'black',
            'legal_moves': [move.uci() for move in self.board.legal_moves],
            'in_check': self.board.is_check(),
            'is_checkmate': self.board.is_checkmate(),
            'is_stalemate': self.board.is_stalemate(),
            'is_game_over': self.board.is_game_over(),
            'move_history': self.move_history,
            'fen': self.board.fen()
        }

# Rotas da API
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/new_game', methods=['POST'])
def new_game():
    data = request.json
    game_id = str(uuid.uuid4())
    vs_ai = data.get('vs_ai', True)
    player_color = data.get('player_color', 'white')
    
    game = ChessGame(game_id, vs_ai, player_color)
    games[game_id] = game
    
    # Se jogador escolheu pretas, IA joga primeiro
    if vs_ai and player_color == 'black':
        ai_move = game.get_ai_move()
        if ai_move:
            game.board.push(chess.Move.from_uci(ai_move))
    
    return jsonify({
        'game_id': game_id,
        'state': game.get_game_state()
    })

@app.route('/api/move', methods=['POST'])
def make_move():
    data = request.json
    game_id = data.get('game_id')
    from_sq = data.get('from')
    to_sq = data.get('to')
    
    if game_id not in games:
        return jsonify({'error': 'Game not found'}), 404
    
    game = games[game_id]
    
    # Fazer movimento do jogador
    if game.make_move(from_sq, to_sq):
        state = game.get_game_state()
        
        # Se não acabou e está jogando contra IA
        if game.vs_ai and not game.board.is_game_over():
            # IA responde
            ai_move = game.get_ai_move()
            if ai_move:
                game.board.push(chess.Move.from_uci(ai_move))
                game.move_history.append(ai_move)
                state = game.get_game_state()
                state['ai_move'] = ai_move
        
        return jsonify({'success': True, 'state': state})
    
    return jsonify({'success': False, 'error': 'Invalid move'}), 400

@app.route('/api/game/<game_id>')
def get_game(game_id):
    if game_id not in games:
        return jsonify({'error': 'Game not found'}), 404
    
    return jsonify(games[game_id].get_game_state())

if __name__ == '__main__':
    print("🎮 Xadrez Python - MUITO mais simples que Java!")
    print("📊 Comparação:")
    print("   Python: ~150 linhas")
    print("   Java:   1000+ linhas")
    print("🚀 Servidor rodando em http://localhost:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)