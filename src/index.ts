import * as fs from "node:fs";
import { execSync } from "node:child_process";

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import type { Context, PluginSpec } from "semantic-release";
import parseRepositoryUrl from "parse-github-repo-url";
import { template } from "lodash";

const ThrottlingOctokit = Octokit.plugin(throttling);

type RepositorySlug = {
  owner: string;
  name: string;
};

type PluginConfig = {
  assets: string[];
  message?: string;
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

// The type PluginSpec is misleading here, `semantic-release --dry-run`
// indicates this value is an object.
function unsafeParsePluginConfig(pluginConfig: unknown): PluginConfig {
  if (typeof pluginConfig === "string") {
    throw new Error(`Expected plugin config to specify 'assets'`);
  }
  const config = pluginConfig;
  if (typeof config !== "object" || config === null) {
    throw new Error("Expected plugin config to contain an object");
  }
  if (!("assets" in config)) {
    throw new Error("Expected plugin config to contain an `assets` property");
  }
  const assets = config.assets;
  if (!Array.isArray(assets)) {
    throw new Error(
      `Expected plugin config 'assets' to contain an array of strings`
    );
  }

  const parsedAssets = assets.map((value) => unsafeParseString(value));

  // Parse optional message configuration
  const result: PluginConfig = {
    assets: parsedAssets,
  };

  if ("message" in config) {
    if (typeof config.message === "string") {
      result.message = config.message;
    } else if (config.message !== undefined) {
      throw new Error(
        `Expected plugin config 'message' to be a string if provided`
      );
    }
  }

  return result;
}

function verifyConditions(pluginConfig: PluginSpec, context: Context) {
  const repositoryUrl = unsafeParseString(context.options?.repositoryUrl);
  unsafeParseRepositorySlug(repositoryUrl);
  unsafeParseString(context.env["GITHUB_TOKEN"]);
  unsafeParsePluginConfig(pluginConfig);
  // TODO: test if github token has the right permissions, like
  // @semantic-release/git does
}

async function prepare(pluginConfig: PluginSpec, context: Context) {
  const repositoryUrl = unsafeParseString(context.options?.repositoryUrl);
  const branch = context.branch.name;
  const slug = unsafeParseRepositorySlug(repositoryUrl);
  const githubToken = unsafeParseString(context.env["GITHUB_TOKEN"]);
  const config = unsafeParsePluginConfig(pluginConfig);
  const octokit = getOctokit(githubToken);

  const nextRelease = context.nextRelease;
  if (nextRelease === undefined) {
    throw new Error(
      `Did not expect 'prepare' to be invoked with undefined 'nextRelease'`
    );
  }

  // Use custom message template if provided, otherwise use default from @semantic-release/git
  const message = config.message
    ? template(config.message)({
        branch: context.branch.name,
        lastRelease: context.lastRelease,
        nextRelease: context.nextRelease,
      })
    : `chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}`;

  for (const path of config.assets) {
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
