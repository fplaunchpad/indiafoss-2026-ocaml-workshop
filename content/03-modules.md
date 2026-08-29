---
title: "Modules"
part: 3
duration_target_min: 20
concepts: [structures, file modules, signatures, abstract types, interfaces]
keywords: [OCaml, modules, signatures, abstraction, interfaces, mli]
reading:
  - title: "The OCaml manual, The module system"
    url: https://ocaml.org/manual/5.5/moduleexamples.html
  - title: "Cornell CS3110, Modular Programming"
    url: https://cs3110.github.io/textbook/chapters/modules/intro.html
---


# Modules

:::slide

<div class="title-slide-inner">
<p class="title-slide-workshop">Fun and Profit with OCaml</p>
<h2 class="title-slide-part">Modules</h2>
<p class="title-slide-label">Part 3 of 3</p>
</div>

:::

## Structures

### Defining structures

All OCaml programs are organised into *modules*. The simplest form
of module is a *structure*. You can think of structures as
collections of definitions. Structures can be created using the
`module` and `struct` keywords:

:::slide

## Defining structures

```ocaml
module M = struct
  type t = T
  let x = T
end
```

- All OCaml programs are organised into modules; a structure is
  the simplest form of module.
- Structures are collections of definitions.
- Created using the `module` and `struct` keywords.

:::

### Accessing structure components

The components of a module can be accessed using the `.` operator:

:::slide

## Accessing structure components

```ocaml
let y = M.x
```

- Reach inside a module with the `.` operator.
- It works for types as well as values: `y` above has type
  `M.t`.

:::

```ocaml
let y = M.x
```

Note that the `.` operator works for types as well as values: the
`y` variable defined above has type `M.t`.

### Files as structures

In OCaml every source file defines a structure. For example, a
file called `foo.ml` would be treated as the definition of a
module called `Foo`. We have already used such modules in earlier
examples: for instance the `List.map` function of the standard
library is defined in a file called
[`list.ml`](https://github.com/ocaml/ocaml/blob/trunk/stdlib/list.ml#L90).

:::slide

## Files as structures

- Every source file is already a structure; no `module ... =
  struct` needed.
- `foo.ml` defines a module named `Foo`: the base name with its
  first letter capitalised.
- `List.map` is just the `map` defined in the standard library's
  `list.ml`.

:::

## Signatures and abstraction

Just as all values in OCaml have a type, all modules have a
*module type*. As you can see from the output, the module `M`
defined above has the module type:

:::slide

## Signatures and abstraction

```
sig
  type t = T
  val x : t
end
```

- Every module has a module type, usually called a signature.
- A signature lists the types and values a module contains.
- `M` above holds a variant type `t` with one constructor, and a
  value `x` of type `t`.

:::

```
sig
  type t = T
  val x : t
end
```

This means that it contains a variant type `t` with a single `T`
constructor, and a value `x` of type `t`. The module types of
structures, like the one above, are often called *signatures*.

### Signature ascription

While OCaml will infer the module type of a structure from its
definition, you can also ascribe it a more restricted signature.
This allows us to hide some of the details of the structure:

:::slide

## A named signature

```ocaml
module type INT_SET = sig
  type t
  val empty : t
  val mem : int -> t -> bool
  val add : int -> t -> t
end
```

- A named module type describes a public interface.
- `type t` exposes the type's name while hiding its representation.

:::

:::slide

## Signature ascription

```ocaml
module IntSet : INT_SET = struct
  type t = int list

  let empty = []

  let mem i s =
    let is_i j = (i = j) in
      List.exists is_i s

  let add i s =
    if mem i s then s
    else i :: s
end
```

- A structure can be given a signature that publishes less than
  it actually contains.
- Another implementation can promise the same `INT_SET` interface.

:::

:::slide

## What ascription hides

- OCaml infers a structure's module type by default; ascribing
  one restricts what callers can see.
- Here `IntSet` publishes a type `t` representing sets of
  integers.
- The signature gives `t` no definition, so the fact that it is
  an `int list` never leaves the module.
- Callers can only use `empty`, `mem` and `add`.

:::

:::slide

:::quiz mcq id=modules-q1
Why does restricting `IntSet`'s signature to omit the definition
of `t` matter?

- [ ] It makes `IntSet.add` run faster.
- [x] It hides the implementation detail that `t = int list`, so
      client code cannot depend on it, and the implementation can
      later change (say, to a tree) without breaking callers.
- [ ] It's required syntax; OCaml refuses to compile a module
      signature without hiding at least one type.
- [ ] It prevents `IntSet` from ever being used as a functor
      argument.

**Why:** this is *abstraction*: as long as callers only use the
names published in the signature (`empty`, `mem`, `add`, and the
opaque type `t`), the module's author is free to change how `t`
is represented internally. Nothing outside the module can
type-check code that assumes `t` is secretly a list.
:::

:::

Here we create an `IntSet` module with a type `t` representing
sets of integers.

```ocaml
let s = IntSet.add 6 (IntSet.add 5 IntSet.empty)

let b = IntSet.mem 6 s
```

By not including the definition of `t` in the signature, we hide
the implementation of `IntSet`. This means that users of our set
type cannot depend on the fact we have implemented it using lists.

:::slide

## Abstraction, enforced

```ocaml skip
let r = 4 :: s
```
```mdx-error
Line 1, characters 13-14:
Error: This expression has type IntSet.t
       but an expression was expected of type int list
```

- Type checking sees only the signature, never the hidden
  implementation.
- The signature says `type t` with no equation, so `IntSet.t` and
  `int list` are unrelated types.
- The implementation can switch to a tree later without breaking
  a single caller.

:::

```ocaml skip
let r = 4 :: s
```
```mdx-error
Line 1, characters 13-14:
Error: This expression has type IntSet.t
       but an expression was expected of type int list
```

### Live demo: change the representation

The useful part of abstraction is not the error by itself—it is
what the error makes possible. In the live session:

1. Run the `IntSet` implementation and its client.
2. Show that `4 :: s` is rejected.
3. Replace only the implementation with the version below, then
   rerun the unchanged client.

:::slide

## Live demo: swap the implementation

Keep `INT_SET` and the client unchanged. Replace only `IntSet`:

```ocaml skip
module IntSet : INT_SET = struct
  type t = Set of int list

  let empty = Set []

  let mem i (Set xs) = List.mem i xs

  let add i (Set xs as s) =
    if List.mem i xs then s else Set (i :: xs)
end
```

Then rerun:

```ocaml skip
let s = IntSet.add 6 (IntSet.add 5 IntSet.empty)
let b = IntSet.mem 6 s
```

The client still works because it depended on `INT_SET`, not on
the hidden list representation.

:::

Types with hidden definitions, like `t` above, are called
abstract types. OCaml's support for abstraction is one of its most
important and powerful features.

### Signatures for files

To add a signature to the module represented by a file we add an
interface file. For example, if a file called `foo.ml` defines a
structure called `Foo` then `foo.mli` defines the signature of
`Foo`. Corresponding to the
[`list.ml`](https://github.com/ocaml/ocaml/blob/trunk/stdlib/list.ml)
in the OCaml standard library, we have
[`list.mli`](https://github.com/ocaml/ocaml/blob/trunk/stdlib/list.mli)
which describes the signature of the list interface.

:::slide

## Signatures for files

- A file `foo.ml` gets its signature from `foo.mli`.
- The `.mli` lists what the file publishes; everything else stays
  private to `foo.ml`.
- The standard library works this way: `list.ml` is the
  implementation, `list.mli` the interface you read.

:::
