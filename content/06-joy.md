---
title: "Joy: Creative Coding"
concepts: [shapes, colors, transformations, higher-order functions]
keywords: [OCaml, Joy, creative coding, generative art, SVG]
toplevel_load: assets/x-ocaml/joy_core.js
reading:
  - title: "ocaml-joy repository"
    url: https://github.com/Sudha247/ocaml-joy
---

# Joy: creative coding

[Joy](https://github.com/Sudha247/ocaml-joy) is a small creative-coding
library for OCaml by Sudha Parimala and Kaustubh Maske Patil (MIT
license). You describe pictures as values: shapes that you combine and
transform with ordinary functions, then render as SVG right below the
code.

This page is a sandbox, not part of the guided session. There are no
problems and no checks. Use it during the game lab or afterwards if you
would rather draw than build a game. Everything you learned in Parts 1
and 2 (functions, `|>`, labelled arguments, lists) applies directly.

Run the cells from top to bottom: the setup cell first, then any cell
you like. Edit anything and re-run it. Your edits are saved locally in
this browser as you type.

This page adapts the interactive notebook from the
[ocaml-joy repository](https://github.com/Sudha247/ocaml-joy).

## Setup

This cell defines `show`, which renders a list of shapes (plus a pair of
light grey axes) below the cell that calls it. Run it first.

```ocaml
open Joy_core
open Shape
open Transform
open Color

let show ?(size = (300, 300)) shapes =
  let x_axis =
    line ~a:(point (-300) 0) (point 300 0) |> with_stroke (rgb 200 200 200)
  in
  let y_axis =
    line ~a:(point 0 (-300)) (point 0 300) |> with_stroke (rgb 200 200 200)
  in
  X_ocaml_lib.output_html
    (Backend_svg.render ~size ([ x_axis; y_axis ] @ shapes))
```

## Getting started

You create a circle by giving its radius:

```ocaml
let c = circle 50
```

Ignore the debug output `val c : Joy_core.Shape.shape = ...` for now.
Shapes do not render until you ask for them. Use `show [ c ]` to draw
the shapes in the list:

```ocaml
show [ c ]
```

We write `let _ =` when we want to run a computation but do not need to
keep the result:

```ocaml
let _ = show [ c ]
```

## Basic shapes

Joy has `circle`, `ellipse` and `rectangle`:

```ocaml
let c = circle 50
let e = ellipse 75 50
let r = rectangle 100 75
let _ = show [ c; e; r ]
```

`show` takes a list, so several shapes are separated by `;`, exactly
like the lists in Part 2.

`let ... in` makes values local to one block, as in Part 1:

```ocaml
let _ =
  let c = circle 50 in
  let e = ellipse 75 50 in
  let r = rectangle 100 75 in
  show [ c; e; r ]
```

You place a shape with the labelled argument `~c` (for centre).
`point x y` builds a point from integer coordinates:

```ocaml
let _ =
  let center = point 50 (-50) in
  let s = circle ~c:center 50 in
  show [ s ]
```

When the variable has the same name as the label, `~c:c` shortens to
`~c`. This is the label punning from Part 1:

```ocaml
let _ =
  let c = point 50 (-50) in
  let s = circle ~c 50 in
  show [ s ]
```

`line` connects two points; `~a` is the start (it defaults to the
origin) and the plain argument is the end:

```ocaml
let _ =
  let a = point (-100) (-100) in
  let b = point 100 100 in
  let l = line ~a b in
  show [ l ]
```

## Colors

Color shapes with `with_stroke` (the outline) and `with_fill` (the
inside):

```ocaml
let _ =
  let c1 = circle 100 |> with_stroke red in
  let c2 = circle 50 |> with_fill red |> with_stroke transparent in
  show [ c1; c2 ]
```

The predefined colors are `black`, `white`, `red`, `green`, `blue`,
`yellow` and `transparent`. `rgb` makes custom colors:

```ocaml
let _ =
  let c1 = circle 125 |> with_stroke red in
  let c2 = circle 100 |> with_stroke (rgb 0 200 0) in
  let c3 = circle 50 |> with_stroke (rgb 51 136 187) in
  show [ c1; c2; c3 ]
```

## Combining shapes

`complex` groups several shapes into one, which is useful for
transforming them together:

```ocaml
let _ =
  let c = circle 50 in
  let r = rectangle 100 75 in
  let shape = complex [ c; r ] in
  show [ shape ]
```

## Transformations

Joy has `translate`, `rotate` and `scale`. `translate` moves a shape by
x and y:

```ocaml
let _ =
  let c1 = circle 50 in
  let c2 = c1 |> translate 50 0 in
  show [ c1; c2 ]
```

`|>` is the pipe operator from earlier: `c1 |> translate 50 0` is the
same as `translate 50 0 c1`.

`rotate` turns a shape anti-clockwise by an angle in degrees:

```ocaml
let _ =
  let r = rectangle 100 75 |> rotate 45 in
  show [ r ]
```

`scale` resizes a shape:

```ocaml
let _ =
  let c = circle 100 |> scale 0.5 in
  show [ c ]
```

Transformations compose with more pipes:

```ocaml
let _ =
  let donut = complex [ circle 50; circle 25 ] in
  let donut2 = donut |> scale 0.5 |> translate 125 0 in
  show [ donut; donut2 ]
```

## Higher-order transformations

`repeat` is a higher-order function like the ones in Part 1: it takes a
transformation, applies it again and again, and keeps every intermediate
shape.

```ocaml
let _ =
  let b = point 0 100 in
  let l = line b in
  let shape = l |> repeat 18 (rotate 10) in
  show [ shape ]
```

Try changing the number of repetitions or the angle:

```ocaml
let _ =
  let b = point 0 100 in
  let l = line b in
  let shape = l |> repeat 4 (rotate 30) in
  show [ shape ]
```

Repeating a rotation on a square:

```ocaml
let _ =
  let r = rectangle 200 200 in
  let shape = r |> repeat 9 (rotate 10) in
  show [ shape ]
```

On a rectangle:

```ocaml
let _ =
  let r = rectangle 200 100 in
  let shape = r |> repeat 18 (rotate 10) in
  show [ shape ]
```

Or on an off-centre circle:

```ocaml
let _ =
  let center = point 50 0 in
  let c = circle ~c:center 100 in
  let shape = c |> repeat 18 (rotate 20) in
  show [ shape ]
```

`compose` chains two transformations into one, which `repeat` can then
apply as a unit:

```ocaml
let _ =
  let tx = compose (rotate 20) (scale 0.9) in
  let r = rectangle 200 200 in
  let shape = r |> repeat 72 tx in
  show [ shape ]
```

```ocaml
let _ =
  let n = 72 in
  let angle = 360 / n in
  let tx = compose (rotate angle) (scale 0.92) in
  let r = rectangle 200 200 in
  let shape = r |> repeat n tx in
  show [ shape ]
```

A spiral of circles:

```ocaml
let _ =
  let center = point 100 0 in
  let c = circle ~c:center 50 in
  let tx = compose (rotate 10) (scale 0.97) in
  let shape = c |> repeat (36 * 4) tx in
  show [ shape ]
```

## Make something

That is the whole vocabulary: shapes, colors, `complex`, three
transformations, `repeat` and `compose`. Some starting points:

- A flower: repeat a rotated ellipse around the origin.
- A target: write a recursive function that builds a list of shrinking
  concentric circles, like the recursive functions from Part 1.
- A tunnel: repeat a composed rotate-and-scale on a rectangle, then try
  the same on your flower.
- Anything else. Change the numbers until it looks good; that is most of
  creative coding.

The [ocaml-joy repository](https://github.com/Sudha247/ocaml-joy) has
more examples, and the library also has `polygon`, `map_stroke` and
`map_fill` for you to discover.
