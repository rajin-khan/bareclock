# Contributing to bareclock

Keep the time easy to read and the app small. Fixes, accessibility improvements, and better browser support are welcome. Open an issue before starting a new clock face or a larger feature.

## Work locally

You need Python 3 to serve the files and Node.js 22 or newer to run the tests. No package installation is required.

```sh
git clone https://github.com/YOUR-USERNAME/bareclock.git
cd bareclock
python3 -m http.server 4173 --bind 127.0.0.1
```

Replace `YOUR-USERNAME` with your GitHub username after forking. Open [localhost:4173](http://127.0.0.1:4173/). Serve the files over HTTP rather than opening `index.html` directly.

1. Fork the repository and create a branch for your change.
2. Start the server with `python3 -m http.server 4173 --bind 127.0.0.1` or `pnpm dev`.
3. Make the smallest change that solves the problem. Follow the existing HTML, CSS, and JavaScript style.
4. Run `node --test tests/*.test.js` or `pnpm test` with Node.js 22 or newer.
5. For UI changes, follow the relevant [browser checks](docs/testing.md) and include a screenshot or short recording in your pull request.

There is no dependency installation step. Use pnpm if a package-manager command is needed. Discuss any new dependency first; packages must have been available for at least seven days before adoption.

Add regression coverage for behavior changes. Avoid external runtime requests, large assets on the initial clock load, and work that runs every second without needing to. Respect reduced motion and keep all controls usable from the keyboard.

## Data, assets, and caching

- Preserve attribution and licenses when changing bundled assets or city data.
- Follow [the directory rebuild instructions](data/README.md) for city data changes. Do not hand-edit the generated JSON or gzip file.
- Bump `CACHE` in `sw.js` when changing cached runtime files. Change `DIRECTORY_CACHE` only when replacing the city directory.
- Check that saved settings from the previous version still load.

See [architecture](docs/architecture.md), [theme sources](docs/themes-and-brand.md), and the [glossary](CONTEXT.md) for context.

## Pull requests

Explain the problem, the change, and how you checked it. Mention any behavior you could not verify. Keep unrelated cleanup separate from a fix.

By contributing, you agree to license your original contributions under the project's MIT license. Third-party material must include its source and compatible license terms.
