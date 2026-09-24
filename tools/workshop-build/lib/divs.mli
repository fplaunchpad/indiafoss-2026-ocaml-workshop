(** Pandoc-style fenced-div preprocessor.

    Transforms [:::name ... :::] blocks into raw HTML wrappers so that
    cmarkit parses surrounding markdown normally inside them. Supported
    names: [slide], [subslide], [fragment], [notes], [quiz mcq],
    [quiz code], [solution], [cols], and [col]. *)

(** [preprocess ?line_offset src] returns [src] with every fenced
    div rewritten as raw HTML. Quiz blocks additionally carry a
    [data-quiz-line] attribute reflecting the 1-based source line of
    the opening [:::] marker, shifted up by [line_offset] (default 0).
    Pass a positive [line_offset] when [src] is the body of a file
    whose YAML frontmatter has already been stripped, so the recorded
    line numbers still match the original file.

    Every ocaml fence also gets an explicit [run-on] mode, since
    x-ocaml's own default ([run-on="load"]) evaluates a cell the moment
    it connects, which means opening a page ran its whole document.
    A [:::solution] cell and a [:::quiz code] test cell get
    [run-on="peek"], so they can be evaluated without touching the
    shared toplevel checkpoint their neighbours build up; every other
    cell, the [:::game-panel] cell included, gets [run-on="click"] and
    waits for the reader. Pressing Run on a cell still evaluates its
    not-yet-run predecessors, so nothing needs running in order by
    hand. *)
val preprocess : ?line_offset:int -> string -> string
