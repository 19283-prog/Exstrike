import argparse
import json
import random
from collections import deque

GRID = 20
COLS = 20
ROWS = 20
BOARD_CELLS = COLS * ROWS

LEFT = 0
STRAIGHT = 1
RIGHT = 2
DIRS = [(0, -1), (1, 0), (0, 1), (-1, 0)]  # up right down left


def cell_key(x, y):
    return f"{x},{y}"


def in_bounds(x, y):
    return 0 <= x < COLS and 0 <= y < ROWS


def build_cycle():
    cycle = []
    next_map = {}
    idx_map = {}
    for y in range(ROWS):
        if y % 2 == 0:
            for x in range(1, COLS):
                cycle.append((x, y))
        else:
            for x in range(COLS - 1, 0, -1):
                cycle.append((x, y))
    for y in range(ROWS - 1, -1, -1):
        cycle.append((0, y))
    for i, cur in enumerate(cycle):
        nxt = cycle[(i + 1) % len(cycle)]
        next_map[cur] = nxt
        idx_map[cur] = i
    return next_map, idx_map, len(cycle)


NEXT_CYCLE, CYCLE_IDX, CYCLE_LEN = build_cycle()


class Game:
    def __init__(self, rng):
        self.rng = rng
        self.reset()

    def reset(self):
        self.hx, self.hy = 10, 10
        self.dir_idx = 1
        self.body = deque([(9, 10), (8, 10), (7, 10)])
        self.max_cells = 4
        self.score = 0
        self.apple = self.spawn_apple()
        self.alive = True
        self.solved = False

    def spawn_apple(self):
        occ = set(self.body)
        occ.add((self.hx, self.hy))
        if len(occ) >= BOARD_CELLS:
            return None
        while True:
            p = (self.rng.randrange(COLS), self.rng.randrange(ROWS))
            if p not in occ:
                return p

    def occ(self):
        return set(self.body)

    def blocked(self, x, y):
        return (not in_bounds(x, y)) or ((x, y) in self.body)

    def turn_idx(self, action):
        if action == LEFT:
            return (self.dir_idx + 3) % 4
        if action == RIGHT:
            return (self.dir_idx + 1) % 4
        return self.dir_idx

    def action_next(self, action):
        nd = self.turn_idx(action)
        vx, vy = DIRS[nd]
        return self.hx + vx, self.hy + vy, nd

    def rl_state_key(self):
        d_l = 1 if self.blocked(*self.action_next(LEFT)[:2]) else 0
        d_s = 1 if self.blocked(*self.action_next(STRAIGHT)[:2]) else 0
        d_r = 1 if self.blocked(*self.action_next(RIGHT)[:2]) else 0
        ax, ay = self.apple if self.apple else (self.hx, self.hy)
        fx = 0 if ax == self.hx else (1 if ax > self.hx else -1)
        fy = 0 if ay == self.hy else (1 if ay > self.hy else -1)
        return f"{d_l}|{d_s}|{d_r}|{fx}|{fy}|{self.dir_idx}"

    def apply_action(self, action):
        nx, ny, nd = self.action_next(action)
        if self.blocked(nx, ny):
            self.alive = False
            return
        self.dir_idx = nd
        self.body.appendleft((self.hx, self.hy))
        self.hx, self.hy = nx, ny
        while len(self.body) > self.max_cells - 1:
            self.body.pop()
        if len(set(self.body)) != len(self.body):
            self.alive = False
            return
        if self.apple and (self.hx, self.hy) == self.apple:
            self.max_cells += 1
            self.score += 1
            self.apple = self.spawn_apple()
            if self.apple is None:
                self.solved = True
                self.alive = False

    def cycle_fallback(self):
        nxt = NEXT_CYCLE[(self.hx, self.hy)]
        dx, dy = nxt[0] - self.hx, nxt[1] - self.hy
        nd = DIRS.index((dx, dy))
        if nd == (self.dir_idx + 3) % 4:
            return LEFT
        if nd == (self.dir_idx + 1) % 4:
            return RIGHT
        return STRAIGHT


def evaluate(policy, runs, steps, shield, seed):
    rng = random.Random(seed)
    deaths = 0
    solved = 0
    scores = []

    for _ in range(runs):
        g = Game(rng)
        for _ in range(steps):
            if not g.alive:
                break
            key = g.rl_state_key()
            action = policy.get(key, STRAIGHT)
            nx, ny, _ = g.action_next(action)
            if shield and g.blocked(nx, ny):
                action = g.cycle_fallback()
            g.apply_action(action)
        if g.solved:
            solved += 1
        elif not g.alive:
            deaths += 1
        scores.append(g.score)

    print("=== RL Policy Eval ===")
    print(f"runs={runs} steps_per_run={steps} shield={shield}")
    print(f"deaths={deaths} solved={solved}")
    print(f"avg_score={sum(scores)/len(scores):.2f} max_score={max(scores)} min_score={min(scores)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--policy", default="snake_rl_policy.json")
    ap.add_argument("--runs", type=int, default=1000)
    ap.add_argument("--steps", type=int, default=5000)
    ap.add_argument("--shield", action="store_true")
    ap.add_argument("--seed", type=int, default=20260310)
    args = ap.parse_args()

    with open(args.policy, "r", encoding="utf-8") as f:
        policy = json.load(f)
    evaluate(policy, args.runs, args.steps, args.shield, args.seed)


if __name__ == "__main__":
    main()
