type entry = {
  order : int;
  part : int option;
  lab : bool;
  title : string;
  slug : string;
}

type t = {
  parts : entry list;
  current_slug : string;
}

let parse_filename name =
  let base = Filename.basename name in
  let slug =
    if Filename.check_suffix base ".md" then Filename.chop_suffix base ".md"
    else base
  in
  try Scanf.sscanf slug "%d-" (fun part -> Some (part, slug))
  with Scanf.Scan_failure _ | End_of_file -> None

let read_frontmatter path =
  try
    let ic = open_in path in
    let n = in_channel_length ic in
    let raw = really_input_string ic n in
    close_in ic;
    let fm, _ = Frontmatter.parse raw in
    fm
  with Sys_error _ -> Frontmatter.empty

let build ~content_dir ~current_slug =
  let names =
    try Sys.readdir content_dir |> Array.to_list with Sys_error _ -> []
  in
  let parts =
    names
    |> List.filter_map (fun name ->
         match parse_filename name with
         | None -> None
         | Some (order, slug) ->
             let path = Filename.concat content_dir name in
             if Sys.is_directory path then None
             else
               let fm = read_frontmatter path in
               Some { order; part = fm.part; lab = fm.lab; title = fm.title; slug })
    |> List.sort (fun a b -> compare a.order b.order)
  in
  let rec validate_groups seen_lab = function
    | [] -> ()
    | entry :: rest ->
        if seen_lab && not entry.lab then
          failwith
            (Printf.sprintf
               "manifest: core chapter %s appears after the game lab" entry.slug);
        validate_groups (seen_lab || entry.lab) rest
  in
  validate_groups false parts;
  { parts; current_slug }

let neighbors t =
  let rec loop prev = function
    | [] -> (None, None)
    | entry :: rest when entry.slug = t.current_slug ->
        (prev, List.nth_opt rest 0)
    | entry :: rest -> loop (Some entry) rest
  in
  loop None t.parts
