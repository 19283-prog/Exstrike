import argparse
import json
import math
import random
from collections import deque, defaultdict
from dataclasses import dataclass


GRID = 20
WIDTH = 400
HEIGHT = 400
COLS = WIDTH // GRID
ROWS = HEIGHT // GRID

# Action space is relative to current heading.
LEFT = 0
STRAIGHT = 1
RIGHT = 2
ACTIONS = (LEFT, STRAIGHT, RIGHT)


@dataclass(frozen=True)
class Vec:
    x: int
    y: int


DIR_UP = Vec(0, -1)
DIR_RIGHT = Vec(1, 0)
DIR_DOWN = Vec(0, 1)
DIR_LEFT = Vec(-1, 0)
DIRS = (DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT)


def turn(direction: Vec, action: int) -> Vec:
    idx = DIRS.index(direction)
    if action == LEFT:
        return DIRS[(idx - 1) % 4]
    if action == RIGHT:
        return DIRS[(idx + 1) % 4]
    return direction


class SnakeEnv:
    def __init__(
        self,
        rng: random.Random,
        death_penalty: float,
        apple_reward: float,
        solve_bonus: float,
        step_penalty: float,
    ):
        self.rng = rng
        self.death_penalty = death_penalty
        self.apple_reward = apple_reward
        self.solve_bonus = solve_bonus
        self.step_penalty = step_penalty
        self.reset()

    def reset(self):
        self.direction = DIR_RIGHT
        self.head = (10, 10)
        self.body = deque([(9, 10), (8, 10), (7, 10)])
        self.length = 4
        self.score = 0
        self.steps = 0
        self.steps_since_apple = 0
        self.visits = defaultdict(int)
        self.apple = self._spawn_apple()
        self.prev_dist = self._apple_distance()
        return self._state()

    def _spawn_apple(self):
        occupied = set(self.body)
        occupied.add(self.head)
        free = [(x, y) for x in range(COLS) for y in range(ROWS) if (x, y) not in occupied]
        if not free:
            return None
        return self.rng.choice(free)

    def _in_bounds(self, pos):
        x, y = pos
        return 0 <= x < COLS and 0 <= y < ROWS

    def _blocked(self, pos):
        return (not self._in_bounds(pos)) or (pos in self.body)

    def _next_pos(self, action):
        d = turn(self.direction, action)
        return (self.head[0] + d.x, self.head[1] + d.y), d

    def _apple_distance(self):
        if self.apple is None:
            return 0
        return abs(self.head[0] - self.apple[0]) + abs(self.head[1] - self.apple[1])

    def _danger(self, action):
        nxt, _ = self._next_pos(action)
        return 1 if self._blocked(nxt) else 0

    def _food_dir(self):
        if self.apple is None:
            return 0, 0
        dx = self.apple[0] - self.head[0]
        dy = self.apple[1] - self.head[1]
        sx = 0 if dx == 0 else (1 if dx > 0 else -1)
        sy = 0 if dy == 0 else (1 if dy > 0 else -1)
        return sx, sy

    def _dir_idx(self):
        return DIRS.index(self.direction)

    def _state(self):
        danger_left = self._danger(LEFT)
        danger_straight = self._danger(STRAIGHT)
        danger_right = self._danger(RIGHT)
        food_x, food_y = self._food_dir()
        dir_idx = self._dir_idx()
        return (
            danger_left,
            danger_straight,
            danger_right,
            food_x,
            food_y,
            dir_idx,
        )

    def step(self, action):
        self.steps += 1
        self.steps_since_apple += 1

        nxt, ndir = self._next_pos(action)
        if self._blocked(nxt):
            # Strong negative for death: much larger magnitude than apple reward.
            return self._state(), self.death_penalty, True, {"event": "death"}

        self.direction = ndir
        self.body.appendleft(self.head)
        self.head = nxt
        while len(self.body) > self.length - 1:
            self.body.pop()

        reward = self.step_penalty  # small time penalty to encourage shorter solutions

        # Small shaping toward apple
        new_dist = self._apple_distance() if self.apple is not None else 0
        if new_dist < self.prev_dist:
            reward += 0.15
        elif new_dist > self.prev_dist:
            reward -= 0.10
        self.prev_dist = new_dist

        self.visits[self.head] += 1
        if self.visits[self.head] > 2:
            reward -= 0.03

        done = False
        info = {"event": "move"}

        if self.apple is not None and self.head == self.apple:
            self.score += 1
            self.length += 1
            self.steps_since_apple = 0
            reward += self.apple_reward
            self.apple = self._spawn_apple()
            self.prev_dist = self._apple_distance()
            info["event"] = "apple"
            if self.apple is None:
                done = True
                info["event"] = "solved"
                reward += self.solve_bonus

        # Starvation cutoff
        if self.steps_since_apple > 500:
            done = True
            reward -= 25.0
            info["event"] = "stalled"

        return self._state(), reward, done, info


def choose_action(q_row, epsilon, rng):
    if rng.random() < epsilon:
        return rng.choice(ACTIONS)
    return int(max(range(3), key=lambda a: q_row[a]))


def train(
    episodes,
    alpha,
    gamma,
    epsilon_start,
    epsilon_end,
    seed,
    death_penalty,
    apple_reward,
    solve_bonus,
    step_penalty,
):
    rng = random.Random(seed)
    env = SnakeEnv(
        rng=rng,
        death_penalty=death_penalty,
        apple_reward=apple_reward,
        solve_bonus=solve_bonus,
        step_penalty=step_penalty,
    )
    q = defaultdict(lambda: [0.0, 0.0, 0.0])

    eps = epsilon_start
    decay = math.exp(math.log(max(epsilon_end, 1e-6) / max(epsilon_start, 1e-6)) / max(episodes, 1))

    stats = {
        "episodes": episodes,
        "avg_score_last_200": 0.0,
        "best_score": 0,
        "deaths": 0,
        "solved": 0,
        "stalled": 0,
    }
    recent_scores = deque(maxlen=200)

    for ep in range(1, episodes + 1):
        s = env.reset()
        done = False
        episode_reward = 0.0
        max_steps = 6000
        for _ in range(max_steps):
            a = choose_action(q[s], eps, rng)
            ns, r, done, info = env.step(a)
            episode_reward += r
            q[s][a] = (1 - alpha) * q[s][a] + alpha * (r + gamma * max(q[ns]))
            s = ns
            if done:
                evt = info["event"]
                if evt == "death":
                    stats["deaths"] += 1
                elif evt == "solved":
                    stats["solved"] += 1
                elif evt == "stalled":
                    stats["stalled"] += 1
                break

        recent_scores.append(env.score)
        stats["best_score"] = max(stats["best_score"], env.score)
        eps = max(epsilon_end, eps * decay)

        if ep % 500 == 0:
            avg = sum(recent_scores) / len(recent_scores)
            print(
                f"ep={ep} eps={eps:.4f} avg200={avg:.2f} best={stats['best_score']} "
                f"death={stats['deaths']} solved={stats['solved']} stalled={stats['stalled']}"
            )

    stats["avg_score_last_200"] = (sum(recent_scores) / len(recent_scores)) if recent_scores else 0.0
    return q, stats


def export_policy(q, out_path):
    policy = {}
    for state, row in q.items():
        best_action = int(max(range(3), key=lambda a: row[a]))
        key = "|".join(map(str, state))
        policy[key] = best_action
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(policy, f, indent=2)
    return policy


def export_policy_js(policy, out_js_path):
    with open(out_js_path, "w", encoding="utf-8") as f:
        f.write("window.SNAKE_RL_POLICY = ")
        json.dump(policy, f, indent=2)
        f.write(";\n")


def main():
    parser = argparse.ArgumentParser(description="Train tabular RL policy for Snake with heavy death penalties.")
    parser.add_argument("--episodes", type=int, default=12000)
    parser.add_argument("--alpha", type=float, default=0.12)
    parser.add_argument("--gamma", type=float, default=0.95)
    parser.add_argument("--epsilon-start", type=float, default=1.0)
    parser.add_argument("--epsilon-end", type=float, default=0.02)
    parser.add_argument("--seed", type=int, default=20260310)
    parser.add_argument("--out", type=str, default="snake_rl_policy.json")
    parser.add_argument("--death-penalty", type=float, default=-300.0)
    parser.add_argument("--apple-reward", type=float, default=10.0)
    parser.add_argument("--solve-bonus", type=float, default=100.0)
    parser.add_argument("--step-penalty", type=float, default=-0.05)
    args = parser.parse_args()

    q, stats = train(
        episodes=args.episodes,
        alpha=args.alpha,
        gamma=args.gamma,
        epsilon_start=args.epsilon_start,
        epsilon_end=args.epsilon_end,
        seed=args.seed,
        death_penalty=args.death_penalty,
        apple_reward=args.apple_reward,
        solve_bonus=args.solve_bonus,
        step_penalty=args.step_penalty,
    )
    policy = export_policy(q, args.out)
    js_out = args.out[:-5] + ".js" if args.out.endswith(".json") else (args.out + ".js")
    export_policy_js(policy, js_out)
    print("=== Training Complete ===")
    print(f"policy_states={len(policy)}")
    print(f"json_out={args.out}")
    print(f"js_out={js_out}")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
