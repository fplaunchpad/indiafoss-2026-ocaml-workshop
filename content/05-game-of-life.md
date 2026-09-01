---
title: "Conway's Game of Life"
duration_target_min: 45
concepts: [lists, pattern matching, functional programming]
keywords: [OCaml, game lab]
game: true
lab: true
---

# Practice: Conway's Game of Life <span class="small">(list version)</span>

Contributed by [Smayan Agarwal](https://github.com/SmayanAgarwal) in [PR \#3](https://github.com/fplaunchpad/indiafoss-2026-ocaml-workshop/pull/3).

**45-minute lab:** complete Problems 1–3. The remaining problems are optional stretches. Your answers are saved locally in this browser as you type. If you get stuck, use **Check**, inspect the tests, or open the reference solution.

Need a refresher? Review [pattern matching](02-data-types.html#pattern-matching) and [matching lists](02-data-types.html#matching-lists).

Conway's **Game of Life** is a grid of cells, each alive or dead, and every cell updates at once under two rules. A live cell survives with 2 or 3 live neighbors; any other count kills it. A dead cell with exactly 3 live neighbors comes alive. Conway invented these two rules in 1970, and they're enough to produce complex shapes like gliders that crawl steadily across the board without ever stopping.

Below you can read some of the important functions and definitions that you will have to use as you code up the solutions to the given functions.

```ocaml

        let rows = 24 (* number of rows on the board *)
        let cols = 24 (* number of columns on the board *)

        type grid = bool list list (* alive/dead for every cell, one list of rows, each row a list of cells *)

        let make_grid () = List.init rows (fun _ -> List.init cols (fun _ -> false)) (* a fresh, all-dead board *)

        (* reads the cell at (r, c). Lists have no `.(r).(c)` syntax, so every read in this exercise goes through this instead. *)
        let get g r c = List.nth (List.nth g r) c

        (* returns a NEW board with (r, c) set to v, everything else unchanged. replace_nth is a local helper: it returns a NEW list with the element at index i replaced by v, everything else unchanged, walking the list one cell at a time (at index 0, swap in v and keep the rest as-is; otherwise keep this element and recurse on the tail with one fewer step to go). set calls it twice: once to replace the one cell within its row, then again to replace that whole (now-updated) row within the board. *)
        let set g r c v =
        let rec replace_nth i v lst =
        match lst with
        | [] -> []
        | x :: rest -> if i = 0 then v :: rest else x :: replace_nth (i - 1) v rest
        in
        replace_nth r (replace_nth c v (List.nth g r)) g

        (* keeps a coordinate on the board by wrapping it around the edge *)
        let wrap n limit = if n < 0 then n + limit else if n >= limit then n - limit else n

          (* the eight (row, column) offsets around a cell *)
          let neighbor_offsets =
          [ (-1, -1); (-1, 0); (-1, 1); (0, -1); (0, 1); (1, -1); (1, 0); (1, 1) ]

```

Open the provided game code below and press **Run** to render the board. You need not read every function, though it is a useful example of idiomatic OCaml. The board starts with minimal functionality and gets built up as you finish the problems.

:::game-panel
```ocaml

          (* PROVIDED, continued -- drawing, session state, patterns, and the board's event wiring. Uses rows/cols/grid/make_grid/get/set/wrap/ neighbor_offsets from the cell just above. *)
          let cell_html r c alive =
          Printf.sprintf "<td class=\"%s\" data-xo-pos=\"%d:%d\"></td>"
          (if alive then "life-on" else "life-off")
          r c

          let render_grid g =
          "<table class=\"life\">"
          ^ String.concat ""
          (List.init rows (fun r ->
          "<tr>"
          ^ String.concat ""
          (List.init cols (fun c -> cell_html r c (get g r c)))
          ^ "</tr>"))
          ^ "</table>"

          type session = {
          grid : grid;
          running : bool;
          speed : int; (* ms between generations *)
          gen : int;
          birth_input : string; (* current text of the Birth box *)
          survive_input : string; (* current text of the Survive box *)
          }

          let speeds = [ ("slow", 500); ("medium", 200); ("fast", 80) ]

          let new_session () =
          { grid = make_grid (); running = false; speed = 200; gen = 0;
          birth_input = "3"; survive_input = "23" }

          let session = ref (new_session ())

          (* Forward references to functions this cell needs but that don't exist yet -- population (Problem 1), advance (defined right after next_generation), and random_grid (the Stretch problem) all live further down the page. Each ref starts as a stub; the cell that defines the real function reassigns it as its own last line. Declared here, before `controls` below, because `controls` itself reads `!rule_feature_ready`/`!custom_rule_ref` directly -- a plain, single-cell "used before declared" mistake if they lived any later, unrelated to any of the cross-cell forward-reference machinery this comment is otherwise about. *)

          let population_ref : (grid -> int) ref = ref (fun _ -> failwith "not implemented")
          let advance_ref : (unit -> unit) ref = ref (fun () -> ())
          let random_grid_ref : (float -> grid) ref = ref (fun _ -> failwith "not implemented")

          (* The same forward-reference trick, for the two stretch problems all the way at the bottom of the page (parse_rule and next_cell_state_general). *)
          let parse_rule_ref : (int -> int -> int list * int list) ref =
          ref (fun _ _ -> failwith "not implemented")
          let next_cell_state_general_ref : (int list * int list -> bool -> int -> bool) ref =
          ref (fun _ _ _ -> failwith "not implemented")
          let custom_rule_ref : (string * (int list * int list)) option ref = ref None
          let rule_feature_ready = ref false

          let button pos label active =
          Printf.sprintf "<button data-xo-pos=\"%s\" class=\"%s\">%s</button>" pos
          (if active then "on" else "")
          label

          (* A text field whose value only reaches Game_lib.on_input once the student leaves it *)
          let text_input pos label value =
          Printf.sprintf
          "<label>%s <input type=\"text\" inputmode=\"numeric\" size=\"6\" maxlength=\"9\" data-xo-pos=\"%s\"
          value=\"%s\"></label>"
          label pos value

          let controls s =
          "<div class=\"controls\">"
          ^ button "run" (if s.running then "Stop" else "Start") s.running
          ^ button "step" "Step" false
          ^ button "clear" "Clear" false
          ^ button "random" "Random" false
          ^ "</div><div class=\"controls\">"
          ^ String.concat ""
          (List.map (fun (name, ms) -> button name name (s.speed = ms)) speeds)
          ^ "</div><div class=\"controls\">"
          ^ button "pattern:glider" "Glider" false
          ^ button "pattern:pulsar" "Pulsar" false
          ^ button "pattern:spaceship" "Spaceship" false
          ^ button "pattern:pentadecathlon" "Pentadecathlon" false
          ^ "</div>"
          ^ (if not !rule_feature_ready then ""
          else
          "<div class=\"controls\">"
          ^ button "rule:conway" "Conway" (!custom_rule_ref = None)
          ^ button "rule:highlife" "HighLife"
          (match !custom_rule_ref with Some ("HighLife", _) -> true | _ -> false)
          ^ button "rule:seeds" "Seeds"
          (match !custom_rule_ref with Some ("Seeds", _) -> true | _ -> false)
          ^ button "rule:maze" "Maze"
          (match !custom_rule_ref with Some ("Maze", _) -> true | _ -> false)
          ^ "</div><div class=\"controls\">"
          ^ text_input "birth-input" "Birth" s.birth_input
          ^ text_input "survive-input" "Survive" s.survive_input
          ^ "</div>")

          let beep freq ms = Game_lib.play ~freq ~ms

          (* The clock is REQUESTED, not run, by this cell: [every] states a rate and the page's main thread owns the actual timer (the worker has no DOM and no way to cancel a stale one). [every 0] stops it. *)
          let sync_clock () =
          let s = !session in
          Game_lib.every (if s.running then s.speed else 0)

          let set_speed ms =
          session := { !session with speed = ms };
          sync_clock ()

          (* PROVIDED -- a handful of classic Life patterns, so the board can show off what this game is actually capable of before you've written a line of code. *)

          let pattern_of_lines lines ~r0 ~c0 =
          let g = ref (make_grid ()) in
          List.iteri
          (fun dr line ->
          String.iteri
          (fun dc ch ->
          if ch = '#' then g := set !g (wrap (r0 + dr) rows) (wrap (c0 + dc) cols) true)
          line)
          lines;
          !g

          let glider_pattern = [ ".#."; "..#"; "###" ]

          let pulsar_pattern =
          [
          "..###...###..";
          ".............";
          "#....#.#....#";
          "#....#.#....#";
          "#....#.#....#";
          "..###...###..";
          ".............";
          "..###...###..";
          "#....#.#....#";
          "#....#.#....#";
          "#....#.#....#";
          ".............";
          "..###...###..";
          ]

          let spaceship_pattern = [ ".####"; "#...#"; "....#"; "#..#." ]
          let pentadecathlon_pattern = [ "..#....#.."; "##.####.##"; "..#....#.." ]

          let load_pattern name =
          match name with
          | "glider" -> Some (pattern_of_lines glider_pattern ~r0:2 ~c0:2)
          | "pulsar" -> Some (pattern_of_lines pulsar_pattern ~r0:5 ~c0:5)
          | "spaceship" -> Some (pattern_of_lines spaceship_pattern ~r0:10 ~c0:1)
          | "pentadecathlon" -> Some (pattern_of_lines pentadecathlon_pattern ~r0:11 ~c0:7)
          | _ -> None

          (* PROVIDED. Drawing on the board never depends on a graded exercise, so these live here too -- clicking or dragging a cell to flip it works from the very first page load, before you've solved anything below. *)

          let set_cell g r c alive = set g r c alive

          let toggle_cell g r c =
          set_cell g r c (not (get g r c))

          let population_opt g = try Some (!population_ref g) with _ -> None

          let refresh () =
          let s = !session in
          let population_caption =
          match population_opt s.grid with
          | Some n -> string_of_int n
          | None -> "?"
          in
          let rule_caption =
          match !custom_rule_ref with
          | None -> ""
          | Some (label, _) -> Printf.sprintf " — rule %s" label
          in
          Game_lib.render
          (render_grid s.grid ^ controls s
          ^ Printf.sprintf "<p>generation %d — population %s%s</p>" s.gen
          population_caption rule_caption)

          let handle_mouse (m : Game_lib.mouse) =
          let s = !session in
          match m.pos with
          | "birth-input" | "survive-input" -> ()
          | _ ->
          (match m.pos with
          | "run" ->
          session := { s with running = not s.running };
          beep (if s.running then 300 else 480) 70;
          sync_clock ()
          | "step" -> if not s.running then !advance_ref ()
          | "clear" ->
          session := { s with grid = make_grid (); gen = 0; running = false };
          beep 240 70;
          sync_clock ()
          | "random" -> (
          match (try Some (!random_grid_ref 0.28) with _ -> None) with
          | Some g ->
          session := { s with grid = g; gen = 0 };
          beep 520 70
          | None -> ())
          | pos when String.length pos > 8 && String.sub pos 0 8 = "pattern:" -> (
          let name = String.sub pos 8 (String.length pos - 8) in
          match load_pattern name with
          | Some g ->
          session := { s with grid = g; gen = 0 };
          beep 440 90
          | None -> ())
          | pos when String.length pos > 5 && String.sub pos 0 5 = "rule:" ->
          (* Fills in the Birth/Survive boxes with the numbers that make up the preset, whether or not parse_rule is written yet -- the whole point of the buttons is to show that tuning Life is just two numbers, even before you can press one. *)
          let apply label birth survive =
          session := { s with birth_input = string_of_int birth; survive_input = string_of_int survive };
          match (try Some (!parse_rule_ref birth survive) with _ -> None) with
          | Some rule ->
          custom_rule_ref := Some (label, rule);
          beep 380 90
          | None -> ()
          in
          (match String.sub pos 5 (String.length pos - 5) with
          | "conway" ->
          custom_rule_ref := None;
          session := { s with birth_input = "3"; survive_input = "23" };
          beep 300 90
          | "highlife" -> apply "HighLife" 36 23
          | "seeds" -> apply "Seeds" 2 0
          | "maze" -> apply "Maze" 3 12345
          | _ -> ())
          | "slow" -> set_speed 500
          | "medium" -> set_speed 200
          | "fast" -> set_speed 80
          | pos -> (
          match String.split_on_char ':' pos with
          | [ r; c ] -> (
          let r = int_of_string r and c = int_of_string c in
          match (m.drag, m.button) with
          | false, _ -> session := { s with grid = toggle_cell s.grid r c }
          | true, `Left -> session := { s with grid = set_cell s.grid r c true }
          | true, `Right ->
          session := { s with grid = set_cell s.grid r c false })
          | _ -> ()));
          refresh ()

          let valid_rule_number s =
          s <> "" && String.for_all (fun ch -> ch >= '0' && ch <= '9') s

          let apply_birth_survive birth_str survive_str =
          if valid_rule_number birth_str && valid_rule_number survive_str then
          match (try Some (!parse_rule_ref (int_of_string birth_str) (int_of_string survive_str)) with _ -> None) with
          | Some rule ->
          custom_rule_ref := Some ("Custom", rule);
          beep 380 90
          | None -> ()

              let handle_input pos value =
              let s = !session in
              (match pos with
              | "birth-input" ->
              session := { s with birth_input = value };
              apply_birth_survive value s.survive_input
              | "survive-input" ->
              session := { s with survive_input = value };
              apply_birth_survive s.birth_input value
              | _ -> ());
              refresh ()

              let handle_key key =
              (match key with
              | " " | "Spacebar" ->
              session := { !session with running = not !session.running };
              sync_clock ()
              | "Enter" -> if not !session.running then !advance_ref ()
              | "c" | "C" -> session := { !session with grid = make_grid (); gen = 0 }
              | "r" | "R" -> (
              match (try Some (!random_grid_ref 0.28) with _ -> None) with
              | Some g -> session := { !session with grid = g; gen = 0 }
              | None -> ())
              | _ -> ());
              refresh ()

              let () = Game_lib.on_mouse handle_mouse
              let () = Game_lib.on_key handle_key
              let () = Game_lib.on_input handle_input

              let () =
              Game_lib.on_tick (fun () ->
              !advance_ref ();
              refresh ())

              (* Repaints whenever some OTHER cell (population, count_live_neighbors, advance, ...) finishes running -- see src/game_host.ml's [repaint_all]. Without this, solving a problem only became visible on the board after the next click/keypress/tick, since [refresh] called from that OTHER cell's own code paints into that cell's own output, never into #game-panel. *)
              let () = Game_lib.on_repaint refresh

              let () = refresh ()

```

:::
## Background

### Problem 1: `population`

:::quiz code id=life-q1
How many cells on the whole board are alive right now? You must iterate over every row and column for this.

```ocaml
let population g =
          failwith "not implemented"

          let () = population_ref := population
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          check (population (make_grid ()) = 0) "empty grid has population 0";
          check (population (List.init rows (fun _ -> List.init cols (fun _ -> true))) = rows * cols)
          "fully alive grid has population rows*cols";
          let g = set (set (set (make_grid ()) 0 0 true) 0 1 true) 5 5 true in
          check (population g = 3) "hand-set 3-cell grid has population 3";
          print_endline "all tests passed"
```

:::
:::solution
Reference solution:

```ocaml
let population g =
          let count_row row =
          List.fold_left (fun total alive -> if alive then total + 1 else total) 0 row
          in
          List.fold_left (fun total row -> total + count_row row) 0 g
```

This uses two `List.fold_left` calls. One counts the live cells in a single row. The other adds up those row counts across the whole grid.

:::
### Problem 2: `count_live_neighbors`

:::quiz code id=life-q2
How many of the cell at `(r, c)`'s eight neighbors are alive? Use `wrap` so a cell right on the edge of the board still sees all eight.

```ocaml
let count_live_neighbors g r c =
          failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          let g = set (set (set (make_grid ()) 5 4 true) 5 5 true) 5 6 true in
          check (count_live_neighbors g 5 5 = 2) "blinker middle cell sees 2 live neighbors";
          check (count_live_neighbors g 5 4 = 1) "blinker end cell sees 1 live neighbor";

          let g2 = set (make_grid ()) 10 10 true in
          check (count_live_neighbors g2 10 10 = 0)
          "a live cell does not count itself as its own neighbor";

          let g3 = set (set (make_grid ()) 23 23 true) 0 23 true in
          check (count_live_neighbors g3 0 0 = 2)
          "corner (0,0) sees neighbors that wrap off the opposite edges";
          print_endline "all tests passed"
```

:::
:::solution
Reference solution:

```ocaml
let count_live_neighbors g r c =
          let neighbor_is_alive (dr, dc) =
          get g (wrap (r + dr) rows) (wrap (c + dc) cols)
          in
          let alive_neighbors =
          List.filter (fun offset -> neighbor_is_alive offset) neighbor_offsets
          in
          List.length alive_neighbors
```

`neighbor_is_alive` tests one offset against the board. `List.filter` keeps the offsets that pass that test, and `List.length` counts how many are left.

:::
### Problem 3: `next_cell_state`

:::quiz code id=life-q3
Given whether a cell is alive right now and how many live neighbors it has, is it alive next generation?

- a live cell with 2 or 3 live neighbors survives; anything else dies
- a dead cell with exactly 3 live neighbors is born

```ocaml
let next_cell_state alive live_neighbors =
          failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          check (next_cell_state true 2 = true) "a live cell with 2 neighbors survives";
          check (next_cell_state true 3 = true) "a live cell with 3 neighbors survives";
          check (next_cell_state true 1 = false) "a live cell with 1 neighbor dies (underpopulation)";
          check (next_cell_state true 4 = false) "a live cell with 4 neighbors dies (overpopulation)";
          check (next_cell_state false 3 = true) "a dead cell with exactly 3 neighbors is born";
          check (next_cell_state false 2 = false) "a dead cell with 2 neighbors stays dead";
          print_endline "all tests passed"
```

:::
:::solution
Reference solution:

```ocaml
let next_cell_state alive live_neighbors =
          match (alive, live_neighbors) with
          | true, (2 | 3) -> true
          | false, 3 -> true
          | _ -> false
```

This is a direct transcription of the two rules into pattern matches. The first two cases are survive-on-2-or-3 and born-on-exactly-3. The wildcard below them marks everything else dead.

:::
### Provided: `next_generation`

The next function is provided. It computes a new generation without changing the board it receives, demonstrating the immutability of lists. Open the block and run it before continuing.

:::provided
```ocaml

          let next_generation g =
          List.init rows (fun r ->
          List.init cols (fun c -> next_cell_state (get g r c) (count_live_neighbors g r c)))

```

:::
The function above creates the new board. The provided plumbing below connects it to the controls; open the block and run it too.

### Provided: advancing a generation

:::provided
```ocaml

          (* Composes with count_live_neighbors (Problem 2, above) the same way next_generation composes with next_cell_state -- used only once a rule preset button is pressed (see the setup cell's custom_rule_ref), which needs the general STUDENT rule function from further down the page instead of the hardcoded next_cell_state this cell already has. *)
          let next_generation_general (birth, survive) g =
          List.init rows (fun r ->
          List.init cols (fun c ->
          !next_cell_state_general_ref (birth, survive) (get g r c)
          (count_live_neighbors g r c)))

          let advance () =
          let s = !session in
          let next_grid =
          match !custom_rule_ref with
          | None -> (try Some (next_generation s.grid) with _ -> None)
          | Some (_, rule) -> (try Some (next_generation_general rule s.grid) with _ -> None)
          in
          match next_grid with
          | None -> () (* count_live_neighbors / next_cell_state not real yet *)
          | Some g' ->
          let died_out =
          match population_opt g', population_opt s.grid with
          | Some 0, Some p when p > 0 -> true
          | _ -> false
          in
          let stalled = g' = s.grid in
          session := { s with grid = g'; gen = s.gen + 1 };
          if died_out then (
          beep 160 260;
          session := { !session with running = false };
          sync_clock ())
          else if stalled && s.running then (
          (* A still life: nothing will ever change again, so stop rather than burn a tick every 200ms redrawing an identical board. *)
          beep 330 120;
          session := { !session with running = false };
          sync_clock ())

          let () = advance_ref := advance

```

:::
### Provided: try some classics

Before the stretch problems, try the four pattern buttons on the board. **Glider** is the simplest thing that moves: five cells that walk diagonally forever, reproducing their shape every four generations. **Pulsar** stays put, expanding and contracting on a three-generation cycle. **Spaceship** travels in a straight line, while **Pentadecathlon** stays put on a longer 15-generation cycle.

### Stretch: `random_grid`

:::quiz code id=life-q4
A board where each cell is alive with roughly probability `p`, somewhere from 0.0 to 1.0.

```ocaml
let random_grid p =
          failwith "not implemented"

          (* PROVIDED -- registers your function with the board (see the setup cell's random_grid_ref) so Random and the r/R key pick it up on the very next press. *)
          let () = random_grid_ref := random_grid
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          let g0 = random_grid 0.0 in
          check (List.length g0 = rows) "the grid has `rows` rows";
          check (List.for_all (fun row -> List.length row = cols) g0) "every row has `cols` cells";
          check (population g0 = 0) "p = 0.0 leaves every cell dead";
          check (population (random_grid 1.0) = rows * cols) "p = 1.0 makes every cell alive";
          print_endline "all tests passed"
```

:::
:::solution
Reference solution:

```ocaml
let random_grid p =
          List.init rows (fun _ -> List.init cols (fun _ -> Random.float 1.0 < p))
```

Unlike the array version of this exercise, there is no in-place fill here. A list has no cell to mutate, so the only way to build one is to give `List.init` a function that produces each cell afresh. The outer `List.init` builds the rows, the inner one fills each row, and `Random.float 1.0 < p` is the coin flip: a number is picked uniformly between 0.0 and 1.0, and it lands below `p` with probability exactly `p`.

:::
### Stretch: `parse_rule`

:::quiz code id=life-q5
Conway's rules ("a live cell survives on 2 or 3 neighbors, a dead cell is born on exactly 3") are one example of a whole family of similar automata. Two numbers describe any of them: a **Birth** number, whose digits are the neighbor counts that bring a dead cell to life, and a **Survive** number, whose digits are the neighbor counts a live cell survives on. Conway is birth `3`, survive `23`: born on exactly 3 neighbors and surviving on 2 or 3. Change birth to `36` and you get "HighLife", a different automaton on the same grid that is famous for containing a small pattern that *replicates itself*. Standard Life has no known example of such a pattern. `parse_rule` turns those two numbers into the lists that `next_cell_state_general` will use, one `int` per digit: `parse_rule 3 23` becomes `([3], [2; 3])`.

```ocaml
let parse_rule birth survive =
          failwith "not implemented"

          (* PROVIDED -- registers your function with the board (see the setup cell's parse_rule_ref); the rule preset buttons and the Birth/Survive text boxes beside the board call through this the moment you press or edit one, no re-run needed. *)
          let () = parse_rule_ref := parse_rule
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          check (parse_rule 3 23 = ([3], [2; 3])) "parse_rule 3 23 = ([3], [2;3]) (standard Life)";
          check (parse_rule 36 23 = ([3; 6], [2; 3])) "parse_rule 36 23 = ([3;6], [2;3]) (HighLife)";
          check (parse_rule 2 0 = ([2], [])) "parse_rule 2 0 = ([2], []) (Seeds has no survival rule)";
          print_endline "all tests passed"
```

:::
:::solution
Reference solution:

```ocaml
let parse_rule birth survive =
          let digits_of n =
          let rec loop n acc =
          if n <= 0 then acc
          else loop (n / 10) (n mod 10 :: acc)
          in
          loop n []
          in
          (digits_of birth, digits_of survive)
```

`digits_of` turns a number like `36` into the list `[3; 6]` by peeling digits off the low end with arithmetic: `n mod 10` is the last digit, and `n / 10` is everything before it. `loop` keeps doing that, consing each digit onto the front of `acc`. The accumulator ends up in the right order even though the digits are discovered least-significant first: `36` gives up `6`, then `3`, and consing `3` onto the front of `[6]` restores reading order. `0` (or a negative number) has no digits worth keeping, so it becomes `[]`, which is exactly the empty survive rule Seeds needs.

:::
### Stretch: `next_cell_state_general`

:::quiz code id=life-q6
This is the general version of Problem 3's `next_cell_state`. Instead of baking the rule numbers 2, 3 and 3 directly into the code, take the `(birth, survive)` lists produced by `parse_rule` and look up the neighbor count in the applicable list: `survive` if the cell is alive now, or `birth` if it is dead. You may use `List.mem`, which answers "is this number in that list?" directly, so no match is required.

```ocaml
let next_cell_state_general (birth, survive) alive live_neighbors =
          failwith "not implemented"

          let () = next_cell_state_general_ref := next_cell_state_general
          let () = rule_feature_ready := true
```

```ocaml skip
let check b m = if not b then failwith m
          let () =
          let conway = parse_rule 3 23 in
          List.iter
          (fun alive ->
          List.iter
          (fun n ->
          check
          (next_cell_state_general conway alive n = next_cell_state alive n)
          (Printf.sprintf "conway rule agrees with next_cell_state (alive=%b, neighbors=%d)" alive n))
          [0; 1; 2; 3; 4; 5; 6; 7; 8])
          [true; false];
          let highlife = parse_rule 36 23 in
          check (next_cell_state_general highlife false 6 = true) "HighLife: a dead cell with 6 neighbors is born";
          check (next_cell_state_general conway false 6 = false) "standard Life: a dead cell with 6 neighbors stays dead";
          print_endline "all tests passed"
```

:::
:::solution
Reference solution:

```ocaml
let next_cell_state_general (birth, survive) alive live_neighbors =
          if alive then List.mem live_neighbors survive else List.mem live_neighbors birth
```

Everything Problem 3's `match` hardcoded as literal numbers is now data: `survive` and `birth` are just lists to search, and `List.mem` does the searching. Feed it `parse_rule 3 23` and it behaves exactly like `next_cell_state`; feed it two different numbers and the whole simulation changes rule without a single line of code being edited.

:::
