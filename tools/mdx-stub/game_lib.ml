type mouse = {
  pos : string;
  drag : bool;
  button : [ `Left | `Right ];
}

let render (_ : string) = ()
let play ~freq:(_ : int) ~ms:(_ : int) = ()
let every (_ : int) = ()
let on_click (_ : string -> unit) = ()
let on_key (_ : string -> unit) = ()
let on_input (_ : string -> string -> unit) = ()
let on_mouse (_ : mouse -> unit) = ()
let on_tick (_ : unit -> unit) = ()
let on_repaint (_ : unit -> unit) = ()
