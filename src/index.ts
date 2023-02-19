import * as fs from "node:fs";
import { execSync } from "node:child_process";

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import type { Context, PluginSpec } from "semantic-release";
import parseRepositoryUrl from "parse-github-repo-url";

const ThrottlingOctokit = Octokit.plugin(throttling);

type RepositorySlug = {
  owner: string;
  name: string;
};

function readFileInBase64(path: string): string {
  return fs.readFileSync(path, { encoding: "base64" });
}

function getOctokit(token: string) {
  return new ThrottlingOctokit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter: number, options: any) => {
        console.warn(
          `RateLimit detected for request ${options.method} ${options.url}.`
        );
        console.info(`Retrying after ${retryAfter} seconds.`);
        return true;
      },
      onSecondaryRateLimit: (retryAfter: number, options: any) => {
        console.warn(
          `SecondaryRateLimit detected for request ${options.method} ${options.url}.`
        );
        console.info(`Retrying after ${retryAfter} seconds.`);
        return true;
      },
    },
  });
}

function unsafeParseString(value: string | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  throw new Error("TODO: write an error message");
}

function unsafeParseRepositorySlug(repositoryUrl: string): RepositorySlug {
  const maybeRepositoryUrl = parseRepositoryUrl(repositoryUrl);
  if (maybeRepositoryUrl === false) {
    throw new Error("TODO: write an error message");
  }
  return { owner: maybeRepositoryUrl[0], name: maybeRepositoryUrl[1] };
}

function unsafeParseAssets(pluginConfig: PluginSpec): string[] {
  if (typeof pluginConfig === "string") {
    throw new Error(`Expected plugin config to specify 'assets'`);
  }
  const config = pluginConfig[1];
  if (typeof config !== "object") {
    throw new Error("Expected plugin config to contain an object");
  }
  const assets = config.assets;
  if (!Array.isArray(assets)) {
    throw new Error(
      `Expected plugin config 'assets' to contain an array of strings`
    );
  }
  return assets.map((value) => unsafeParseString(value));
}

function verifyConditions(pluginConfig: PluginSpec, context: Context) {
  const repositoryUrl = unsafeParseString(context.options?.repositoryUrl);
  unsafeParseRepositorySlug(repositoryUrl);
  unsafeParseString(context.env["GITHUB_TOKEN"]);
  unsafeParseAssets(pluginConfig);
  // TODO: test if github token has the right permissions, like
  // @semantic-release/git does
}

async function prepare(pluginConfig: PluginSpec, context: Context) {
  const repositoryUrl = unsafeParseString(context.options?.repositoryUrl);
  const branch = context.branch.name;
  const slug = unsafeParseRepositorySlug(repositoryUrl);
  const githubToken = unsafeParseString(context.env["GITHUB_TOKEN"]);
  const assets = unsafeParseAssets(pluginConfig);
  const octokit = getOctokit(githubToken);

  // This is the default commit message from @semantic-release/git
  const message =
    "chore(release): ${nextRelease.verseion} [skip ci]\n\n${nextRelease.notes}";

  for (const path of assets) {
    const content = readFileInBase64(path);
    const sha = execSync(`git rev-parse ${branch}:${path}`, {
      encoding: "utf8",
    }).trim();

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: slug.owner,
      repo: slug.name,
      path,
      message,
      branch,
      content,
      sha,
    });
  }
}

module.exports = {
  verifyConditions,
  prepare,
};
