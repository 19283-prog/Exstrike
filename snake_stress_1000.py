import random
import argparse
from collections import deque
from dataclasses import dataclass

GRID = 20
WIDTH = 400
HEIGHT = 400
COLS = WIDTH // GRID
ROWS = HEIGHT // GRID
BOARD_CELLS = COLS * ROWS

ITERATIONS = 1000
MAX_STEPS_PER_GAME = 20
SEED = 20260308


@dataclass
class Point:
    x: int
    y: int


class SnakeGame:
    def __init__(self, rng: random.Random):
        self.rng = rng
        self.best_score = 0
        self.reset()

    def random_pos(self) -> Point:
        return Point(self.rng.randrange(COLS) * GRID, self.rng.randrange(ROWS) * GRID)

    def in_bounds(self, p: Point) -> bool:
        return 0 <= p.x < WIDTH and 0 <= p.y < HEIGHT

    def is_body(self, p: Point) -> bool:
        return any(c.x == p.x and c.y == p.y for c in self.cells)

    def spawn_apple(self) -> None:
        if len(self.cells) >= BOARD_CELLS:
            return
        while True:
            p = self.random_pos()
            if not self.is_body(p) and not (p.x == self.x and p.y == self.y):
                self.apple = p
                return

    def reset(self) -> None:
        self.x = 200
        self.y = 200
        self.dx = GRID
        self.dy = 0
        self.cells = []
        self.max_cells = 4
        self.score = 0
        self.apple = Point(100, 100)
        self.spawn_apple()

    def neighbors(self, p: Point, body: list[Point]) -> list[Point]:
        candidates = [
            Point(p.x + GRID, p.y),
            Point(p.x - GRID, p.y),
            Point(p.x, p.y + GRID),
            Point(p.x, p.y - GRID),
        ]
        out = []
        for n in candidates:
            if not self.in_bounds(n):
                continue
            if any(c.x == n.x and c.y == n.y for c in body):
                continue
            out.append(n)
        return out

    def bfs(self, start: Point, target: Point | None, body: list[Point]) -> list[Point] | None:
        if target is None:
            return None
        queue = deque([(start, [], body[:])])
        visited = {(start.x, start.y)}
        while queue:
            cur, path, future = queue.popleft()
            if cur.x == target.x and cur.y == target.y:
                return path
            for n in self.neighbors(cur, future):
                key = (n.x, n.y)
                if key in visited:
                    continue
                visited.add(key)
                new_future = [Point(n.x, n.y)] + future
                if len(new_future) > self.max_cells:
                    new_future.pop()
                queue.append((n, path + [Point(n.x, n.y)], new_future))
        return None

    def flood_area(self, start: Point, body: list[Point]) -> int:
        q = deque([start])
        seen = {(start.x, start.y)}
        while q:
            p = q.popleft()
            for n in self.neighbors(p, body):
                key = (n.x, n.y)
                if key not in seen:
                    seen.add(key)
                    q.append(n)
        return len(seen)

    def ai_move(self) -> None:
        head = Point(self.x, self.y)
        path = self.bfs(head, self.apple, self.cells)
        if path:
            next_p = path[0]
            self.dx = next_p.x - self.x
            self.dy = next_p.y - self.y
            return

        tail = self.cells[-1] if self.cells else None
        tail_path = self.bfs(head, tail, self.cells)
        if tail_path:
            next_p = tail_path[0]
            self.dx = next_p.x - self.x
            self.dy = next_p.y - self.y
            return

        fallback = self.neighbors(head, self.cells)
        if fallback:
            fallback.sort(key=lambda p: self.flood_area(p, self.cells), reverse=True)
            next_p = fallback[0]
            self.dx = next_p.x - self.x
            self.dy = next_p.y - self.y

    def self_collision(self) -> bool:
        if not self.cells:
            return False
        head = self.cells[0]
        return any(head.x == c.x and head.y == c.y for c in self.cells[1:])

    def step(self) -> bool:
        self.ai_move()
        self.x += self.dx
        self.y += self.dy
        if not self.in_bounds(Point(self.x, self.y)):
            return False

        self.cells.insert(0, Point(self.x, self.y))
        if len(self.cells) > self.max_cells:
            self.cells.pop()

        if self.self_collision():
            return False

        head = self.cells[0]
        if head.x == self.apple.x and head.y == self.apple.y:
            self.max_cells += 1
            self.score += 1
            self.best_score = max(self.best_score, self.score)
            self.spawn_apple()

        # Perfect run: fills entire board.
        if self.max_cells >= BOARD_CELLS:
            return False
        return True


def run_benchmark(iterations: int, max_steps: int) -> None:
    rng = random.Random(SEED)
    scores = []
    best_scores = []
    steps = []
    crashes = 0

    for _ in range(iterations):
        game = SnakeGame(rng)
        s = 0
        alive = True
        while alive and s < max_steps:
            try:
                alive = game.step()
            except Exception:
                crashes += 1
                break
            s += 1
        scores.append(game.score)
        best_scores.append(game.best_score)
        steps.append(s)

    avg_score = sum(scores) / len(scores)
    max_score = max(scores)
    min_score = min(scores)
    avg_steps = sum(steps) / len(steps)

    print("=== Snake AI Stress ===")
    print(f"seed={SEED}")
    print(f"runs={iterations}")
    print(f"max_steps_per_game={max_steps}")
    print(f"crashes={crashes}")
    print(f"avg_score={avg_score:.2f}")
    print(f"min_score={min_score}")
    print(f"max_score={max_score}")
    print(f"avg_steps={avg_steps:.1f}")
    print(f"runs_ge_50={sum(1 for x in scores if x >= 50)}")
    print(f"runs_ge_100={sum(1 for x in scores if x >= 100)}")
    print(f"runs_ge_150={sum(1 for x in scores if x >= 150)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stress test Snake AI logic.")
    parser.add_argument("--iterations", type=int, default=ITERATIONS)
    parser.add_argument("--max-steps", type=int, default=MAX_STEPS_PER_GAME)
    args = parser.parse_args()
    run_benchmark(args.iterations, args.max_steps)
