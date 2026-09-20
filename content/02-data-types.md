---
title: "Data Types and Pattern Matching"
part: 2
duration_target_min: 50
concepts: [variants, records, tuples, pattern matching, guards, parameterised types, recursive types, lists, mutability, type aliases]
keywords: [OCaml, algebraic data types, records, tuples, option, exhaustive matching, recursion]
reading:
  - title: "The OCaml manual, Data types section"
    url: https://ocaml.org/manual/5.5/coreexamples.html#s%3Adatatypes
  - title: "Cornell CS3110, Algebraic Data Types"
    url: https://cs3110.github.io/textbook/chapters/data/algebraic_data_types.html
  - title:  "Cornell CS3110, Advanced Pattern Matching"
    url: https://cs3110.github.io/textbook/chapters/data/pattern_matching_advanced.html
---

# Data types and pattern matching

:::slide

<div class="title-slide-inner">
<p class="title-slide-workshop">Fun and Profit with OCaml</p>
<h2 class="title-slide-part">Data Types and Pattern Matching</h2>
<p class="title-slide-label">Part 2 of 3</p>
</div>

:::

OCaml has a concise and expressive system for creating new data
types. Pattern matching provides a natural way to inspect and
deconstruct values of those types.

## Variants

### Variant types

Variants represent data that can be in one of a fixed number of
forms. We will use a small `colour` type to see why this works so
well with pattern matching:

:::slide

## Variant types

```ocaml
type colour =
  | Red
  | Green
  | Blue

let red = Red
```

- A variant value is in exactly one of a fixed set of forms.
- Each form is named by a constructor, which **must** start with a capital
  letter; lowercase is a syntax error, not merely a style convention.
- The type lists every constructor, which is what lets the
  compiler check a `match` for completeness.
- A variant is closest to a Rust `enum` or a Java sealed hierarchy.

:::

```ocaml
type colour =
  | Red
  | Green
  | Blue

let red = Red
```

## Records

### Record types

Records in OCaml represent a collection of named elements. A
simple example is a `point` record containing `x`, `y` and `z`
fields:

:::slide

## Record types

```ocaml
type point = {
  x : int;
  y : int;
  z : int;
}
```

- A record groups a fixed set of named fields.
- Each field is declared with its own type.
- The field names are part of the type, so `point` is distinct
  from any other record with three `int` fields.
- It resembles a Rust/C struct, Python dataclass or Java record,
  and is immutable unless a field is explicitly marked `mutable`.

:::

```ocaml
type point = {
  x : int;
  y : int;
  z : int;
}
```

We can create instances of our `point` type using `{ ... }`, and
access the elements of a point using the '.' operator:

:::slide

## Creating and accessing records

```ocaml
let origin = { x = 0; y = 0; z = 0 }

let get_y r = r.y

let o = get_y origin
```

- Records represent a collection of named elements.
- Create instances using `{ ... }`.
- Access elements using the `.` operator.

:::

### Functional update

New records can also be created from existing records using the
`with` keyword. For example, we can create a new `point` which is
the same as `origin` except with the value of its `z` field
changed to `10`:

:::slide

## Functional update

```ocaml
let p = { origin with z = 10 }
```

- New records can be created from existing records using the
  `with` keyword.
- The new record is the same as `origin` except the `z` field is
  changed to `10`.

:::

### Field punning

Another useful trick with records is *field punning*, which allows
you to replace:

:::slide

## Field punning

```ocaml
let mk_point x y z = { x; y; z }
```

- When a variable has the same name as the field, write the name
  once instead of `{ x = x; y = y; z = z }`.
- The same shorthand works in patterns when matching a record.

:::

```ocaml
let mk_point x y z = { x = x; y = y; z = z }
```

with

```ocaml
let mk_point x y z = { x; y; z }
```

## Tuples

A tuple groups a fixed number of values without naming the fields. Its type
uses `*`, and its value and pattern use commas. Tuples are useful for small,
local combinations such as a pair of counters; use a record when field names
would make the meaning clearer.

:::slide

## Tuples

```ocaml
let score = (3, 2)

let describe_score (x, o) =
  Printf.sprintf "X: %d, O: %d" x o

let x_score = fst score
```

- `score` has type `int * int`.
- `(x, o)` destructures the pair and names both components.
- This is like a tuple in Python or Rust; `fst` and `snd` work on pairs.

:::

:::slide

:::quiz code id=data-types-shift
Write `shift : point -> int * int -> point` which moves a point by
the given pair of offsets in the `x` and `y` directions, leaving
its `z` field untouched.

```ocaml
let shift p (dx, dy) = failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m

let () =
  check
    (shift { x = 0; y = 0; z = 0 } (2, 3) = { x = 2; y = 3; z = 0 })
    "shift the origin";
  check
    (shift { x = 1; y = 1; z = 5 } (-1, 4) = { x = 0; y = 5; z = 5 })
    "shift leaves z alone";
  check
    (shift { x = 7; y = 8; z = 9 } (0, 0) = { x = 7; y = 8; z = 9 })
    "shift by (0, 0)";
  print_endline "all tests passed"
```
:::

:::

:::slide

:::solution

Only `x` and `y` change, so this is what functional update is for:
`{ p with ... }` carries `z` over unchanged. The pair of offsets is
taken apart by the parameter pattern `(dx, dy)`, so there is no
need for `fst` and `snd`.

```ocaml
let shift p (dx, dy) = { p with x = p.x + dx; y = p.y + dy }
```

:::

:::

## Variants with data

### Constructor arguments

Variant constructors can also have arguments. This allows variants
to contain different types of data depending on which constructor
was used. For example, we can create a type which contains either
a `point` or a `colour`:

:::slide

## Constructor arguments

```ocaml
type t =
  | Point of point
  | Colour of colour

let p_or_c cond pnt col = if cond then Point pnt else Colour col

let p = p_or_c true origin red
```

- Variant constructors can have arguments.
- This allows a variant to contain different types of data
  depending on which constructor was used.

:::

### Multiple constructor arguments

Variant constructors can contain multiple arguments separated by
the `*` symbol:

:::slide

## Multiple constructor arguments

```ocaml
type drawing =
| Triangle of point * point * point
| Gradient of colour * colour

let bg = Gradient (Red, Green)
```

- A `Triangle` carries its three corners; a `Gradient` carries the
  two colours it fades between.
- Separate several arguments with `*` in the declaration.
- Building such a constructor needs parentheses around the
  arguments.

:::

```ocaml
type drawing =
| Triangle of point * point * point
| Gradient of colour * colour
```

Creating these constructors with multiple arguments requires
parentheses:

```ocaml
let bg = Gradient (Red, Green)
```

## Pattern matching

Before we go on, let us define a small helper that prints a string
to the terminal.

```ocaml
let show s = print_endline s
```

Now we can print a message:

```ocaml
show "Hello, world!"
```

### Inspecting variants

So far we have created some values of variant types, but how do we
get the data back out of them? The answer is *pattern matching*.
Using a `match` expression we can deconstruct a variant value and
retrieve its constructor's arguments:

:::slide

## Inspecting variants

```ocaml
let show s = print_endline s
let print_t t =
  match t with
  | Point p -> show (Printf.sprintf "Point: %d %d %d" p.x p.y p.z)
  | Colour c -> show (Printf.sprintf "Colour")
```

- `match` takes a value apart by asking which constructor built
  it.
- `Point p` is a pattern, not an expression: it binds a fresh `p`
  to the constructor's argument.
- That `p` shadows any existing `p` for the length of the branch.

:::

```ocaml
let print_t t =
  match t with
  | Point p -> show (Printf.sprintf "Point: %d %d %d" p.x p.y p.z)
  | Colour c -> show (Printf.sprintf "Colour")

let () = print_t (Point { x = 5; y = 9; z = 0 })

let () = print_t (Colour Blue)
```

Here `Point p` and `Colour c` are not expressions but *patterns*.
They describe the shape of the data and bind variables to
different parts of it. Note that the `p` in `Point p` does not
refer to an existing `p` variable, instead it is creating a new
`p` variable bound to the argument of the `Point` constructor.

### Nested patterns

We can nest patterns within other patterns to do pattern matching
on the constructor arguments. For example, we can print the names
of the different colours in our `print_t` function:

:::slide

## Nested patterns

```ocaml
let print_t t =
  match t with
  | Point p -> show (Printf.sprintf "Point: %d %d %d" p.x p.y p.z)
  | Colour Red -> show (Printf.sprintf "Red")
  | Colour Green -> show (Printf.sprintf "Green")
  | Colour Blue -> show (Printf.sprintf "Blue")
```

- A pattern can contain further patterns, matching a constructor
  and its argument in one step.
- `Colour Red` matches only the `Colour` case whose payload is
  `Red`.

:::

```ocaml
let print_t t =
  match t with
  | Point p -> show (Printf.sprintf "Point: %d %d %d" p.x p.y p.z)
  | Colour Red -> show (Printf.sprintf "Red")
  | Colour Green -> show (Printf.sprintf "Green")
  | Colour Blue -> show (Printf.sprintf "Blue")

let () = print_t (Colour Red)

let () = print_t (Colour Blue)
```

### Exhaustiveness

A key feature of pattern matching, which can help prevent many
errors especially when refactoring, is that the compiler will warn
you if you forget to handle a particular case. For example, if we
had forgotten the `Colour Green` case in the above definition:

:::slide

## Exhaustiveness

```ocaml
let print_t_ t =
  match t with
  | Point p -> show (Printf.sprintf "Point: %d %d %d" p.x p.y p.z)
  | Colour Red -> show (Printf.sprintf "Red")
  | Colour Blue -> show (Printf.sprintf "Blue")
```
```mdx-error
Lines 2-5, characters 5-50:
Warning 8 [partial-match]: this pattern-matching is not exhaustive.
  Here is an example of a case that is not matched: Colour Green
```

- The compiler knows every constructor, so it can tell when a
  `match` misses one.
- It names an unmatched example, here `Colour Green`.
- This is what makes adding a constructor safe: every incomplete
  `match` is reported.

:::

```ocaml
let print_t_ t =
  match t with
  | Point p -> show (Printf.sprintf "Point: %d %d %d" p.x p.y p.z)
  | Colour Red -> show (Printf.sprintf "Red")
  | Colour Blue -> show (Printf.sprintf "Blue")
```
```mdx-error
Lines 2-5, characters 5-50:
Warning 8 [partial-match]: this pattern-matching is not exhaustive.
  Here is an example of a case that is not matched: Colour Green
```

### Pattern guards

A branch may add a boolean condition with `when`. The branch is selected only
when both its pattern and its guard match. Guards are useful when the shape of
the data is not enough by itself:

:::slide

## Pattern guards

```ocaml
let sign n =
  match n with
  | n when n < 0 -> "negative"
  | 0 -> "zero"
  | _ -> "positive"
```

- `when n < 0` is a guard on the first pattern.
- Guards are tested from top to bottom, like the surrounding branches.
- Keep the fallback branch: guards do not make a match exhaustive.

:::

### Matching records

We can also match on record data using the same syntax as to
create records, including field punning. So our `print_t` can be
further refined to:

:::slide

## Matching records

```ocaml
let print_t t =
  match t with
  | Point { x; y; z } -> show (Printf.sprintf "Point: %d %d %d" x y z)
  | Colour Red -> show (Printf.sprintf "Red")
  | Colour Green -> show (Printf.sprintf "Green")
  | Colour Blue -> show (Printf.sprintf "Blue")
```

- Records are matched with the same `{ ... }` syntax used to
  build them.
- Field punning works here too: `{ x; y; z }` binds three
  variables named after the fields.

:::

```ocaml
let print_t t =
  match t with
  | Point { x; y; z } -> show (Printf.sprintf "Point: %d %d %d" x y z)
  | Colour Red -> show (Printf.sprintf "Red")
  | Colour Green -> show (Printf.sprintf "Green")
  | Colour Blue -> show (Printf.sprintf "Blue")
```

### The `_` pattern

Sometimes, you do not care about a value. In that case you can use
the `_` pattern, which matches any value without binding it to a
name:

:::slide

## The `_` pattern

```ocaml
let is_colour_red t =
  match t with
  | Colour Red -> true
  | _ -> false
```

- Sometimes you do not care about a matched value.
- The `_` pattern matches any value without binding it to a name.

:::

### Match ordering

Note that patterns are matched from top to bottom: if a value
matches multiple patterns then the first of those patterns will be
selected. For example, in the following code the second case will
never be matched:

:::slide

## Match ordering

```ocaml
let is_colour_red t =
  match t with
  | _ -> false
  | Colour Red -> true
```
```mdx-error
Line 4, characters 7-17:
Warning 11 [redundant-case]: this match case is unused.
```

- Patterns are tried top to bottom, and the first match wins.
- A catch-all `_` placed first makes every later case dead, and
  the compiler says so.

:::

```ocaml
let is_colour_red t =
  match t with
  | _ -> false
  | Colour Red -> true
```
```mdx-error
Line 4, characters 7-17:
Warning 11 [redundant-case]: this match case is unused.
```

:::slide

:::quiz mcq id=data-types-q1
Suppose `print_t_` (defined earlier) omits the `Colour Green` case
of the `t` variant. What does OCaml do?

- [ ] Nothing: OCaml has no way to know a case is missing.
- [ ] It raises a runtime exception the first time `Colour Green`
      is matched.
- [x] The compiler emits a "this pattern-matching is not
      exhaustive" warning at compile time, naming `Colour Green`
      as an example of an unmatched value.
- [ ] It silently falls through to the `Point` case.

**Why:** the compiler knows every constructor of `t` and `colour`
from their type definitions, so it can check a `match` against
the full set of shapes a value could take. A missing case is
flagged statically, before the program ever runs, which is one of
pattern matching's main safety benefits over an `if`/`else` chain
on manually-extracted fields.
:::

:::

## Parameterised types

Types in OCaml can be parameterised by other types. For example,
the `option` type which may or may not contain a value:

:::slide

## Parameterised types

```ocaml
type 'a option =
| None
| Some of 'a

let io = Some 6

let co = Some Green
```

- `'a` is a type variable, standing for any type.
- Supplying it gives a concrete type: `int option`,
  `colour option`, and so on.
- One definition serves every element type.
- Use an `option` where many languages might use `null`: `None` means
  “no value”, while `Some x` carries a value. `None` is not a universal null;
  it belongs only to an `option` type.

:::

```ocaml
type 'a option =
| None
| Some of 'a
```

In the above the `'a` is a *type variable*, which can be
substituted by any type. For instance, we can create a value of
type `int option` or a value of type `colour option`:

```ocaml
let io = Some 6

let co = Some Green
```

We can define a printer for `t option` type as follows:

```ocaml
let print_t_opt t =
  match t with
  | None -> show "None"
  | Some t -> print_t t
```

```ocaml
let () = print_t_opt (Some (Colour Red))

let () = print_t_opt None
```

### Polymorphic values

These type variables also appear when creating *polymorphic*
values. For example, the following function has type
`'a option -> 'a list` which means it can be applied to any
`option` type:

:::slide

## Polymorphic values

```ocaml
let opt_to_list o =
  match o with
  | Some x -> [x]
  | None -> []
```

- `opt_to_list` has type `'a option -> 'a list`.
- It never inspects the element, so it works for every `'a`.
- One definition applies to `int option`, `colour option` and
  the rest.

:::

```ocaml
let opt_to_list o =
  match o with
  | Some x -> [x]
  | None -> []

let l = opt_to_list (Some 9)

let m = opt_to_list (Some Red)
```

### Polymorphic constructors

Constructors of parameterised types which do not include the type
parameter, such as `None` in the optional type, are also examples
of polymorphic values:

:::slide

## Polymorphic constructors

```ocaml
let n = None

let a = [ Some 3; n ]

let b = [ n; Some Blue ]
```

- `None` mentions no `'a`, so it has type `'a option` and fits
  any element type.
- The same `n` is usable in an `int option list` and in a
  `colour option list`.

:::

```ocaml
let n = None

let a = [ Some 3; n ]

let b = [ n; Some Blue ]
```

## Recursive data types

Data types in OCaml can also be recursive. This allows us to
create recursive structures such as trees and lists. The following
defines a parametric binary tree type:

:::slide

## Recursive data types

```ocaml
type 'a binary_tree =
  | Leaf
  | Tree of 'a binary_tree * 'a * 'a binary_tree
```

- Data types in OCaml can be recursive.
- This allows creating recursive structures such as trees and
  lists.

:::

As you can see the `Tree` constructor of `binary_tree` contains
other `binary_tree`s as its arguments.

### Inspecting recursive data types

We can write recursive functions to handle these recursive data
types. For example, the following function returns the maximum
depth of a binary tree:

:::slide

## Inspecting recursive data types

```ocaml
let rec depth tr =
  match tr with
  | Leaf -> 1
  | Tree(left, _, right) ->
      1 + (max (depth left) (depth right))
```

- A recursive type is consumed by a recursive function.
- The pattern has one branch per constructor: `Leaf` stops the
  recursion, `Tree` recurses into both subtrees.

:::

:::slide

## Computing a tree's depth

<div class="cols">
<div class="col" style="flex: 0 0 58%;">

```ocaml
let n4 = Tree (Leaf, 4, Leaf)
let n2 = Tree (Leaf, 2, n4)
let n3 = Tree (Leaf, 3, Leaf)
let tree = Tree (n2, 1, n3)

let d = depth tree
```

</div>
<div class="col">

<svg viewBox="0 0 296 192" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Binary tree: root 1 has children 2 and 3; node 2 has a Leaf and the child 4; node 4 has two Leaf children; node 3 has two Leaf children. The longest path from the root to a Leaf runs 1, 2, 4, Leaf and spans four levels." fill="none" stroke="currentColor" style="width:100%;max-width:400px;height:auto">
<text x="6" y="27" font-size="8" fill="currentColor" stroke="none" opacity=".4">1</text>
<text x="6" y="75" font-size="8" fill="currentColor" stroke="none" opacity=".4">2</text>
<text x="6" y="123" font-size="8" fill="currentColor" stroke="none" opacity=".4">3</text>
<text x="6" y="171" font-size="8" fill="currentColor" stroke="none" opacity=".4">4</text>
<line x1="138.7" y1="33.9" x2="106.3" y2="62.1" stroke-width="1.9" opacity="1"/>
<line x1="163.1" y1="31.4" x2="221.9" y2="64.6" stroke-width="0.9" opacity="0.4"/>
<line x1="85.4" y1="83.5" x2="64.0" y2="109.2" stroke-width="0.9" opacity="0.4"/>
<line x1="104.6" y1="83.5" x2="125.4" y2="108.5" stroke-width="1.9" opacity="1"/>
<line x1="227.1" y1="84.7" x2="212.4" y2="108.1" stroke-width="0.9" opacity="0.4"/>
<line x1="242.9" y1="84.7" x2="257.6" y2="108.1" stroke-width="0.9" opacity="0.4"/>
<line x1="127.1" y1="132.7" x2="112.4" y2="156.1" stroke-width="1.9" opacity="1"/>
<line x1="142.9" y1="132.7" x2="157.6" y2="156.1" stroke-width="0.9" opacity="0.4"/>
<circle cx="150" cy="24" r="15" stroke-width="1.9" opacity="1"/>
<text x="150" y="28" font-size="12" text-anchor="middle" fill="currentColor" stroke="none" opacity="1">1</text>
<circle cx="95" cy="72" r="15" stroke-width="1.9" opacity="1"/>
<text x="95" y="76" font-size="12" text-anchor="middle" fill="currentColor" stroke="none" opacity="1">2</text>
<circle cx="235" cy="72" r="15" stroke-width="0.9" opacity="0.4"/>
<text x="235" y="76" font-size="12" text-anchor="middle" fill="currentColor" stroke="none" opacity="0.55">3</text>
<circle cx="55" cy="120" r="14" stroke-width="0.9" opacity="0.4" stroke-dasharray="2.5 2"/>
<text x="55" y="123" font-size="8.5" text-anchor="middle" fill="currentColor" stroke="none" opacity="0.55">Leaf</text>
<circle cx="135" cy="120" r="15" stroke-width="1.9" opacity="1"/>
<text x="135" y="124" font-size="12" text-anchor="middle" fill="currentColor" stroke="none" opacity="1">4</text>
<circle cx="205" cy="120" r="14" stroke-width="0.9" opacity="0.4" stroke-dasharray="2.5 2"/>
<text x="205" y="123" font-size="8.5" text-anchor="middle" fill="currentColor" stroke="none" opacity="0.55">Leaf</text>
<circle cx="265" cy="120" r="14" stroke-width="0.9" opacity="0.4" stroke-dasharray="2.5 2"/>
<text x="265" y="123" font-size="8.5" text-anchor="middle" fill="currentColor" stroke="none" opacity="0.55">Leaf</text>
<circle cx="105" cy="168" r="14" stroke-width="1.9" opacity="1" stroke-dasharray="2.5 2"/>
<text x="105" y="171" font-size="8.5" text-anchor="middle" fill="currentColor" stroke="none" opacity="1">Leaf</text>
<circle cx="165" cy="168" r="14" stroke-width="0.9" opacity="0.4" stroke-dasharray="2.5 2"/>
<text x="165" y="171" font-size="8.5" text-anchor="middle" fill="currentColor" stroke="none" opacity="0.55">Leaf</text>
</svg>

</div>
</div>

- `Leaf` returns `1`, so a leaf counts as a level of its own.
- The highlighted path 1 -> 2 -> 4 -> `Leaf` is the longest in this
  tree: four levels, so `d` is `4`.

:::

```ocaml
let rec depth tr =
  match tr with
  | Leaf -> 1
  | Tree(left, _, right) ->
      1 + (max (depth left) (depth right))

let tree : int binary_tree =
  Tree(Tree(Leaf,
            2,
            Tree(Leaf,
                 4,
                 Leaf)),
       1,
       Tree(Leaf,
            3,
            Leaf))

let d = depth tree
```

## Lists

### Constructing lists

A particularly common built-in data type in OCaml is the `list`
type. `list` is actually a parameterised recursive variant type.
It has two constructors `::` (called cons) and `[]` (called nil).
`[]` represents an empty list and `::` adds an element to the
front of the list:

:::slide

## Constructing lists

```ocaml
let l = 1 :: 2 :: 3 :: []
let nil = []
let l = 1 :: 2 :: 3 :: nil
```

- Every function on lists is documented in the
  [OCaml manual's `List` module](https://ocaml.org/manual/5.2/api/List.html).
- `list` is a parameterised recursive variant type with two
  constructors, `::` (cons) and `[]` (nil).
- `[]` represents an empty list; `::` adds an element to the front
  of the list.

:::

OCaml also provides a shorthand syntax for lists: `[ ..; .. ]`.
Our `l` value above could instead have been defined:

```ocaml
let l = [1; 2; 3]
```

### Matching lists

Like all constructors, the list constructors can be used as
patterns in pattern matching. The following function sums all the
elements of an `int list`:

:::slide

## Matching lists

```ocaml
let rec sum il =
  match il with
  | [] -> 0 (* empty list *)
  | i :: rest -> i + (sum rest) 
```

- `[]` and `::` are ordinary constructors, so they work as
  patterns.
- `i :: rest` splits a list into its head and its tail.
- The empty-list case is what ends the recursion.

:::

```ocaml
let rec sum il =
  match il with
  | [] -> 0 (* empty list *)
  | i :: rest -> (* head + sum of tail *) i + (sum rest)

let s = sum l
```

:::slide


:::quiz code id=data-types-q2
Write `min_list : int list -> int option` to compute the minimum
element of an integer list. Return `None` for the empty list, and
`Some e` when the minimum element is `e`.

```ocaml
let rec min_list_helper cur_min l =
  match l with
  | [] -> cur_min
  | x :: xs ->
      (match cur_min with
       | None -> failwith "not implemented"
       | Some m -> failwith "not implemented")

let min_list l = min_list_helper None l
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (min_list [] = None) "min_list []";
  check (min_list [3; 1; 2] = Some 1) "min_list [3;1;2]";
  check (min_list [5] = Some 5) "min_list [5]";
  print_endline "all tests passed"
```
:::

:::

:::slide

:::solution

The helper's `None` branch should start the running minimum at
`x`; the `Some m` branch should keep whichever of `m` and `x` is
smaller.

```ocaml
let rec min_list_helper cur_min l =
  match l with
  | [] -> cur_min
  | x :: xs ->
      (match cur_min with
       | None -> min_list_helper (Some x) xs
       | Some m -> min_list_helper (Some (min m x)) xs)

let min_list l = min_list_helper None l
```

:::

:::

:::slide


:::quiz code id=data-types-q3
Write `postfix : 'a binary_tree -> 'a list` that returns the
elements of a binary tree in postfix order (left subtree, then
right subtree, then the node itself). Use the list append operator
`@`.

```ocaml
let rec postfix t = failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (postfix Leaf = []) "postfix Leaf";
  check
    (postfix
       (Tree
          ( Tree (Leaf, 0, Leaf),
            1,
            Tree (Tree (Leaf, 5, Leaf), 4, Leaf) ))
    = [0; 5; 4; 1])
    "postfix example tree";
  print_endline "all tests passed"
```
:::

:::

:::slide

:::solution

```ocaml
let rec postfix t =
  match t with
  | Leaf -> []
  | Tree (left, v, right) -> postfix left @ postfix right @ [v]
```

:::

:::

:::slide


:::quiz code id=data-types-q4
Write `rev_list : 'a list -> 'a list` that reverses a list. Use the
list append operator `@` (an `O(n)` accumulator-based version is a
nice follow-up once you've seen this one work).

```ocaml
let rec rev_list l = failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (rev_list [] = []) "rev_list []";
  check (rev_list [1; 2; 3] = [3; 2; 1]) "rev_list [1;2;3]";
  check (rev_list [1] = [1]) "rev_list [1]";
  print_endline "all tests passed"
```
:::

:::

:::slide

:::solution

```ocaml
let rec rev_list l =
  match l with
  | [] -> []
  | x :: xs -> rev_list xs @ [x]
```

:::

:::

## Optional: mutation and references

Most of the workshop uses immutable values. OCaml also supports
mutation when changing state in place is the clearer tool.

:::slide

## Optional: mutation

```ocaml
type mpoint = { mutable x : int; mutable y : int; mutable z : int }

let p = { x = 0; y = 0; z = 10 }

let () = p.z <- 20
```

- A field must be declared `mutable` before it can be assigned.
- `<-` updates the existing record; `{ p with z = 20 }` instead
  makes a new record.

:::

Reference cells provide one mutable value without defining a new
record type:

:::slide

## Optional: references

```ocaml
let counter = ref 0

let () = counter := !counter + 1

let seen = !counter
```

- `ref v` creates a mutable cell holding `v`.
- Read it with `!` and update it with `:=`.
- A reference is a record with one mutable field.

:::

## Optional: type aliases

An alias gives an existing type another name. It does not create a
distinct type:

:::slide

## Optional: type aliases

```ocaml
type int_pair = int * int

let id (x : int_pair) = x
```

- `type NAME = ...` gives an existing type a second name.
- `int_pair` and `int * int` remain interchangeable.
- `:` constrains an expression or binding to a type.

:::
