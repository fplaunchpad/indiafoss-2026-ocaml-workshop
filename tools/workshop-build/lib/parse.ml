(* OCaml-code-block transformation over cmarkit's AST.

   The pre-pass in [Divs] has already converted [:::name ... :::] fenced
   divs into raw HTML wrappers. After cmarkit parses the document, we walk
   the AST and replace OCaml fenced code blocks with raw-HTML
   [<x-ocaml ...attrs>code</x-ocaml>] blocks.

   The info string after [```ocaml] carries attributes in a simple
   space-separated form, e.g. [```ocaml init=true autorun=true]. Boolean
   attributes can be written bare ([```ocaml init autorun]).

   Supported attributes (passed through verbatim as HTML attributes on
   the x-ocaml element):
     init        - run automatically before any user-driven cell
     autorun     - run automatically on cell mount
     hidden      - present in DOM but not visually rendered
     non-deterministic - tolerated for ocaml-mdx CI parity
     skip        - ocaml-mdx label; we treat it as "do not auto-run".
     quiz-test   - synthesised by [Divs.preprocess] for the 2nd+
                   ocaml fence inside a [:::quiz code] block. Rendered
                   as [hidden] + [data-quiz-test="true"]; the quiz
                   runtime finds it via the data attribute and wires
                   it to the visible student cell's Check button.
                   Authors do NOT write [quiz-test] themselves; they
                   write [ocaml skip] for the assertion cell, and the
                   build adds [quiz-test] based on position.
*)

let lang_is_ocaml info =
  match String.split_on_char ' ' (String.trim info) with
  | l :: _ when String.lowercase_ascii l = "ocaml" -> true
  | _ -> false

let parse_attrs info =
  match String.split_on_char ' ' (String.trim info) with
  | [] | [ _ ] -> []
  | _ :: rest ->
      List.filter_map
        (fun a ->
          let a = String.trim a in
          if a = "" then None
          else
            match String.index_opt a '=' with
            | None -> Some (a, "true")
            | Some i ->
                let k = String.sub a 0 i in
                let v = String.sub a (i + 1) (String.length a - i - 1) in
                Some (k, v))
        rest

let html_escape s =
  let b = Buffer.create (String.length s) in
  String.iter
    (fun c ->
      match c with
      | '&' -> Buffer.add_string b "&amp;"
      | '<' -> Buffer.add_string b "&lt;"
      | '>' -> Buffer.add_string b "&gt;"
      | '"' -> Buffer.add_string b "&quot;"
      | c -> Buffer.add_char b c)
    s;
  Buffer.contents b

let render_x_ocaml ~code ~attrs =
  (* If [quiz-test] is present (added by [Divs.preprocess] for the
     2nd+ ocaml fence inside a [:::quiz code] block), treat the cell
     as the hidden assertion cell of a quiz: emit [hidden] +
     [data-quiz-test="true"], drop the [quiz-test] attribute itself
     (it is not a real x-ocaml attribute). The author-written [skip]
     label, if present, is also dropped here -- it exists only to
     keep ocaml-mdx from running the cell. *)
  let is_quiz_test = List.mem_assoc "quiz-test" attrs in
  let attrs =
    if is_quiz_test then
      let attrs = List.remove_assoc "quiz-test" attrs in
      let attrs = List.remove_assoc "skip" attrs in
      if List.mem_assoc "hidden" attrs then attrs
      else ("hidden", "true") :: attrs
    else List.remove_assoc "skip" attrs
  in
  let buf = Buffer.create 256 in
  Buffer.add_string buf "<x-ocaml";
  if is_quiz_test then Buffer.add_string buf " data-quiz-test=\"true\"";
  List.iter
    (fun (k, v) ->
      Buffer.add_char buf ' ';
      Buffer.add_string buf k;
      Buffer.add_char buf '=';
      Buffer.add_char buf '"';
      Buffer.add_string buf (html_escape v);
      Buffer.add_char buf '"')
    attrs;
  (* Stash the original source on a [data-source] attribute so a
     per-cell "Reset" can restore it after the user has edited the
     CodeMirror editor inside the shadow DOM. *)
  Buffer.add_string buf " data-source=\"";
  Buffer.add_string buf (html_escape code);
  Buffer.add_string buf "\">";
  (* x-ocaml's WebComponent reads the textContent verbatim, so escape
     the angle brackets but leave the line structure intact. *)
  Buffer.add_string buf (html_escape code);
  Buffer.add_string buf "</x-ocaml>";
  Buffer.contents buf

(* Walk the AST: replace ocaml code blocks with html_block nodes. *)
let transform doc =
  let open Cmarkit in
  let block_mapper _m b =
    match b with
    | Block.Code_block (cb, meta) ->
        let info =
          match Block.Code_block.info_string cb with
          | Some (s, _) -> s
          | None -> ""
        in
        if lang_is_ocaml info then
          let code =
            Block.Code_block.code cb
            |> List.map Block_line.to_string
            |> String.concat "\n"
          in
          let attrs = parse_attrs info in
          let html = render_x_ocaml ~code ~attrs in
          let lines =
            String.split_on_char '\n' html |> List.map Block_line.list_of_string
            |> List.concat
          in
          Mapper.ret (Block.Html_block (lines, meta))
        else Mapper.default
    | _ -> Mapper.default
  in
  let mapper = Mapper.make ~block:block_mapper () in
  Mapper.map_doc mapper doc
