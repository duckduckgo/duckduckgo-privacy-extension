# Build artifacts

Orphan branch `build/chromium-embedded/release`. It carries **built output
only** — no source, no history shared with `main`.

The branch is named after the path it carries, so the two look alike and are
not the same thing: the branch name is a ref, and `build/chromium-embedded/
release/` below is a directory inside it.

DDG-Chromium bundles the privacy extension as a component extension, and a
component extension is loaded from an unpacked directory that has to exist
before first run. The Chromium fork consumes this branch as a submodule and
pins a commit, so a version bump there is a one-line sha change instead of a
100k-line diff. See the tech design, *DDG-Chromium component extension
bundling*.

## Layout

Paths mirror the unpacked build tree exactly as `make` produces it:

```
build/<target>/<type>/
```

so today:

```
build/chromium-embedded/release/     <- what the Chromium fork points at
```

Mirroring rather than flattening is deliberate. A developer can point the
submodule at `main` instead, run the normal build, and the output lands at the
same path the fork already expects — no separate dev layout to maintain.

## Do not commit here by hand

`.github/workflows/release-chromium-embedded.yml` writes this branch, on a
push to `main` that changes `browsers/chromium-embedded/manifest.json`, or on
demand via **Run workflow**. Each commit records the source commit it was
built from, which is the only thing tying these bytes back to the code that
produced them.

The workflow replaces the target directory wholesale, so files dropped
upstream disappear here too. Commits are appended, never force-pushed.
