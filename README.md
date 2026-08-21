# webui

[FreeCORE](https://freecore.org) carries the TrueNAS CORE 13.3 system forward as an
independently maintained operating system on FreeBSD. TrueNAS CORE 13.3 systems
upgrade straight to FreeCORE 15.0 in place, then continue on the project’s
update train.

Not affiliated with or endorsed by iXsystems, Inc.

## What this repository is

`webui` forked from [`truenas/webui`](https://github.com/truenas/webui) at:

| | |
|---|---|
| **Base commit** | `5b25fbff2c7e7cc62a5a6b75f4c5e605c5a6a805` |
| **Base** | truenas/13.3-stable @ 2024-08-08 |
| **Licence** | GPL-3.0 — unchanged from upstream |

## How to read the history

Upstream history is preserved verbatim below the base commit: original commits,
original authors, original dates. Everything FreeCORE changed sits above it.

```sh
git log --oneline 5b25fbff2c7e..HEAD      # the entire FreeCORE delta
git diff 5b25fbff2c7e..HEAD               # ...as one diff
```

The FreeCORE commits are a compact **release history**, generated from the
reviewed source-state difference rather than copied from the development
repositories. Private commit subjects, issue references, dates, and intermediate
churn are not mirrored here. Only tagged release commits are states that were
built and tested.

## Releases

Tags mark states that were actually built, installed and validated.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports go to
security@freecore.org, not to the issue tracker — see [SECURITY.md](SECURITY.md).

## Licence and attribution

See [NOTICE](NOTICE) and [TRADEMARKS.md](TRADEMARKS.md). Nothing here is
relicensed; upstream copyright notices and licence texts are preserved.
