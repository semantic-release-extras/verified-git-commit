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

| Step     | Description                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------- |
| `assets` | List of assets to commit back to the release branch. Each asset will be updated in its own commit. |

For example:

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

## Acknowledgments

Many thanks to @swinton for documenting the approach in [this gist]!

[this gist]: https://gist.github.com/swinton/03e84635b45c78353b1f71e41007fc7c

## Alternatives

One of these tutorials may outline a workflow that works better for your specific needs:

- [Use GPG keys to sign commits with @semantic-release/git](https://github.com/semantic-release/git#use-the-gpg-key-to-sign-commit-and-tags-locally)
- [Signing commits from bot accounts and automation scripts in GitHub Actions](https://httgp.com/signing-commits-in-github-actions/)
