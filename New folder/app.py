# app.py
from flask import Flask, render_template, jsonify, request
import random

app = Flask(__name__)

# ================= Tic-Tac-Toe AI =================
class TicTacToe:
    def __init__(self):
        self.board = [' ' for _ in range(9)]
        self.done = False
        self.winner = None

    def reset(self):
        self.board = [' ' for _ in range(9)]
        self.done = False
        self.winner = None
        return self.get_state()

    def get_state(self):
        return tuple(self.board)

    def available_actions(self):
        return [i for i, x in enumerate(self.board) if x == ' ']

    def step(self, action, player):
        if self.board[action] != ' ':
            return self.get_state(), -10, True
        self.board[action] = player
        reward, self.done = self.check_winner(player)
        return self.get_state(), reward, self.done

    def check_winner(self, player):
        wins = [
            (0,1,2),(3,4,5),(6,7,8),
            (0,3,6),(1,4,7),(2,5,8),
            (0,4,8),(2,4,6)
        ]
        for a,b,c in wins:
            if self.board[a]==self.board[b]==self.board[c]==player:
                return 1, True
        if ' ' not in self.board:
            return 0.5, True
        return 0, False

class QLearningAgent:
    def __init__(self, alpha=0.5, gamma=0.9, epsilon=0.2):
        self.q_table = {}
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon

    def get_q(self, state, action):
        return self.q_table.get((state, action), 0.0)

    def choose_action(self, state, actions):
        if random.random() < self.epsilon:
            return random.choice(actions)
        qs = [self.get_q(state, a) for a in actions]
        max_q = max(qs)
        max_actions = [a for a,q in zip(actions, qs) if q==max_q]
        return random.choice(max_actions)

    def learn(self, state, action, reward, next_state, next_actions):
        max_next_q = max([self.get_q(next_state, a) for a in next_actions], default=0)
        self.q_table[(state, action)] = self.get_q(state, action) + self.alpha * (reward + self.gamma*max_next_q - self.get_q(state, action))

# ================= Train the AI =================
env = TicTacToe()
agent_x = QLearningAgent()
agent_o = QLearningAgent()

for episode in range(5000):
    state = env.reset()
    player = 'X'
    while True:
        actions = env.available_actions()
        action = agent_x.choose_action(state, actions) if player=='X' else agent_o.choose_action(state, actions)
        next_state, reward, done = env.step(action, player)
        next_actions = env.available_actions()
        if player=='X':
            agent_x.learn(state, action, reward, next_state, next_actions)
        else:
            agent_o.learn(state, action, reward, next_state, next_actions)
        state = next_state
        player = 'O' if player=='X' else 'X'
        if done:
            break

# ================= Flask Routes =================
@app.route('/')
def index():
    return render_template('index.html')

def evaluate_board(board):
    wins = [
        (0,1,2),(3,4,5),(6,7,8),
        (0,3,6),(1,4,7),(2,5,8),
        (0,4,8),(2,4,6)
    ]
    for a, b, c in wins:
        if board[a] != ' ' and board[a] == board[b] == board[c]:
            return True, board[a]
    if ' ' not in board:
        return True, 'draw'
    return False, None

@app.route('/ai_move', methods=['POST'])
def ai_move():
    data = request.get_json(silent=True) or {}
    board = data.get('board')
    player = data.get('player')

    if not isinstance(board, list) or len(board) != 9 or any(c not in [' ', 'X', 'O'] for c in board):
        return jsonify(error='Invalid board'), 400
    if player not in ['X', 'O']:
        return jsonify(error='Invalid player'), 400

    done, result = evaluate_board(board)
    if done:
        return jsonify(board=board, done=True, result=result)

    local_env = TicTacToe()
    local_env.board = board[:]
    actions = local_env.available_actions()
    if not actions:
        return jsonify(board=board, done=True, result='draw')

    agent = agent_x if player == 'X' else agent_o
    action = agent.choose_action(tuple(local_env.board), actions)
    if action not in actions:
        action = random.choice(actions)

    local_env.step(action, player)
    new_board = local_env.board
    done, result = evaluate_board(new_board)
    return jsonify(board=new_board, done=done, result=result)

@app.route('/reset', methods=['POST'])
def reset():
    return jsonify(board=[' ' for _ in range(9)])

if __name__ == '__main__':
    app.run(debug=True)
