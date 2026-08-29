(lang dune 3.17)

(using mdx 0.4)

(name indiafoss_ocaml_workshop)

(generate_opam_files true)

(maintainers "KC Sivaramakrishnan <kc@kcsrk.info>")

(authors "KC Sivaramakrishnan")

; The opam package is the workshop toolchain (OCaml code), which is ISC.
; The workshop *content* (content/, assets/css/, README) is CC-BY-NC-SA-4.0;
; see LICENSE / LICENSES.md. They are deliberately different.
(license "ISC")

(source
 (github fplaunchpad/indiafoss-2026-ocaml-workshop))

; Dependencies used by the builder and by ocaml-mdx validation of the
; three workshop parts.
(package
 (name indiafoss_ocaml_workshop)
 (synopsis "Fun and Profit with OCaml: IndiaFOSS 2026 workshop")
 (description
  "Workshop content, static-site builder, and runnable in-browser OCaml examples for IndiaFOSS 2026.")
 (depends
  (ocaml (>= 5.4.0))
  (mdx (>= 2.4))
  cmarkit
  fpath
  alcotest))
