(** Emit a single self-contained HTML page that hosts both chapter and
    slide views of a lecture.

    [asset_root] is a string prepended to each asset path. For
    production builds where assets are served at the site root, pass
    [""] (leading slashes come from each ["/assets/..."] path).

    [manifest], if provided, drives the GitBook-style sidebar and
    prev/next navigation on the page. *)
val render :
  asset_root:string ->
  fm:Frontmatter.t ->
  html_body:string ->
  ?manifest:Manifest.t ->
  unit ->
  string
