---
title: "Tic-Tac-Toe"
duration_target_min: 45
concepts: [lists, pattern matching, functional programming]
keywords: [OCaml, game lab]
game: true
lab: true
---

# Practice: Tic-Tac-Toe <span class="small">(list version)</span>

Contributed by [Smayan Agarwal](https://github.com/SmayanAgarwal) in [PR \#3](https://github.com/fplaunchpad/indiafoss-2026-ocaml-workshop/pull/3).

**45-minute lab:** complete Problems 1–5. The `best_move` problem is an optional stretch. Your answers are saved locally in this browser as you type. If you get stuck, use **Check**, inspect the tests, or open the reference solution.

Need a refresher? Review [pattern matching](02-data-types.html#pattern-matching) and [matching lists](02-data-types.html#matching-lists).

Five small functions build the whole game: `current_player` runs the turn engine, `line_winner`, `winner`, and `no_empty_cells_left` feed `is_over`, which notices when the game has ended, and one stretch function, `best_move`, plays perfectly and can give you a hint.

A reference solution sits collapsed under each problem if you get stuck. Give it a real attempt first, then open it. Opening or even running one has zero effect on the board because solutions run in a "peek" mode that never touches your own bindings.

Below you can read some of the important functions and definitions that you will have to use as you code up the solutions to the given functions.

```ocaml


        type player = X | O
        (* We have two types of players X and O *)

        type cell = Empty | Taken of player
        (* every cell may be Empty or be taken by a player as denoted by Taken X or Taken O *)

        type board = cell list
        (* nine cells, index 0-8, left-to-right top-to-bottom *)

        let empty_board () = List.init 9 (fun _ -> Empty)
        (* initialises the board to be completely empty *)

        let get b i = List.nth b i
        (* gets the value of the i^th cell from the board b *)

        let set b i v = List.mapi (fun idx c -> if idx = i then v else c) b
        (* sets the i^th cell on the board b to the value v *)

        (* all the different patterns that a player may win a game via *)
        let winning_lines =
        [
        (0, 1, 2);
        (3, 4, 5);
        (6, 7, 8);
        (0, 3, 6);
        (1, 4, 7);
        (2, 5, 8);
        (0, 4, 8);
        (2, 4, 6);
        ]

```

Open the provided game code below and press **Run** to render the board. You need not read every function, though it is a useful example of idiomatic OCaml. The board starts with minimal functionality and gets built up as you finish the problems.

:::game-panel
```ocaml

          let string_of_cell = function Empty -> "." | Taken X -> "X" | Taken O -> "O"

          (* Turns a board into a <table>, one <td> per cell, each tagged with a data-xo-pos attribute recording its index 0-8 -- the one thing a click needs to carry back. *)
          let render_board b =
          let cell_html i =
          Printf.sprintf "<td data-xo-pos=\"%d\">%s</td>" i (string_of_cell (get b i))
          in
          "<table class=\"ttt\">"
          ^ String.concat ""
          (List.init 3 (fun r ->
          "<tr>"
          ^ String.concat "" (List.init 3 (fun c -> cell_html ((r * 3) + c)))
          ^ "</tr>"))
          ^ "</table>"

          type game_state = {
          mutable board : board;
          mutable hint : int option;
          }

          let state = { board = empty_board (); hint = None }

          (* Forward references to functions this cell needs but that don't exist yet -- current_player, no_empty_cells_left, winner, is_over, and best_move all live further down the page. Each ref starts as a stub; the cell that defines the real function reassigns it as its own last line. Every call below goes through `!xxx_ref`, so it always reads whatever is CURRENTLY assigned -- no re-run of this cell is ever needed to pick up a later solve. current_player_ref must come first: apply_move (just below) reads it. *)
          let current_player_ref : (board -> player) ref = ref (fun _ -> X)
          let no_empty_cells_left_ref : (board -> bool) ref = ref (fun _ -> false)
          let winner_ref : (board -> player option) ref = ref (fun _ -> None)
          let is_over_ref : (board -> bool) ref = ref (fun _ -> false)
          let best_move_ref : (board -> int option) ref = ref (fun _ -> None)

          (* PROVIDED -- not a problem: placing a mark is plumbing the game panel itself needs to function at all (every click routes through this), not a graded exercise. Unlike the other five functions above, it's a real definition right here, not a ref -- there's no "before it's solved" state for the board to fall back to. Reads current_player through its ref since current_player genuinely IS still a problem (below). *)
          let apply_move b pos =
          if get b pos <> Empty then None
            else
            let p = !current_player_ref b in
            Some (set b pos (Taken p))

            (* Checks winner_ref, no_empty_cells_left_ref, and is_over_ref directly against the CURRENT board on every call, rather than caching any of them in game_state -- a cached "is the game over" flag would only get set as a side effect of the click that filled the last square, so solving is_over any time after that (with no further click to re-trigger the check) would leave the caption stuck on "No empty cells left" forever, never catching up to "Draw!". Recomputing fresh means every caption upgrades the instant its own function is solved, no matter when that happens relative to the moves already on the board. "X wins!" shows up the moment winner is solved and a line is complete; "No empty cells left" shows up the moment no_empty_cells_left is solved and the board is full; both stand in before is_over exists to confirm the game has actually ended, at which point a drawn board's caption upgrades to "Draw!". *)
            let game_over () = !is_over_ref state.board

            let status_line () =
            match !winner_ref state.board with
            | Some X -> "X wins!"
            | Some O -> "O wins!"
            | None ->
            if !no_empty_cells_left_ref state.board then
            if game_over () then "Draw!" else "No empty cells left"
            else
            match !current_player_ref state.board with
            | X -> "X's turn"
            | O -> "O's turn"

            let hint_line () =
            match state.hint with
            | None -> ""
            | Some pos -> Printf.sprintf "<p>best move: %d</p>" pos

            let refresh () =
            Game_lib.render
            (render_board state.board ^ "<p>" ^ status_line () ^ "</p>" ^ hint_line ()
            ^ "<p><button data-xo-pos=\"reset\">New Game</button> <button \
            data-xo-pos=\"hint\">Hint</button></p>")

            let place pos =
            if not (game_over ()) then
            begin match apply_move state.board pos with
            | None -> ()
            | Some board' ->
            state.board <- board'; state.hint <- None end;
            refresh ()

            let reset () =
            state.board <- empty_board ();
            state.hint <- None;
            refresh ()

            let show_hint () =
            if not (game_over ()) then state.hint <- !best_move_ref state.board;
            refresh ()

            let () =
            Game_lib.on_click (fun payload ->
            match payload with
            | "reset" -> reset ()
            | "hint" -> show_hint ()
            | pos -> place (int_of_string pos))

              let () =
              Game_lib.on_key (fun key ->
              match int_of_string_opt key with
              | Some n when n >= 1 && n <= 9 -> place (n - 1)
                | _ -> ())

                (* Repaints whenever some OTHER cell (current_player, winner, ...) finishes running -- see src/game_host.ml's [repaint_all]. Without this, solving a problem only became visible on the board after the next click. *)
                let () = Game_lib.on_repaint refresh

                let () = refresh ()

```

:::
### Problem 1: `current_player`

:::quiz code id=ttt-q1
As of right now, the gameboard takes every input to be `X`'s turn. To get the proper functionality, you must iterate through every cell in the game board `b` and identify which player has made fewer moves.

```ocaml
let current_player b =
            failwith "not implemented"

            (* You may ignore the following line of code *)
            let () = current_player_ref := current_player
```

```ocaml skip
let check b m = if not b then failwith m
            let () =
            check (current_player (empty_board ()) = X) "empty board: X goes first";
            let b1 = set (empty_board ()) 0 (Taken X) in
            check (current_player b1 = O) "one X placed: O goes next";
            let b2 = set (set (empty_board ()) 0 (Taken X)) 1 (Taken O) in
            check (current_player b2 = X) "equal X's and O's: X goes next";
            print_endline "all tests passed"
```

:::
The `let () = current_player_ref := current_player` line is plumbing that registers your function with the board. The same line ends most of the problems below; you can ignore it each time.

Once you have finished writing your code, you can check its correctness by pressing the `Check` button.

:::solution
Reference solution:

```ocaml
let current_player b =
          let count p =
          List.fold_left (fun acc c -> if c = Taken p then acc + 1 else acc) 0 b
          in
          if count X <= count O then X else O
```

Counting each player's marks and comparing is simpler than tracking whose turn it is separately; the board alone always tells you.

:::
### Problem 2: `no_empty_cells_left`

:::quiz code id=ttt-q2
This function requires you to check whether there are any `Empty` cells left on the board. A recursive helper that pattern-matches on the list works well; the standard library's `List.for_all` is a one-line alternative.

```ocaml
let no_empty_cells_left b =
          failwith "not implemented"

          let () = no_empty_cells_left_ref := no_empty_cells_left
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          check (no_empty_cells_left (empty_board ()) = false) "empty board is not full";
          let b1 = set (List.init 9 (fun _ -> Taken X)) 8 Empty in
          check (no_empty_cells_left b1 = false) "one empty cell remaining is not full";
          let b2 = List.init 9 (fun _ -> Taken X) in
          check (no_empty_cells_left b2 = true) "fully taken board is full";
          print_endline "all tests passed"
```

:::
:::solution
Reference solution:

```ocaml
let no_empty_cells_left b =
          let rec helper list =
          match list with
          |[] -> true
          | Empty :: _ -> false
          | _ :: xs -> helper xs in
          helper b
```

`no_empty_cells_left` passes the board to the helper function, which recursively checks whether any of the cells are `Empty`. It returns `true` once it reaches the empty list `[]`, meaning no `Empty` cell was found along the way. Note that in order for `helper` to call itself, it must be declared `rec`.

:::
### Problem 3: `line_winner`

:::quiz code id=ttt-q3
Given one line of three board positions `(i, j, k)`, does it hold the same player's mark all the way across? Return that player if so. This function should return `Some X` or `Some O` if a player wins. Else it must return `None`.

```ocaml
let line_winner b (i, j, k) =
          failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          let b1 = set (set (set (empty_board ()) 0 (Taken X)) 1 (Taken X)) 2 (Taken X) in
          check (line_winner b1 (0, 1, 2) = Some X) "three X's in a line: Some X";
          let b2 = set (set (set (empty_board ()) 3 (Taken O)) 4 (Taken O)) 5 (Taken O) in
          check (line_winner b2 (3, 4, 5) = Some O) "three O's in a line: Some O";
          let b3 = set (set (empty_board ()) 0 (Taken X)) 1 (Taken O) in
          check (line_winner b3 (0, 1, 2) = None) "a mixed or partly-empty line: None";
          print_endline "all tests passed"
```

:::
This sort of a return is called an option type. Specifically this is a `player` option. It is OCaml's way of letting you safely return an answer that might be No.

:::solution
Reference solution:

```ocaml
let line_winner b (i, j, k) =
          match (get b i, get b j, get b k) with
          | Taken p1, Taken p2, Taken p3 when p1 = p2 && p2 = p3 -> Some p1
          | _ -> None
```

Pattern-matching all three positions at once means the "all taken and all equal" condition is checked in one place, and every other combination falls straight through to `None`.

:::
### Problem 4: `winner`

:::quiz code id=ttt-q4
Is there a winner anywhere on the board? Check every line in `winning_lines` with `line_winner`.

```ocaml
let winner b =
          failwith "not implemented"

          let () = winner_ref := winner
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          check (winner (empty_board ()) = None) "empty board has no winner";
          let b1 = set (set (set (empty_board ()) 0 (Taken X)) 1 (Taken X)) 2 (Taken X) in
          check (winner b1 = Some X) "a completed line gives that player as the winner";
          let b2 = set (set (set (empty_board ()) 0 (Taken X)) 1 (Taken O)) 2 (Taken X) in
          check (winner b2 = None) "no completed line gives None";
          print_endline "all tests passed"
```

:::
:::solution
Reference solution:

```ocaml
let winner b =
          List.fold_left
          (fun acc line ->
          match acc with Some _ -> acc | None -> line_winner b line)
          None winning_lines
```

`fold_left` carries "the winner found so far" (starting at `None`) across all eight lines; once it's `Some _` the rest of the lines are skipped rather than checked and possibly overwritten.

:::
### Problem 5: `is_over`

:::quiz code id=ttt-q5
Is the game over? It ends one of two ways: someone's won, or the board is completely full with nobody winning (a draw). Build it from `winner` and `no_empty_cells_left`.

```ocaml
let is_over b =
          failwith "not implemented"


          let () = is_over_ref := is_over
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          check (is_over (empty_board ()) = false) "empty board: not over";
          let b1 = set (set (set (empty_board ()) 0 (Taken X)) 1 (Taken X)) 2 (Taken X) in
          check (is_over b1 = true) "a completed line ends the game even with empty cells left";
          let b2 = [ Taken X; Taken O; Taken X;
          Taken X; Taken O; Taken O;
          Taken O; Taken X; Taken X ] in
          check (is_over b2 = true) "a full board with no winner is a draw, also over";
          let b3 = set (empty_board ()) 0 (Taken X) in
          check (is_over b3 = false) "a board still in progress is not over";
          print_endline "all tests passed"
```

:::
:::solution
Reference solution:

```ocaml
let is_over b =
          winner b <> None || no_empty_cells_left b
```

Either half being true is enough for `||`. Nothing here needs to know why `winner` or `no_empty_cells_left` returned their results, only what they returned.

:::
### Stretch: `best_move`

:::quiz code id=ttt-q7
The game is now functionally complete. This is an advanced problem for those interested. It powers the **Hint** button, which returns the best move from the current position. Given the current board you must do a depth first search over every possible moveset assuming that players play optimally. Any move can lead to three options: Victory, Draw, and Loss. A move should be classified as Victory if there exists a single line of play that wins the game no matter what moves the opponent makes. A move is to be classified as a Draw if no matter what the player does, they can never win if the opponent plays optimally. There must also be a line of play such that the player can always draw the game. For a move to be classified as a Loss, the player must lose to the optimal play of the opponent no matter what they play.

```ocaml
let best_move b =
          failwith "not implemented"

          let () = best_move_ref := best_move
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          let b1 = set (set (set (set (empty_board ()) 0 (Taken X)) 1 (Taken X)) 3 (Taken O)) 4 (Taken O) in
          check (best_move b1 = Some 2) "X to move can win immediately at 2";
          let b2 = set (set (set (set (empty_board ()) 0 (Taken X)) 8 (Taken X)) 3 (Taken O)) 4 (Taken O) in
          check (best_move b2 = Some 5) "X to move must block O at 5";
          let b3 = [ Taken X; Taken O; Taken X;
          Taken X; Taken O; Taken O;
          Taken O; Taken X; Taken X ] in
          check (best_move b3 = None) "a finished board has no move";
          print_endline "all tests passed"
```

:::
:::solution
Reference solution:

```ocaml
let best_move b =
          let positions = List.init 9 (fun i -> i) in
          let rec score b =
          match winner b with
          | Some _ -> -1
          | None ->
          if no_empty_cells_left b then 0
          else
          positions
          |> List.filter_map (fun pos -> apply_move b pos)
          |> List.map (fun b' -> -score b')
          |> List.fold_left max min_int
          in
          positions
          |> List.filter_map (fun pos -> Option.map (fun b' -> (pos, -score b')) (apply_move b pos))
          |> List.fold_left
          (fun acc (pos, pos_score) ->
          match acc with
          | Some (_, best) when best >= pos_score -> acc
          | _ -> Some (pos, pos_score))
          None
          |> Option.map fst
```

`score` is a local helper, not a separate top-level function. Nothing outside `best_move` needs a bare position score, only the move that produces the best one. If `b` already has a winner, the player about to move here lost (`-1`). Otherwise, `List.filter_map` tries `apply_move` against every position 0 through 8 and drops the `None`s (already-taken squares) in the same pass, leaving one child board per legal move. Each child gets scored recursively from the other player's perspective and *negated individually*. Only then does `List.fold_left max` pick the best of those negated values. Negating one child's score and negating the best of several children's raw scores are not the same whenever the children disagree. The negation must happen per child, before the maximum is selected. The outer fold repeats the same negate-then-compare process one level up to select your best move.

:::
