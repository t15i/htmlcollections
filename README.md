# lib-typescript-template

> **Warning!** You may use this template as a general reference for 
structuring and configuring your repository, but please do **not** use it as 
a GitHub template outside of this organization. This repository includes 
automation that depends on this organization’s reusable workflows, 
which *may* and *will* change at any time without prior notice.

## Features

This repository contains a template for TypeScript libraries.

Template provides:

1. **TypeScript development** with enforced best practices, including:
   - strict mode;
   - composite;
   - verbatim syntax;
   - separation of library code and tests, connected via [project references](https://www.typescriptlang.org/tsconfig#references);
   - and more (see `tsconfig.json` and [tsconfig reference](https://www.typescriptlang.org/tsconfig/));

2. **Code linting** with [Eslint](https://eslint.org/) and [typescript-eslint](https://typescript-eslint.io/);

3. **Code formatting** with [Prettier](https://prettier.io/);

4. **Testing**, including browser mode, with [Vitest](https://vitest.dev/);

5. **Build tooling** with [Vite](https://vite.dev/), producing the following artifacts:
   - type declarations;
   - minified IIFE bundle for [unpkg](https://unpkg.com/) and [jsDelivr](https://www.jsdelivr.com/);
   - unminified ES code for development;

6. **Automated checks** for pull requests and merge queue;

7. **Automated release pipeline** for npm that automatically bumps the version according to SemVer.

## Post-creation TODO:

Please make sure to:

* [ ] Change all occurrences of `lib-typescript-template` in `package.json`, 
`package-lock.json`, and `vite.config.js` with the name of your repository;

* [ ] Change the name, author, license, description, and keywords 
in `package.json`;

* [ ] Change this `README.md`;

Happy hacking!
