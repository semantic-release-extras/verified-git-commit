# @semantic-release-extras/verified-git-commit

[![Build Status]](https://github.com/semantic-release-extras/verified-git-commit/actions/workflows/release.yml)

[build status]: https://github.com/semantic-release-extras/verified-git-commit/actions/workflows/release.yml/badge.svg?event=push

This is a feature-limited alternative to the standard [@semantic-release/git] plugin.
This plugin lets you create gpg-signed [verified commits] without having to manage your own gpg keys.
This is possible since GitHub automatically signs commits made by bots over the REST API.

Commits made by this plugin look [like this].

[@semantic-release/git]: https://github.com/semantic-release/git
[like this]: https://github.com/semantic-release-extras/test-verified-git-commit/commit/1addb6a9f0622681ceb552086e66ba0b43048479
[verified commits]: https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification

## Caveats

### Only supports GitHub

This plugin uses the GitHub API, so other git forges are not supported.

### Each commit can only update one file

The [underlying API endpoint] can only update a single file at a time.
Consequently, if you update 3 files, each release will create 3 additional commits to your repository.

If you need to commit multiple release assets regularly, consider wrangling your own gpg keys so you can commit all release assets in a single commit.

[underlying api endpoint]: https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#create-or-update-file-contents

### Cannot create files

> Tracked by issue [#6](/../../issues/#6)

This plugin currently cannot create a new file, it can only update an existing, tracked file.

If you see this error message:

```
fatal: path '<asset>' exists on disk, but not in 'master'
```

`touch` the file and push it upstream before restarting your CI workflow.

This is a low-priority bug because there is a known workaround, and it occurs infrequently and under very specific/reproducible conditions.

## Install

```shell
npm install --save-dev --save-exact @semantic-release-extras/verified-git-commit
```

## Use

| Step      | Description                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------- |
| `assets`  | List of assets to commit back to the release branch. Each asset will be updated in its own commit. |
| `message` | The commit message template. Optional, defaults to `chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}` |

### Configuration

The `message` option uses [Lodash templates](https://lodash.com/docs#template) and supports the following variables:

- `branch` - The branch name
- `lastRelease` - Previous release details with properties:
  - `lastRelease.version` - Version of the previous release
  - `lastRelease.gitTag` - Git tag of the previous release
  - `lastRelease.gitHead` - Git hash of the previous release
- `nextRelease` - Current release info with properties:
  - `nextRelease.version` - Version of the next release
  - `nextRelease.gitTag` - Git tag of the next release
  - `nextRelease.gitHead` - Git hash of the next release
  - `nextRelease.notes` - Release notes for the next release

**Note:** It is recommended to include `[skip ci]` in the commit message to not trigger a new build. Some CI services support the `[skip ci]` keyword only in the subject of the message.

### Examples

Basic configuration with default commit message:

```json
{
  "plugins": [
    [
      "@semantic-release-extras/verified-git-commit",
      {
        "assets": ["CHANGELOG.md"]
      }
    ]
  ]
}
```

Custom commit message template:

```json
{
  "plugins": [
    [
      "@semantic-release-extras/verified-git-commit",
      {
        "assets": ["CHANGELOG.md", "package.json"],
        "message": "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}"
      }
    ]
  ]
}
```

Advanced template with branch name:

```json
{
  "plugins": [
    [
      "@semantic-release-extras/verified-git-commit",
      {
        "assets": ["CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version} on ${branch} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
}
```

## Acknowledgments

Many thanks to @swinton for documenting the approach in [this gist]!

[this gist]: https://gist.github.com/swinton/03e84635b45c78353b1f71e41007fc7c

## Alternatives

One of these tutorials may outline a workflow that works better for your specific needs:

- [Use GPG keys to sign commits with @semantic-release/git](https://github.com/semantic-release/git#use-the-gpg-key-to-sign-commit-and-tags-locally)
- [Signing commits from bot accounts and automation scripts in GitHub Actions](https://httgp.com/signing-commits-in-github-actions/)
