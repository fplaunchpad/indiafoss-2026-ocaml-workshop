#!/usr/bin/env python3
"""Extract and validate OCaml cells in the generated game-lab pages."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import tempfile


GAME_LIB_STUB = r"""
module Game_lib = struct
  type mouse = {
    pos : string;
    drag : bool;
    button : [ `Left | `Right ];
  }

  let render (_ : string) = ()
  let play ~freq:(_ : int) ~ms:(_ : int) = ()
  let every (_ : int) = ()
  let on_click (_ : string -> unit) = ()
  let on_mouse (_ : mouse -> unit) = ()
  let on_key (_ : string -> unit) = ()
  let on_input (_ : string -> string -> unit) = ()
  let on_tick (_ : unit -> unit) = ()
  let on_repaint (_ : unit -> unit) = ()
end
"""


@dataclass
class Cell:
    source: str
    quiz_id: str | None
    is_test: bool
    is_solution: bool
    number: int


class GamePageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, dict[str, str]]] = []
        self.cells: list[Cell] = []
        self.cell_attrs: dict[str, str] | None = None
        self.cell_parts: list[str] = []
        self.cell_quiz_id: str | None = None
        self.cell_is_solution = False

    @staticmethod
    def classes(attrs: dict[str, str]) -> set[str]:
        return set(attrs.get("class", "").split())

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {key: value or "" for key, value in attrs_list}
        self.stack.append((tag, attrs))
        if tag != "x-ocaml":
            return

        self.cell_attrs = attrs
        self.cell_parts = []
        self.cell_quiz_id = next(
            (ancestor.get("data-quiz-id") for _, ancestor in reversed(self.stack[:-1])
             if ancestor.get("data-quiz-id")),
            None,
        )
        self.cell_is_solution = any(
            ancestor_tag == "details" and "solution" in self.classes(ancestor)
            for ancestor_tag, ancestor in self.stack[:-1]
        )

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        # The game sources contain no self-closing x-ocaml elements, but other
        # HTML void elements must not remain on the ancestor stack.
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        if self.cell_attrs is not None:
            self.cell_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "x-ocaml" and self.cell_attrs is not None:
            self.cells.append(
                Cell(
                    source="".join(self.cell_parts).strip() + "\n",
                    quiz_id=self.cell_quiz_id,
                    is_test="data-quiz-test" in self.cell_attrs,
                    is_solution=self.cell_is_solution,
                    number=len(self.cells) + 1,
                )
            )
            self.cell_attrs = None
            self.cell_parts = []

        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break


def parse_cells(path: Path) -> list[Cell]:
    parser = GamePageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    parser.close()
    if parser.cell_attrs is not None:
        raise ValueError(f"{path}: unclosed <x-ocaml> element")
    if not parser.cells:
        raise ValueError(f"{path}: no <x-ocaml> cells found")
    return parser.cells


def solution_map(path: Path, cells: list[Cell]) -> dict[str, Cell]:
    quizzes: dict[str, dict[str, Cell]] = {}
    pending_quiz: str | None = None

    for cell in cells:
        if cell.quiz_id:
            entry = quizzes.setdefault(cell.quiz_id, {})
            key = "test" if cell.is_test else "student"
            if key in entry:
                raise ValueError(f"{path}: duplicate {key} cell for {cell.quiz_id}")
            entry[key] = cell
            pending_quiz = cell.quiz_id
        elif cell.is_solution:
            if pending_quiz is None:
                raise ValueError(f"{path}: solution cell {cell.number} has no preceding quiz")
            entry = quizzes[pending_quiz]
            if "solution" in entry:
                raise ValueError(f"{path}: duplicate solution for {pending_quiz}")
            entry["solution"] = cell
            pending_quiz = None

    for quiz_id, entry in quizzes.items():
        missing = {"student", "test", "solution"} - entry.keys()
        if missing:
            raise ValueError(f"{path}: {quiz_id} is missing {', '.join(sorted(missing))}")

    return {quiz_id: entry["solution"] for quiz_id, entry in quizzes.items()}


def source_block(path: Path, cell: Cell, source: str | None = None) -> str:
    label = f"{path.as_posix()}#cell-{cell.number}"
    return f'\n# 1 "{label}"\n{source if source is not None else cell.source}\n'


def student_program(path: Path, cells: list[Cell]) -> str:
    parts = [GAME_LIB_STUB]
    parts.extend(source_block(path, cell) for cell in cells if not cell.is_solution)
    return "".join(parts)


def reference_program(path: Path, cells: list[Cell], solutions: dict[str, Cell]) -> str:
    parts = [GAME_LIB_STUB]
    for cell in cells:
        if cell.is_solution:
            continue
        if cell.quiz_id and not cell.is_test:
            solution = solutions[cell.quiz_id]
            # Solution cells run in x-ocaml's side-effect-free peek mode, so
            # they deliberately omit the student's final forward-reference
            # assignments (for example [winner_ref := winner]). When building
            # a complete reference page, retain those wiring assignments from
            # the student cell after substituting the function body.
            assignments = "\n".join(
                line.strip()
                for line in cell.source.splitlines()
                if re.match(
                    r"^\s*let\s+\(\)\s*=\s*[A-Za-z_][A-Za-z0-9_]*\s*:=\s*.+$",
                    line,
                )
            )
            replacement = solution.source
            if assignments:
                replacement += "\n" + assignments + "\n"
            parts.append(source_block(path, solution, replacement))
        else:
            parts.append(source_block(path, cell))
    return "".join(parts)


def run(command: list[str], *, cwd: Path, description: str) -> None:
    completed = subprocess.run(command, cwd=cwd, text=True, capture_output=True)
    if completed.returncode == 0:
        return
    details = "\n".join(part for part in (completed.stdout, completed.stderr) if part.strip())
    raise RuntimeError(f"{description} failed:\n{details}")


def check_page(path: Path) -> tuple[int, int]:
    cells = parse_cells(path)
    solutions = solution_map(path, cells)

    with tempfile.TemporaryDirectory(prefix="game-cell-check-") as temp_name:
        temp = Path(temp_name)
        student = temp / "student_cells.ml"
        reference = temp / "reference_cells.ml"
        student.write_text(student_program(path, cells), encoding="utf-8")
        reference.write_text(reference_program(path, cells, solutions), encoding="utf-8")

        run(
            ["opam", "exec", "--", "ocamlc", "-c", student.name],
            cwd=temp,
            description=f"{path}: authored-cell compilation",
        )
        run(
            ["opam", "exec", "--", "ocamlc", "-o", "reference-check", reference.name],
            cwd=temp,
            description=f"{path}: reference-solution compilation",
        )
        run(
            [str(temp / "reference-check")],
            cwd=temp,
            description=f"{path}: reference-solution tests",
        )

    return len(cells), len(solutions)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pages", nargs="+", type=Path)
    args = parser.parse_args()

    for page in args.pages:
        try:
            cell_count, quiz_count = check_page(page)
        except (OSError, ValueError, RuntimeError) as error:
            parser.exit(1, f"game-cell-check: {error}\n")
        print(f"{page}: {cell_count} cells compiled; {quiz_count} reference quizzes passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
