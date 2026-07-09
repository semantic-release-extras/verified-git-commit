# @semantic-release-extras/verified-git-commit

[![Build Status]](https://github.com/semantic-release-extras/verified-git-commit/actions/workflows/release.yml)

[build status]: https://github.com/semantic-release-extras/verified-git-commit/actions/workflows/release.yml/badge.svg?event=push

A semantic-release plugin to create [verified commits] without managing your own GPG keys.

This plugin is an alternative to [@semantic-release/git] that commits multiple files in a single commit through the GitHub API since GitHub automatically signs commits made by bots over the REST API, giving you verified commits without the complexity of GPG key management.

Commits made by this plugin look [like this].

[@semantic-release/git]: https://github.com/semantic-release/git
[like this]: https://github.com/semantic-release-extras/test-verified-git-commit/commit/1addb6a9f0622681ceb552086e66ba0b43048479
[verified commits]: https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification

## Features

- ✅ **Verified commits** without GPG key management
- ✅ **Multiple files in a single commit** via GitHub API
- ✅ **Compatible with semantic-release** workflow

## Caveats

### Only supports GitHub

This plugin uses the GitHub API, so other git forges (GitLab, Bitbucket, etc.) are not supported.

### Requires existing repository

The plugin cannot be used on empty repositories. Your repository must have at least one commit before using this plugin.

## Install

```shell
npm install --save-dev --save-exact @semantic-release-extras/verified-git-commit
```

## Usage

### Configuration

Add the plugin to your semantic-release configuration with the `assets` option:

| Option   | Type    | Required | Description                                             |
| -------- | ------- | -------- | ------------------------------------------------------- |
| `assets` | `array` | Yes      | List of file paths to commit back to the release branch |

All specified assets will be committed in a **single commit** with the message:

```
chore(release): <version> [skip ci]

<release notes>
```

### Basic Example

Commit a single file (like a changelog):

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

### Multiple Files Example

Commit multiple files in a single commit:

```json
{
  "plugins": [
    [
      "@semantic-release-extras/verified-git-commit",
      {
        "assets": [
          "CHANGELOG.md",
          "package.json",
          "package-lock.json",
          "docs/version.txt"
        ]
      }
    ]
  ]
}
```

### Complete semantic-release Configuration

Example `.releaserc.json` for a typical Node.js project:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        "changelogFile": "CHANGELOG.md"
      }
    ],
    "@semantic-release/npm",
    [
      "@semantic-release-extras/verified-git-commit",
      {
        "assets": ["CHANGELOG.md", "package.json", "package-lock.json"]
      }
    ],
    "@semantic-release/github"
  ]
}
```

### GitHub Actions Example

Example workflow file (`.github/workflows/release.yml`):

```yaml
name: Release

on:
  push:
    branches:
      - main

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "lts/*"

      - name: Install dependencies
        run: npm ci

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

**Important:** Make sure your `GITHUB_TOKEN` has write permissions to the repository.

## How It Works

This plugin uses the GitHub API to create commits instead of using `git` commands. The process works as follows:

1. **Reads files**: The plugin reads the specified asset files from your local filesystem
2. **Creates blobs**: Each file is uploaded to GitHub as a blob via the API
3. **Creates a tree**: All blobs are combined into a Git tree structure
4. **Creates a commit**: A new commit is created with your tree and commit message
5. **Updates the branch**: The branch reference is updated to point to the new commit

Because the commit is created via the GitHub API, GitHub automatically:

- ✅ **Signs the commit** with GitHub's GPG key
- ✅ **Marks it as "Verified"** in the UI
- ✅ **Attributes it to the bot account** making the API request

This approach bypasses the need to:

- ❌ Generate and store GPG keys
- ❌ Configure git signing locally
- ❌ Manage key rotation and security

## Comparison with @semantic-release/git

| Feature               | @semantic-release/git  | @semantic-release-extras/verified-git-commit |
| --------------------- | ---------------------- | -------------------------------------------- |
| **Commit Method**     | Local git commands     | GitHub API                                   |
| **Signed Commits**    | Requires GPG key setup | Automatic (by GitHub)                        |
| **Verified Badge**    | Only with GPG keys     | Always                                       |
| **Key Management**    | Manual                 | None required                                |
| **Platform Support**  | Any git forge          | GitHub only                                  |
| **Branch Protection** | Can be blocked         | Bypasses (API commits)                       |
| **Setup Complexity**  | Medium-High            | Low                                          |

## FAQ

### Can I use this with protected branches?

Yes! Since commits are created via the GitHub API, they can bypass branch protection rules that would normally block direct pushes. However, you still need a token with write permissions.

### Does this work with GitHub Actions?

Yes! This plugin is designed to work seamlessly with GitHub Actions. Just make sure to use `persist-credentials: false` in your checkout action and provide a `GITHUB_TOKEN` with write permissions.

### Can I create new files, or only update existing ones?

The plugin can both **create new files** and **update existing files**. The underlying `octokit-commit-multiple-files` package handles both operations automatically.

### What happens if there's a race condition with multiple commits?

The underlying package includes retry logic for "not fast forward" errors. If two processes try to commit simultaneously, one will retry automatically.

### Can I use this outside of GitHub Actions?

Yes! You can use this plugin in any CI/CD environment as long as you provide a valid GitHub token with repository write permissions via the `GITHUB_TOKEN` environment variable.

### Why are my commits not showing up as verified?

Make sure:

1. You're using a valid GitHub token (not a personal access token without proper scopes)
2. The token has write permissions to the repository
3. The repository is on GitHub (not another git forge)

## Troubleshooting

### Error: "Update is not a fast forward"

This error occurs when someone else has pushed to the branch while your release was running. The plugin will automatically retry, but if the problem persists, check if:

- Multiple CI jobs are running releases simultaneously
- Manual pushes are happening during the release process

### Error: "Resource not accessible by integration"

Your GitHub token doesn't have write permissions. Make sure:

- Your workflow has `permissions: { contents: write }`
- You're using `${{ secrets.GITHUB_TOKEN }}` in your workflow
- Your repository settings allow Actions to create and approve pull requests (if applicable)

## Acknowledgments

Many thanks to:

- [@swinton](https://github.com/swinton) for documenting the GitHub API approach in [this gist]
- [@mheap](https://github.com/mheap) for creating the [octokit-commit-multiple-files] package
- The [semantic-release] team for the amazing release automation framework

[this gist]: https://gist.github.com/swinton/03e84635b45c78353b1f71e41007fc7c
[octokit-commit-multiple-files]: https://github.com/mheap/octokit-commit-multiple-files
[semantic-release]: https://github.com/semantic-release/semantic-release

## Alternatives

One of these tutorials may outline a workflow that works better for your specific needs:

- [Use GPG keys to sign commits with @semantic-release/git](https://github.com/semantic-release/git#use-the-gpg-key-to-sign-commit-and-tags-locally)
- [Signing commits from bot accounts and automation scripts in GitHub Actions](https://httgp.com/signing-commits-in-github-actions/)
