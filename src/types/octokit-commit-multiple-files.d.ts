declare module "octokit-commit-multiple-files/create-or-update-files" {
  import { Octokit } from "@octokit/rest";

  type BufferFromSource =
    | ArrayBuffer
    | Uint8Array
    | ReadonlyArray<number>
    | string;

  export interface CreateOrUpdateFilesOptions {
    owner: string;
    repo: string;
    branch: string;
    changes: Array<{
      message: string;
      files: {
        [path: string]: string | BufferFromSource | { contents: string | BufferFromSource };
      };
    }>;
  }

  export default function createOrUpdateFiles(octokit: Octokit, opts: CreateOrUpdateFilesOptions): Promise<void>;
}