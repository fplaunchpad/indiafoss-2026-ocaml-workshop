(** Transform a cmarkit document by converting OCaml-fenced code blocks
    into raw-HTML [<x-ocaml ...>code</x-ocaml>] blocks. *)

val transform : Cmarkit.Doc.t -> Cmarkit.Doc.t

(** Escape angle brackets, ampersands, and quotes for safe HTML
    insertion. Exposed for use by Emit. *)
val html_escape : string -> string
