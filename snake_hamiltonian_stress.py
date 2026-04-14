import random
import argparse

GRID = 20
WIDTH = 400
HEIGHT = 400
COLS = WIDTH // GRID
ROWS = HEIGHT // GRID
BOARD_CELLS = COLS * ROWS

ITERATIONS = 1000
STEPS_PER_RUN = 5000
SEED = 20260310


def build_cycle():
    cycle = []
    next_map = {}
    for cy in range(ROWS):
        if cy % 2 == 0:
            for cx in range(1, COLS):
                cycle.append((cx, cy))
        else:
            for cx in range(COLS - 1, 0, -1):
                cycle.append((cx, cy))
    for cy in range(ROWS - 1, -1, -1):
        cycle.append((0, cy))

    for i, cur in enumerate(cycle):
        nxt = cycle[(i + 1) % len(cycle)]
        next_map[cur] = nxt
    return next_map


NEXT = build_cycle()


def spawn_apple(rng, body, head):
    occupied = set(body)
    occupied.add(head)
    if len(occupied) >= BOARD_CELLS:
        return None
    while True:
        p = (rng.randrange(COLS), rng.randrange(ROWS))
        if p not in occupied:
            return p


def run(iterations, steps_per_run):
    rng = random.Random(SEED)
    deaths = 0
    solved = 0
    best_scores = []

    for _ in range(iterations):
        head = (10, 10)
        body = []
        max_cells = 4
        score = 0
        apple = spawn_apple(rng, body, head)
        dead = False

        for _step in range(steps_per_run):
            nxt = NEXT[head]
            head = nxt
            body.insert(0, head)
            if len(body) > max_cells:
                body.pop()

            if len(body) != len(set(body)):
                dead = True
                break

            if apple is not None and head == apple:
                max_cells += 1
                score += 1
                apple = spawn_apple(rng, body, head)
                if max_cells >= BOARD_CELLS:
                    solved += 1
                    break

        if dead:
            deaths += 1
        best_scores.append(score)

    print("=== Hamiltonian Snake Stress ===")
    print(f"seed={SEED}")
    print(f"runs={iterations}")
    print(f"steps_per_run={steps_per_run}")
    print(f"deaths={deaths}")
    print(f"solved_runs={solved}")
    print(f"avg_score={sum(best_scores) / len(best_scores):.2f}")
    print(f"max_score={max(best_scores)}")
    print(f"min_score={min(best_scores)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stress test for Hamiltonian snake solver.")
    parser.add_argument("--iterations", type=int, default=ITERATIONS)
    parser.add_argument("--steps", type=int, default=STEPS_PER_RUN)
    args = parser.parse_args()
    run(args.iterations, args.steps)
