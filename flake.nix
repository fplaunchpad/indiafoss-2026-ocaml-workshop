{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      ocamlPkgs = pkgs.ocaml-ng.ocamlPackages_5_4;
    in {
      devShells.${system}.default = pkgs.mkShell {
        dontDetectOcamlConflicts = true;
        buildInputs = [
          ocamlPkgs.ocaml
          ocamlPkgs.dune_3
          ocamlPkgs.findlib
          ocamlPkgs.yojson
          ocamlPkgs.alcotest
          ocamlPkgs.cmarkit
          ocamlPkgs.mdx
          ocamlPkgs.fpath
        ];
      };
    };
}
