# clang-tidy-linter-action

This action runs [`clang-tidy`](https://clang.llvm.org/extra/clang-tidy/) over the changed files and reports any warnings.

## Inputs

### github-token

**Required** The API token to use for interacting with GitHub.  This defaults to the value of the environment variable `GITHUB_TOKEN`.

### build

**Required** The build directory which contains the `compile_commands.json` [compilation database](https://clang.llvm.org/docs/JSONCompilationDatabase.html).

## Example Usage

~~~
- uses: actions/checkout@v1
- run: |
    cmake -B build -D CMAKE_EXPORT_COMPILE_COMMANDS=YES -S ${{ github.workspace }}
- uses: compnerd/clang-tidy-linter-action
  with:
    build: build
~~~
