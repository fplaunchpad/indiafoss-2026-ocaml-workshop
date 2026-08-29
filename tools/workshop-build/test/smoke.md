---
title: "Integration test fixture"
part: 0
duration_target_min: 1
concepts: [integration test]
keywords: [test]
activity_question: "Did everything render?"
think_about_this: "Anything missing?"
reading:
  - title: "cmarkit"
    url: https://erratique.ch/software/cmarkit/doc/Cmarkit/index.html
---

# Fixture

Outside-slide prose.

```ocaml init=true
let shared = "hello"
```

:::slide

## Slide 1

```ocaml
print_endline shared
```

:::notes
speaker
:::

:::

:::slide

## Slide 2

:::fragment
- first
:::

```ocaml
let _ = 1 + 1
```

:::

## Quizzes

A multiple-choice quiz with a correct and incorrect option:

:::quiz mcq
What is the value of `3 / 2` in OCaml?

- [ ] `1.5`
- [x] `1`
- [ ] type error
- [ ] `2`

**Why:** Integer division truncates toward zero. Both operands are
`int`, so the result is `int`, and `3 / 2 = 1`.
:::

A code fill-in quiz with a hidden test block:

:::quiz code
Write `double : int -> int` that doubles its input.

```ocaml
let double x =
  failwith "not implemented"
```

```ocaml skip
(* x-ocaml in the browser does not provide Assert_failure, so quiz
   tests use failwith-based checks instead of OCaml's assert. The
   [skip] label tells ocaml-mdx not to validate this block; the
   build's preprocessor recognises the position (2nd+ ocaml fence
   inside a :::quiz code) and tags the cell as the assertion cell. *)
let check b m = if not b then failwith m
let () =
  check (double 3 = 6)    "double 3";
  check (double 0 = 0)    "double 0";
  check (double (-2) = -4) "double -2";
  print_endline "all tests passed"
```
:::
