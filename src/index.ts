import * as fs from "node:fs";

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import type { Context, PluginSpec } from "semantic-release";
import parseRepositoryUrl from "parse-github-repo-url";

import { CreateOrUpdateFilesOptions } from 'octokit-commit-multiple-files/create-or-update-files';
import createOrUpdateFiles from 'octokit-commit-multiple-files/create-or-update-files';

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

// The type PluginSpec is misleading here, `semantic-release --dry-run`
// indicates this value is an object.
function unsafeParseAssets(pluginConfig: unknown): string[] {
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

  const nextRelease = context.nextRelease;
  if (nextRelease === undefined) {
    throw new Error(
      `Did not expect 'prepare' to be invoked with undefined 'nextRelease'`
    );
  }
  // This is the default commit message from @semantic-release/git
  const message = `chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}`;

  console.info('Computing changes for signed commit');
  const changedFiles: { [key: string]: string } = {};
  for (const path of assets) {
    changedFiles[path] = readFileInBase64(path);
  }

  console.info('Pushing on GitHub via API');
  try {
    const options: CreateOrUpdateFilesOptions = {
      owner: slug.owner,
      repo: slug.name,
      branch,
      changes: [
        {
          message,
          files: changedFiles,
        },
      ],
    };

    await createOrUpdateFiles(octokit, options);

    console.log('Files updated successfully!');
  } catch (error) {
    console.error('Error updating files:', error);
    throw error;
  }
}

module.exports = {
  verifyConditions,
  prepare,
};
