(* Line-oriented preprocessor for Pandoc-style fenced div blocks.

   Transforms:

     :::slide
     contents
     :::

   into raw-HTML wrappers that cmarkit will pass through. We support
   these block names:

     slide      -> <section class="slide" data-slide>...</section>
     subslide   -> <section class="slide subslide" data-subslide>...</section>
     fragment   -> <div class="fragment">...</div>
     notes      -> <aside class="notes">...</aside>
     quiz mcq   -> <div class="quiz quiz-mcq" data-quiz-id="qN">...</div>
     quiz code  -> <div class="quiz quiz-code" data-quiz-id="qN">...</div>
     solution   -> <details class="solution"><summary>Show reference
                   solution</summary>...</details>
                   Collapsed by default in chapter mode so self-readers
                   don't see the answer immediately after the quiz.
                   Hidden entirely in slide mode (the slides don't show
                   quizzes anyway).

   Quizzes get a sequential auto-id ("q1", "q2", ...) so the runtime
   JS can key localStorage by it without the author having to invent
   stable ids.

   Nesting is supported by tracking a stack: `:::name` opens, bare `:::`
   closes the most recent open block.

   The substitution is done by emitting the HTML opening tag *on its own
   line surrounded by blank lines*, so cmarkit treats it as an HTML
   block (open block + blank line + parsed content + blank line + close
   tag). This is the standard CommonMark recipe for embedding raw HTML
   that wraps markdown content.
*)

(* Quiz blocks carry an id string that becomes the data-quiz-id
   attribute on the rendered div. Authors may pin an explicit
   stable id with [:::quiz mcq id=cons-immutability]; without it,
   the build assigns a positional fallback ["q1", "q2", ...]. The
   stable id keeps saved in-browser progress attached to the right
   question if quizzes are reordered. *)
type kind =
  | Slide
  | Subslide
  | Fragment
  | Notes
  | Solution
  | Provided
  | Game_panel
  | Quiz_mcq of string * int  (* id, 1-based source line of the opening ::: *)
  | Quiz_code of string * int
  | Cols
  | Col of int option  (* width as integer percent, e.g. Some 60; None = flex equally *)

(* Sanitise an author-supplied id to a slug shape that survives in
   URL fragments. Lowercase, [a-z0-9-] only, collapse repeats,
   trim leading/trailing dashes, length-capped. *)
let slugify_id s =
  let buf = Buffer.create (String.length s) in
  let last_dash = ref true in
  String.iter
    (fun c ->
      let c = Char.lowercase_ascii c in
      if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') then begin
        Buffer.add_char buf c;
        last_dash := false
      end else if not !last_dash then begin
        Buffer.add_char buf '-';
        last_dash := true
      end)
    s;
  let raw = Buffer.contents buf in
  let n = String.length raw in
  let lo = if n > 0 && raw.[0] = '-' then 1 else 0 in
  let hi = if n > lo && raw.[n - 1] = '-' then n - 1 else n in
  let cleaned = if hi > lo then String.sub raw lo (hi - lo) else "" in
  let max_len = 64 in
  if String.length cleaned > max_len then String.sub cleaned 0 max_len
  else cleaned

(* Parse "quiz mcq [id=foo]" or "quiz code [id=foo]". The id, if
   present, must follow the keyword. We accept whitespace between
   the tokens but nothing else. *)
let parse_quiz_kind rest =
  let trimmed = String.trim rest in
  let starts_with prefix s =
    String.length s >= String.length prefix
    && String.sub s 0 (String.length prefix) = prefix
  in
  let after_prefix prefix s =
    String.sub s (String.length prefix) (String.length s - String.length prefix)
  in
  let parse_optional_id tail =
    let t = String.trim tail in
    if t = "" then None
    else if starts_with "id=" t then
      let v = after_prefix "id=" t |> String.trim in
      let slug = slugify_id v in
      if slug = "" then None else Some slug
    else None
  in
  if starts_with "quiz mcq" trimmed then
    let tail = after_prefix "quiz mcq" trimmed in
    Some (`Mcq, parse_optional_id tail)
  else if starts_with "quiz code" trimmed then
    let tail = after_prefix "quiz code" trimmed in
    Some (`Code, parse_optional_id tail)
  else None

(* Parse the tail of a [:::col ...] open. Accepts:
     ""        -> Some None        (no width: flex equally with siblings)
     "60%"     -> Some (Some 60)   (1..99 inclusive)
   Anything else (e.g. "60" without %, "abc", "150%", "0%") yields
   None, so the caller falls through and the line stays as plain
   text -- same fate as any unrecognised [:::foo] today. *)
let parse_col_width tail =
  let t = String.trim tail in
  if t = "" then Some None
  else
    let n = String.length t in
    if n < 2 || t.[n - 1] <> '%' then None
    else
      let digits = String.sub t 0 (n - 1) in
      match int_of_string_opt digits with
      | Some w when w >= 1 && w <= 99 -> Some (Some w)
      | _ -> None

(* Quiz state is threaded through preprocess as a mutable counter
   used only for positional fallback ids. [line_no] is 1-based and
   refers to the input line of the opening [:::] marker; we stamp
   it onto the rendered div for useful diagnostics. *)
let parse_open ~quiz_counter ~line_no line =
  let s = String.trim line in
  if String.length s < 3 || String.sub s 0 3 <> ":::" then None
  else
    let rest = String.sub s 3 (String.length s - 3) |> String.trim in
    match rest with
    | "" -> None  (* closing :::, not an open *)
    | "slide" -> Some Slide
    | "subslide" -> Some Subslide
    | "fragment" -> Some Fragment
    | "notes" -> Some Notes
    | "solution" -> Some Solution
    | "provided" -> Some Provided
    | "game-panel" -> Some Game_panel
    | "cols" -> Some Cols
    | _ when rest = "col" -> Some (Col None)
    | _ when String.length rest >= 4
             && String.sub rest 0 4 = "col "
             ->
      let tail = String.sub rest 4 (String.length rest - 4) in
      (match parse_col_width tail with
       | Some w -> Some (Col w)
       | None -> None)
    | _ ->
      (match parse_quiz_kind rest with
       | Some (kind, explicit_id) ->
         incr quiz_counter;
         let id = match explicit_id with
           | Some s -> s
           | None -> Printf.sprintf "q%d" !quiz_counter
         in
         (match kind with
          | `Mcq -> Some (Quiz_mcq (id, line_no))
          | `Code -> Some (Quiz_code (id, line_no)))
       | None -> None)

let is_close line =
  let s = String.trim line in
  s = ":::"

let open_tag = function
  | Slide -> "<section class=\"slide\" data-slide>"
  | Subslide -> "<section class=\"slide subslide\" data-subslide>"
  | Fragment -> "<div class=\"fragment\">"
  | Notes -> "<aside class=\"notes\">"
  | Solution ->
      "<details class=\"solution\"><summary>Show reference solution</summary>"
  | Provided ->
      "<details class=\"provided\"><summary>Provided code</summary>"
  | Game_panel ->
      "<details class=\"provided game-panel-source\"><summary>Provided game and board code</summary>"
  | Quiz_mcq (id, line) ->
      Printf.sprintf
        "<div class=\"quiz quiz-mcq\" data-quiz-id=\"%s\" data-quiz-line=\"%d\">"
        id line
  | Quiz_code (id, line) ->
      Printf.sprintf
        "<div class=\"quiz quiz-code\" data-quiz-id=\"%s\" data-quiz-line=\"%d\">"
        id line
  | Cols -> "<div class=\"cols\">"
  | Col None -> "<div class=\"col\">"
  | Col (Some w) -> Printf.sprintf "<div class=\"col\" style=\"flex: 0 0 %d%%;\">" w

let close_tag = function
  | Slide | Subslide -> "</section>"
  | Fragment -> "</div>"
  | Notes -> "</aside>"
  | Solution | Provided | Game_panel -> "</details>"
  | Quiz_mcq _ | Quiz_code _ -> "</div>"
  | Cols | Col _ -> "</div>"

(* Inside [:::quiz code], the FIRST ocaml fence is the student cell
   and any subsequent ones are test cells (hidden assertion code).
   Authors write them as ```ocaml skip``` (skip is required by
   ocaml-mdx, which would otherwise try to run the assertion code
   against undefined names from the student cell).

   For the build's own use, we rewrite a test cell's info string to
   add the [quiz-test] marker. This rewriting happens only in the
   output we feed to cmarkit -- the source file mdx reads is
   untouched. Parse.ml looks for the [quiz-test] attribute. *)
let is_ocaml_fence_open line =
  let s = String.trim line in
  String.length s >= 3
  && String.sub s 0 3 = "```"
  && (let rest = String.sub s 3 (String.length s - 3) |> String.trim in
      match String.split_on_char ' ' rest with
      | "ocaml" :: _ -> true
      | _ -> false)

(* An ocaml fence whose info string carries the [skip] label. Inside a
   [:::quiz code] div these are the hidden test cells; call only after
   [is_ocaml_fence_open] has matched. *)
let fence_has_skip line =
  let s = String.trim line in
  let rest = String.sub s 3 (String.length s - 3) |> String.trim in
  String.split_on_char ' ' rest |> List.exists (fun w -> w = "skip")

let inject_quiz_test_marker line =
  (* Find the [```ocaml] prefix and append [ quiz-test] after the
     info string. Preserve leading whitespace and any existing labels
     (notably [skip], which mdx needs). *)
  let s = line in
  let n = String.length s in
  (* Find end of info string (end of line or end of trailing spaces). *)
  let i = ref 0 in
  while !i < n && (s.[!i] = ' ' || s.[!i] = '\t') do incr i done;
  let prefix_len = !i in
  let body = String.sub s prefix_len (n - prefix_len) in
  let body_trimmed = String.trim body in
  let leading = String.sub s 0 prefix_len in
  leading ^ body_trimmed ^ " quiz-test"

let inject_marker line marker =
  let n = String.length line in
  let i = ref 0 in
  while !i < n && (line.[!i] = ' ' || line.[!i] = '\t') do incr i done;
  let leading = String.sub line 0 !i in
  let body = String.sub line !i (n - !i) |> String.trim in
  leading ^ body ^ " " ^ marker

(* [line_offset] shifts the recorded source-line numbers up so they
   match the original file's line numbering (the body the caller
   hands us has already had the YAML frontmatter stripped off). It
   is added to every emitted [data-quiz-line] attribute. Pass 0 if
   you are processing a whole file already including frontmatter. *)
let preprocess ?(line_offset = 0) src =
  let lines = String.split_on_char '\n' src in
  let buf = Buffer.create (String.length src) in
  let stack = ref [] in
  let quiz_counter = ref 0 in
  let in_quiz_code () =
    List.exists (function Quiz_code _ -> true | _ -> false) !stack
  in
  let in_kind wanted = List.exists (fun kind -> kind = wanted) !stack in
  let in_code_block = ref false in
  List.iteri
    (fun i line ->
      let line_no = i + 1 + line_offset in
      (* Distinguish entering / leaving a fenced code block from the
         opening of a fenced div ([:::]). Code-block fences start with
         [```]; div opens / closes start with [:::]. *)
      let is_fence_line =
        let s = String.trim line in
        String.length s >= 3 && String.sub s 0 3 = "```"
      in
      if !in_code_block then begin
        (* Inside a fenced code block, [:::] lines are literal content
           (e.g. a lecture showing the fenced-div syntax itself); only
           the closing fence is structural. *)
        if is_fence_line then in_code_block := false;
        Buffer.add_string buf line;
        Buffer.add_char buf '\n'
      end
      else
      match parse_open ~quiz_counter ~line_no line with
      | Some k ->
          stack := k :: !stack;
          Buffer.add_string buf "\n";
          Buffer.add_string buf (open_tag k);
          Buffer.add_string buf "\n\n"
      | None when is_close line -> (
          match !stack with
          | [] ->
              Buffer.add_string buf line;
              Buffer.add_char buf '\n'
          | k :: rest ->
              stack := rest;
              Buffer.add_string buf "\n";
              Buffer.add_string buf (close_tag k);
              Buffer.add_string buf "\n\n")
      | None when is_fence_line && not !in_code_block
                  && is_ocaml_fence_open line ->
          (* Opening an ocaml code block inside a quiz-code div. The
             [skip]-labelled fences are the hidden test cells; any
             other fence (the student cell, or a display fence that is
             part of the question) stays visible. *)
          in_code_block := true;
          if in_quiz_code () && fence_has_skip line then begin
            Buffer.add_string buf (inject_quiz_test_marker line);
            Buffer.add_char buf '\n'
          end else if in_kind Game_panel then begin
            Buffer.add_string buf (inject_marker line "game-panel=#game-panel");
            Buffer.add_char buf '\n'
          end else if in_kind Solution then begin
            Buffer.add_string buf (inject_marker line "run-on=peek");
            Buffer.add_char buf '\n'
          end else begin
            Buffer.add_string buf line;
            Buffer.add_char buf '\n'
          end
      | None when is_fence_line ->
          (* Reached only when not already inside a code block (the
             in-block case is handled above), so this opens one. *)
          in_code_block := true;
          Buffer.add_string buf line;
          Buffer.add_char buf '\n'
      | None ->
          Buffer.add_string buf line;
          Buffer.add_char buf '\n')
    lines;
  (* A forgotten [:::] used to be silently auto-closed here, which
     shifted every subsequent slide boundary without a diagnostic.
     Fail loudly instead. *)
  (match !stack with
  | [] -> ()
  | ks ->
      let name = function
        | Slide -> "slide"
        | Subslide -> "subslide"
        | Fragment -> "fragment"
        | Notes -> "notes"
        | Solution -> "solution"
        | Provided -> "provided"
        | Game_panel -> "game-panel"
        | Quiz_mcq (id, l) -> Printf.sprintf "quiz mcq %s (line %d)" id l
        | Quiz_code (id, l) -> Printf.sprintf "quiz code %s (line %d)" id l
        | Cols -> "cols"
        | Col _ -> "col"
      in
      failwith
        (Printf.sprintf "unclosed fenced div(s) at end of file: %s"
           (String.concat ", " (List.map name ks))));
  Buffer.contents buf
