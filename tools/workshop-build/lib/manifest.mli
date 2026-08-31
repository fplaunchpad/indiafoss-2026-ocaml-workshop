(** Navigation manifest for the numbered workshop parts. *)

type entry = {
  order : int;
  part : int option;
  title : string;
  slug : string;
}

type t = {
  parts : entry list;
  current_slug : string;
}

val build : content_dir:string -> current_slug:string -> t

(** Parse [01-basics.md] as [(1, "01-basics")]. *)
val parse_filename : string -> (int * string) option

val neighbors : t -> entry option * entry option
