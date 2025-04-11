# mj-petite-fleur

Musical Juggling Website showing how to juggle "Petite Fleur"

## Information

This project uses:

-   [Typescript](https://www.typescriptlang.org/) to be able to use types in javascript.
-   [Vite](https://vitejs.dev/) for local production and bundling.
-   [pnpm](https://pnpm.io/) as the javascript packet manager.
-   [Threejs](https://threejs.org/) as 3D javascript library.
-   [ESLint](https://eslint.org/) as a Javascript / Typescript linter.
-   [Prettier](https://prettier.io/) as a Javascript / Typescript formatter.

TODO : To update later

## Local install (dev)

It is assumed you have pnpm installed on your machine. See the [installation page](https://pnpm.io/installation) in their documentation. The rest of the installation should also work with npm, although pnpm version locking isn't accessible to npm.

If using a too old node version (may happen on a Linux distro like Ubuntu), an error message will appear. A newer node version can be installed with :

```sh
pnpm env use --global lts
```

### 1. Install custom abcjs library

A fork of the library abcjs (to manipulate music files in abc notation) is used for this project, and must be installed.

To do so, fork the [forked library](https://github.com/kunchtler/abcjs)

Then use (in the folder you forked this library) :

```sh
pnpm install
```

And build the library with :

```sh
pnpm build
```

### 2. Configure the project.

Fork this repository (mj-petite-fleur), and then use :

```sh
pnpm install
```

Link the abcjs cusotm library by doing :

```sh
pnpm link <location_of_abcjs_custom_link>
```

### 3. Modify by hand the antlr4 library 

TODO : Remove this step in later version.

Go to node_modules/antlr4/package.json and modify the following (as found in [this issue](https://github.com/antlr/antlr4/issues/4218#issuecomment-1973086978)):

```JSON
"exports": {
    ".": {
++    "types": "./src/antlr4/index.d.ts",
      "node": {
--      "types": "./src/antlr4/index.d.ts",
        "import": "./dist/antlr4.node.mjs",
        "require": "./dist/antlr4.node.cjs",
        "default": "./dist/antlr4.node.mjs"
      },
      "browser": {
--      "types": "./src/antlr4/index.d.ts",
        "import": "./dist/antlr4.web.mjs",
        "require": "./dist/antlr4.web.cjs",
        "default": "./dist/antlr4.web.mjs"
      }
    }
  }
```

And _voilà_, all dependencies have been installed.

### Starting the project

Command shortcuts (specified in `package.json`) are available to start the project locally :

```sh
pnpm dev
```

and to build the project :

```sh
pnpm build
```

### Note to VSCode users :

-   It is strongly advised to install the ESLint and Prettier extensions.
-   We use the so-called flat layout to configure ESLint's rules, which are not active by default in VSCode's ESLint extension. The `eslint.experimental.useFlatConfig` flag should be set to true.
-   We strongly advise to enable the `editor.formatOnSave` flag to automatically format a document on save.

## To modify the siteswap parser.

The siteswap parser uses ANTLR to generate parsers in many languages (namely Typescript in our case, but also python), but also as a runtime package to parse expressions for that grammar.

To install ANTLR : TODO
