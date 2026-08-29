(* Build entry: read N .md workshop files, emit N .html into _site/.
   Usage: workshop-build <src.md> <dst.html> [<relative_root>] *)

let read_file path =
  let ic = open_in path in
  let n = in_channel_length ic in
  let s = really_input_string ic n in
  close_in ic;
  s

let write_file path s =
  let dir = Filename.dirname path in
  if dir <> "" && dir <> "." then
    (try Unix.mkdir dir 0o755 with Unix.Unix_error _ -> ());
  let oc = open_out path in
  output_string oc s;
  close_out oc

(* Rewrite [src="/assets/...] and [href="/assets/...] attributes so
   they pick up the [asset_root] prefix that lecture-page CSS and JS
   already use. This lets ![alt](/assets/diagrams/foo.svg) in lecture
   markdown resolve to the right URL in both local preview and
   production. *)
let rewrite_asset_urls ~asset_root html =
  if asset_root = "" then html
  else
    let buf = Buffer.create (String.length html) in
    let needle = "\"/assets/" in
    let replacement = "\"" ^ asset_root ^ "/assets/" in
    let n = String.length html in
    let needle_len = String.length needle in
    let i = ref 0 in
    while !i < n do
      if !i + needle_len <= n && String.sub html !i needle_len = needle then begin
        Buffer.add_string buf replacement;
        i := !i + needle_len
      end else begin
        Buffer.add_char buf html.[!i];
        incr i
      end
    done;
    Buffer.contents buf

(* Numbered workshop files must carry a matching [part] value. *)
let check_part_frontmatter ~src (fm : Workshop_build.Frontmatter.t) =
  match Workshop_build.Manifest.parse_filename (Filename.basename src) with
  | None -> ()
  | Some (part, _) ->
      let fail msg =
        Printf.eprintf "%s: %s\n" src msg;
        exit 1
      in
      if String.trim fm.title = "" then fail "frontmatter: missing title";
      (match fm.part with
      | Some n when n = part -> ()
      | Some n ->
          fail
            (Printf.sprintf
               "frontmatter: part %d does not match filename part %02d" n part)
      | None -> fail "frontmatter: missing part")

let render_one ~src ~dst ~asset_root =
  let raw = read_file src in
  let fm, body = Workshop_build.Frontmatter.parse raw in
  check_part_frontmatter ~src fm;
  (* The body has had the YAML frontmatter stripped off; shift the
     line numbers we record in [data-quiz-line] back up to match
     the original file. The offset is (lines in raw) - (lines in body). *)
  let line_offset =
    let count_nl s =
      let n = ref 0 in
      String.iter (fun c -> if c = '\n' then incr n) s;
      !n
    in
    count_nl raw - count_nl body
  in
  let preprocessed = Workshop_build.Divs.preprocess ~line_offset body in
  (* [strict:false] enables cmarkit's extensions: tables, strikethrough,
     LaTeX math, footnotes, task list items. We need tables for the
     primitive-types summary in Part 2 and other workshop sections. *)
  let doc = Cmarkit.Doc.of_string ~strict:false preprocessed in
  let doc' = Workshop_build.Parse.transform doc in
  let html_body =
    Cmarkit_html.of_doc ~safe:false doc'
    |> rewrite_asset_urls ~asset_root
  in
  (* The manifest scan looks at siblings of [src]: every
     [W<nn>-L<nn>-<rest>.md] file in the same directory becomes an
     entry. The current page is identified by its filename slug. *)
  let content_dir = Filename.dirname src in
  let current_slug =
    let base = Filename.basename src in
    if Filename.check_suffix base ".md" then Filename.chop_suffix base ".md"
    else base
  in
  let manifest =
    match Workshop_build.Manifest.parse_filename (Filename.basename src) with
    | None -> None  (* src isn't a workshop file; skip the sidebar. *)
    | Some _ ->
        Some (Workshop_build.Manifest.build ~content_dir ~current_slug)
  in
  let html =
    Workshop_build.Emit.render ~asset_root ~fm ~html_body ?manifest ()
  in
  write_file dst html

let usage () =
  prerr_endline "usage: workshop-build SRC.md DST.html [ASSET_ROOT]";
  exit 2

let () =
  match Sys.argv with
  | [| _; src; dst |] ->
      (* Default: assets served at the site root. The page loads from
         [http://host/path/to/part.html] and assets are at
         [http://host/assets/...]. *)
      render_one ~src ~dst ~asset_root:""
  | [| _; src; dst; root |] ->
      render_one ~src ~dst ~asset_root:root
  | _ -> usage ()
