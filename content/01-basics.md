---
title: "OCaml Basics"
part: 1
duration_target_min: 30
concepts: [bindings, type inference, operators, conditionals, functions, recursion, labelled arguments, anonymous functions, higher-order functions, currying]
keywords: [OCaml, functional programming, types, operators, functions, recursion, List.map, partial application]
reading:
  - title: "Real World OCaml, A Guided Tour (numbers, let bindings, and type-inference sections)"
    url: https://dev.realworldocaml.org/guided-tour.html
  - title: "Cornell CS3110, Basics chapter (types and values, let expressions, type checking, conditional expressions)"
    url: https://cs3110.github.io/textbook/chapters/basics/intro.html
  - title: "The OCaml manual, Basics section"
    url: https://ocaml.org/manual/5.5/coreexamples.html#s%3Abasics
---


# Basics

:::slide

<div class="title-slide-inner">
<p class="title-slide-workshop">Fun and Profit with OCaml</p>
<h2 class="title-slide-part">OCaml Basics</h2>
<p class="title-slide-label">Part 1 of 3</p>
</div>

:::

Let's begin with a tour through the basics of the OCaml programming language.

## Why OCaml

:::slide

- A functional language in the same family as Haskell and Standard ML.
- Functional-first but multi-paradigm (imperative and object-oriented).
- Compiles to native code (x86, ARM, RISC-V), JavaScript and WASM.
- Industrial-strength: Used at Jane Street, Meta, Microsoft,
  Ahrefs, Citrix, Tezos, Bloomberg, Docker.
- OCaml has also been in
  [space](https://parsimoni.co/blog/2026-04-07-predicting-satellite-collisions-in-ocaml.html)! 🚀

:::

- OCaml is an industrial-strength functional language in the same
  family as Haskell and Standard ML.
- Initially developed at [INRIA](https://inria.fr/en), it is now a
  well-maintained [open-source project](https://github.com/ocaml/ocaml).
- It supports functional, imperative and object-oriented programming.
- Its native compiler targets architectures including x86, ARM and
  RISC-V. Ecosystem compilers also target JavaScript and WebAssembly.
- OCaml is used for financial systems, developer tools, static analysis,
  compilers, proof assistants, network services and unikernels.

Ultimately, functional programming offers an alternative way to
think about *programming*, which is useful even if you don't
intend to regularly use a functional programming language. That said,
ideas associated with functional programming (immutability,
first-class functions, algebraic data types, pattern matching and
type inference) also appear in languages such as C++, Java, Python,
Rust, Kotlin and Elixir.

## Variables and Primitive types

### Let binding

At its simplest, a variable is an identifier whose meaning is
bound to a particular value. In OCaml these bindings are
introduced using the let keyword.

:::slide

## Let binding

```ocaml
let x = 3
```

- `x` is now bound to the value `3`.

:::

Every variable binding has a scope, which is the portion of the
code that can refer to that binding. The scope of top-level let
bindings (like the one above) is everything that follows it.

```ocaml
2 * x * 5
```

### Floats and ints

:::slide

## Floats and ints

```ocaml
let x = 3
let pi = 3.1415
```

- `x` is inferred as `int`, `pi` as `float`.

:::

Observe that the types are inferred. One of the key features of
OCaml is type inference and type checking.

### Working with numbers

:::slide

## Working with numbers

```ocaml
let x = 7 + 3
let y = 7. +. 3.
```

- Integer arithmetic: `+` `-` `*` `/` `mod`
- Float arithmetic: `+.` `-.` `*.` `/.`
- No implicit conversion: `x + y` is a compile error.

:::

OCaml deliberately keeps integer and floating-point arithmetic separate.
This catches accidental mixing instead of silently converting one kind of
number into the other. There is no implicit conversion between `int` and
`float`, so convert explicitly with `float_of_int` or `int_of_float`
when necessary.

For example, checking the equality of incompatible types fails with a
compile time error.

```ocaml skip
x = pi
```

```mdx-error
Line 1, characters 4-6:
Error: This expression has type float but an expression was
       expected of type int
```

:::slide

:::quiz code id=basics-area
Compute the area of this circle that has a radius of 6.0 units (hint: *area = π × r²*)

```ocaml
let pi = 3.1415
let radius = 6.0
let area = failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (Float.abs (area -. 113.094) < 0.01) "area of circle with radius 6.0";
  print_endline "all tests passed"
```
:::

:::solution
```ocaml
let pi = 3.1415
let radius = 6.0
let area = pi *. radius *. radius
```
:::

:::

### Comparisons and booleans

:::slide

## Comparisons and booleans

```ocaml
let eq = (3 = 3)
let are_you_awesome = true
let logic = true && (false || not false)
```

- Use `=` for value equality and `<>` for inequality.
- Conditions must be `bool`; OCaml has no truthy integers or strings.

:::

The `==` operator tests physical identity, a lower-level question about
whether two values are represented by the same object. It is rarely what a
beginner wants; use `=` for ordinary equality comparisons.

### Characters and strings

:::slide

## Characters and strings

```ocaml
let a = 'a'
let hello = "Hello"
```

- `char` uses single quotes, `string` uses double quotes.

:::

### Unit

:::slide

## Unit

```ocaml
let () = print_endline "hello"
```

- `unit` has exactly one value: `()`.
- It is the type of side effects — functions that do something
  but return nothing useful.

:::

:::slide

:::quiz mcq id=basics-q1
The bindings above include `let a = 'a'`. Suppose we now add
`let b = 'a'`. What happens when OCaml evaluates `a = b`?

- [x] It evaluates to `true`: both are `char` values, and `=`
      compares the values they hold.
- [ ] It fails to compile, the same way `one = pi` does.
- [ ] It evaluates to `false`, because `a` and `b` are two
      different bindings.
- [ ] It evaluates to `true` only because `b` was defined using
      the letter `a`.

**Why:** `one = pi` is rejected because `int` and `float` are
different types, so `=` has nothing to compare. Here both `a` and
`b` have type `char`, so `=` is well typed and simply asks whether
the two values are the same: they are both the character `'a'`,
so the answer is `true`. Note that `=` compares values, not
bindings: it does not matter that `a` and `b` are separate names,
or how each one was written.
:::

:::

:::slide

:::quiz mcq id=basics-q7
Given `let one = 1` and `let one' = 1.` (note the trailing dot on
the second `one'`) What happens when OCaml evaluates `one = one'`?

- [x] It fails to compile: `1.` is a `float` literal, so `one'` is
      a `float` while `one` is an `int`.
- [ ] It evaluates to `true`: both bindings are the number one.
- [ ] It is a syntax error: `'` may only be used to write a
      character literal such as `'a'`.
- [ ] It evaluates to `false`, because `one` and `one'` are
      different names.

**Why:** Two things are easy to misread here. First, `'` is a
perfectly legal character inside an identifier as long as it is
not the first one, so `one'` (read aloud as "one prime") is an
ordinary variable name. Second, the trailing dot in `1.` makes it
a `float` literal, exactly like `1.0`; only that one character
separates it from the `int` literal `1`. So this is the same
situation as `one = pi`: `=` needs both sides to have the same
type, and the compiler rejects it with "This expression has type
float but an expression was expected of type int."
:::

:::

### Local let bindings

We can also use let to create a variable binding whose scope is
limited to a particular expression using the *in* keyword:

:::slide

## Local `let ... in` binding

```ocaml
(* area of a square *)
let area =
  let side = 5 in
  side * side
```

- A `let` binding's scope can be limited to a particular
  expression using the `in` keyword.
- Only `area` is bound at the top level; `side` is no longer in
  scope once the `in` expression has finished.

:::

As you can see from the output, only `area` has been bound to a value
at the top-level. The `side` variable is no longer in scope:

```ocaml skip
side + 1
```

:::slide

:::quiz mcq id=basics-q2

```ocaml
let area =
  let side = 5 in
  side * side
```

After evaluating this, what happens if you try to evaluate `side + 1` at the top level?

- [x] Compile error: `side` is unbound outside the `let ... in`
      expression.
- [ ] It evaluates to `6`, since `side` was `5`.
- [ ] It evaluates to `1`, treating the missing `side` as `0`.
- [ ] It silently shadows `area`.

**Why:** `side` is local to the body of the `let ... in` expression.
Once that expression finishes evaluating, `side` goes out of scope;
only `area` (bound to `25`) remains visible at the top level.
Referring to `side` afterwards is a compile-time "Unbound value side"
error.
:::

:::

## Conditionals

OCaml provides conditional expressions using the
if keyword:

:::slide

## Conditionals

```ocaml
let time_of_day = 14 (* 14 hours = 2 pm *)

let greeting =
  if time_of_day < 12 then "Good morning"
  else "Good afternoon"
```

- `if` is an expression: it evaluates to a value, so it can go
  anywhere a value can, including on the right of a `let`.
- Both branches must have the same type.

:::

```ocaml
let time_of_day = 14 (* 14 hours = 2 pm *)

let greeting =
  if time_of_day < 12 then "Good morning"
  else "Good afternoon"
```

## Functions

### Function definition

The let keyword can also be used to define functions:

:::slide

## Function definition

```ocaml
let succ x = x + 1
```

- This defines a function called `succ` which takes an argument
  `x` and returns the value of `x + 1`.
- The type inferred for `succ` is `int -> int`, meaning it is a
  function from `int` to `int`; it takes an integer argument and
  returns an integer.

:::

You can also provide explicit type annotations, but generally we
elide them.

```ocaml
let succ (x : int) : int = x + 1
```

The latter definition of `succ` shadows the former.

### Multiple arguments

Functions with multiple arguments are defined the same way:

:::slide

## Multiple arguments

```ocaml
let add x y = x + y
```

- Parameters are separated by spaces, not commas or brackets.
- `add` has type `int -> int -> int`, inferred from `+`.

:::

```ocaml
let add x y = x + y
```

:::slide

:::quiz code id=basics-max
Implement `max_of_two : int -> int -> int`, which returns the
larger of its two arguments.

```ocaml
let max_of_two x y = failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (max_of_two 3 7 = 7) "max_of_two 3 7";
  check (max_of_two 10 2 = 10) "max_of_two 10 2";
  check (max_of_two 5 5 = 5) "max_of_two 5 5";
  print_endline "all tests passed"
```
:::

:::solution
```ocaml
let max_of_two x y = if x > y then x else y
```
:::

:::

### Function application

Function application is written by placing each argument after the
function name. Parentheses group expressions; they are not special
function-call syntax:

:::slide

## Function application

```ocaml
let a = succ 8
let b = add a 2
```

- The idiomatic spelling is `succ 8`. The expression `succ (8)` also
  parses, but the parentheses merely group the argument `8`.
- Application binds tighter than any operator, so
  `succ 8 + 1` means `(succ 8) + 1`.

:::

```ocaml
let b = succ 8

let c = add a b
```

:::slide


:::quiz code id=basics-q3
Implement `sum_of_succ : int -> int -> int`, which computes the
sum of the successors of its two arguments, using only `add` and
`succ` (no `+`).

```ocaml
let sum_of_succ x y = failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (sum_of_succ 5 6 = 13) "sum_of_succ 5 6";
  check (sum_of_succ 0 0 = 2) "sum_of_succ 0 0";
  check (sum_of_succ (-1) 4 = 5) "sum_of_succ -1 4";
  print_endline "all tests passed"
```
:::

:::

:::slide

:::solution

Apply `succ` to each argument first, then combine the results with
`add`.

```ocaml
let sum_of_succ x y = add (succ x) (succ y)
```

:::

:::

### Recursive functions

We can also create recursive functions by adding the rec keyword
to a let binding. For example, the sum of first `n` integers can
be implemented as follows:

:::slide

## Recursive functions

```ocaml
let rec sum_of_first_n n =
  if n <= 0 then 0
  else sum_of_first_n (n-1) + n
```

- `rec` makes the function's own name visible inside its body.
- Without `rec` the name would refer to an earlier binding, or
  fail to resolve at all.

:::

```ocaml
let rec sum_of_first_n n =
  if n <= 0 then 0
  else sum_of_first_n (n-1) + n
```

```ocaml
assert (sum_of_first_n 5 = 15)
```

:::slide


:::quiz code id=basics-q4
Implement a recursive function `fib : int -> int` that computes
the nth Fibonacci number, using the convention `fib 0 = 1`,
`fib 1 = 1`, and `fib n = fib (n - 1) + fib (n - 2)` for `n >= 2`.

```ocaml
let rec fib n = failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (fib 0 = 1) "fib 0";
  check (fib 1 = 1) "fib 1";
  check (fib 10 = 89) "fib 10";
  print_endline "all tests passed"
```
:::

:::

:::slide

:::solution

```ocaml
let rec fib n =
  if n < 2 then 1
  else fib (n - 1) + fib (n - 2)
```

:::

:::

### Labelled arguments

Consider the following function

```ocaml
let divide dividend divisor = dividend / divisor
```

Looking at just the signature, it's not obvious which int
argument is the dividend and which is the divisor.

We can fix this using labelled arguments. To label an argument in
a signature, `NAME:` is put before the type. When defining the
function, we put a tilde (`~`) before the name of the argument:

:::slide

## Labelled arguments

```ocaml
let divide ~dividend ~divisor = dividend / divisor
```

- Without labels it isn't obvious which `int` argument is the
  dividend and which is the divisor.
- Label an argument in the signature with `NAME:` before the
  type; when defining the function, put a tilde (`~`) before the
  argument name.

:::

We can then call it using:

```ocaml
divide ~dividend:9 ~divisor:3
```

Labelled arguments can be passed in any order.

```ocaml
divide ~divisor:3 ~dividend:9
```

We can also pass variables into the labelled argument:

```ocaml
let to_divide = 9 in
let divide_by = 3 in
divide ~dividend:to_divide ~divisor:divide_by
```

The label and the parameter used inside a function can also be
written separately. Formatting is disabled for this example so the
explicit spelling remains visible:

```ocaml
[@@@ocamlformat "disable"]

let divide_explicit ~dividend:dividend ~divisor:divisor =
  dividend / divisor
```

When the label and parameter have the same name, OCaml lets us omit
the repeated name. This is called *label punning*:

```ocaml
let dividend = 9 in
let divisor  = 3 in
divide ~dividend ~divisor
```

:::slide


:::quiz code id=basics-q5
Implement `modulo ~dividend ~divisor`, which returns the remainder
of `dividend` divided by `divisor`, built using our labelled
`divide` function (do not use OCaml's built-in `mod` operator).

```ocaml
let modulo ~dividend ~divisor = failwith "not implemented"
```

```ocaml skip
let check b m = if not b then failwith m
let () =
  check (modulo ~dividend:17 ~divisor:5 = 2) "modulo 17 5";
  check (modulo ~dividend:99 ~divisor:9 = 0) "modulo 99 9";
  check (modulo ~dividend:7 ~divisor:2 = 1) "modulo 7 2";
  print_endline "all tests passed"
```
:::

:::

:::slide

:::solution

`divide` already gives the truncated quotient, so the remainder is
`dividend - divisor * quotient`.

```ocaml
let modulo ~dividend ~divisor =
  dividend - divisor * (divide ~dividend ~divisor)
```

:::

:::

### Anonymous functions

Instead of defining each function with a `let`, it is often
handy to define functions on the fly. OCaml has support for
anonymous functions, which allows you to define unnamed
functions. To write an anonymous function, the `fun` keyword is
used in the following form `(fun ARG1 ARG2 ... -> BODY)`:

:::slide

## Anonymous functions

```ocaml
let succ = fun x -> x + 1

let nine = (fun x -> x + 1) 8
```

- `(fun ARG1 ARG2 ... -> BODY)` builds a function with no name.
- An anonymous function can be bound to a name or applied
  directly.

:::

```ocaml
let succ = fun x -> x + 1

let nine = (fun x -> x + 1) 8
```

### Higher-order functions

Since OCaml is a functional language, functions are regular
values which can be used like any other. In particular, they can
be used as arguments to other functions. Functions which take
other functions as arguments are called higher-order functions.

For example, the `List.map` function takes two arguments: a
function and a list, and returns a new list created by applying
the function to each of the elements of the list.

We can use `List.map` to apply the succ function to all the
numbers in the list `[1; 2; 3]`:

:::slide

## Higher-order functions

```ocaml
let l = List.map succ [1;2;3]

let l2 = List.map (fun x -> x * 2) [1;2;3]
```

- Functions are regular values, so they can be passed as
  arguments to other functions ("higher-order functions").
- `List.map` takes a function and a list, and returns a new list
  created by applying the function to each element of the list.
- Anonymous functions are especially handy here: no need to
  define a named function just to use it once.

:::

The full set of functions available on `List` (and every other
standard library module) is documented in the
[OCaml manual's standard library reference](https://ocaml.org/manual/5.5/api/List.html).
It is worth keeping this open while you work through the workshop.

You can also check the type of a function without applying it by
typing it into `utop` followed by `;;`. For example, typing
`List.map;;` prints its inferred type, `('a -> 'b) -> 'a list ->
'b list`, directly. `utop` itself has its own set of features (tab
completion, a command history, `#show`) documented at the
[utop repository](https://github.com/ocaml-community/utop).

```ocaml
List.map
```

### Currying

Like many functional languages, OCaml provides support for
partial application of functions in the form of currying.

You may have noticed that the type of our add function was
written:

`int -> int -> int`

another way to write this type would be

`int -> (int -> int)`.

In other words, add is actually a function which takes an int
and returns a function from int to int. For example, we could
redefine our succ function by partially applying add to 1:

:::slide

## Currying

```ocaml
let succ = add 1
```

- `add`'s type `int -> int -> int` is the same as
  `int -> (int -> int)`: `add` takes an `int` and returns a
  function from `int` to `int`.
- We can redefine `succ` by partially applying `add` to `1`.

:::

:::slide

:::quiz mcq id=basics-q6
Given `let add x y = x + y` has type `int -> int -> int`, what is
the type of `add 1`?

- [ ] `int`: applying `add` to one argument is a type error.
- [x] `int -> int`: a function still waiting for the second
      argument.
- [ ] `int -> int -> int`, unchanged, since `add` needs both
      arguments at once.
- [ ] `unit`, since the application is incomplete.

**Why:** `add`'s type `int -> int -> int` is really
`int -> (int -> int)`: a function that takes an `int` and returns
another function `int -> int`. Applying `add` to just `1` supplies
the first argument and returns that inner function, which is
exactly how `let succ = add 1` works.
:::

:::
