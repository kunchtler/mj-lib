# Musical Juggling Library

Library to visualize and infer musical juggling patterns.

Examples:
- https://nicolas.thiery.name/leo/au_clair_de_la_lune/
- https://nicolas.thiery.name/Pachelbel/Opalayé
- https://nicolas.thiery.name/Pachelbel/

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

For now, the project is only available as a local install.

It is assumed you have pnpm installed on your machine. See the [installation page](https://pnpm.io/installation) in their documentation. The rest of the installation should also work with npm, although pnpm version locking isn't accessible to npm.

If using a too old node version (may happen on a Linux distro like Ubuntu), an error message will appear. A newer node version can be installed with :

```sh
pnpm env use --global lts
```

### Project installation.

Fork this repository, and then use :

```sh
pnpm install
```

And _voilà_, all dependencies have been installed.

### Testing the project in development.

Alongside the library code, Vite allows to have an index.html file located at root that can be used to test the library. To run and debug this html file, use the command (specified in `package.json`):
```sh
pnpm dev
```

### Building the library.

Use:
```sh
pnpm build
```

### Use the library in other projects.

As the library is only avaible in local development, you need to first [build this library](#building-the-library).

Then, from this directory, do:
```sh
pnpm link
```

You can now, in any other project type the following to use this library:
```sh
pnpm link musicaljuggling
```


### Note to VSCode users :

-   It is strongly advised to install the ESLint and Prettier extensions.
-   We use the so-called flat layout to configure ESLint's rules, which are not active by default in VSCode's ESLint extension. The `eslint.experimental.useFlatConfig` flag should be set to true.
-   We strongly advise to enable the `editor.formatOnSave` flag to automatically format a document on save.

### Unused for now: Install custom abcjs library.

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

Link the abcjs cusotm library by doing :

```sh
pnpm link <location_of_abcjs_custom_link>
```
