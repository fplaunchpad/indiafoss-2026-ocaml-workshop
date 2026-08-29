type entry = {
  part : int;
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

let read_title path =
  try
    let ic = open_in path in
    let n = in_channel_length ic in
    let raw = really_input_string ic n in
    close_in ic;
    let fm, _ = Frontmatter.parse raw in
    fm.title
  with Sys_error _ -> ""

let build ~content_dir ~current_slug =
  let names =
    try Sys.readdir content_dir |> Array.to_list with Sys_error _ -> []
  in
  let parts =
    names
    |> List.filter_map (fun name ->
         match parse_filename name with
         | None -> None
         | Some (part, slug) ->
             let path = Filename.concat content_dir name in
             if Sys.is_directory path then None
             else Some { part; title = read_title path; slug })
    |> List.sort (fun a b -> compare a.part b.part)
  in
  { parts; current_slug }

let neighbors t =
  let rec loop prev = function
    | [] -> (None, None)
    | entry :: rest when entry.slug = t.current_slug ->
        (prev, List.nth_opt rest 0)
    | entry :: rest -> loop (Some entry) rest
  in
  loop None t.parts
