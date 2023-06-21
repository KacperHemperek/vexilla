import { snapshot } from "valtio";
import { GitFetcher } from "../../../utils/fetcher";
import {
  GetBlobResponse,
  GitHubBranch,
  GitHubCreateBranchResponse,
  GitHubCreateCommitResponse,
  GitHubCreatePullRequestResponse,
  GitHubCreateTreeResponse,
  GitHubGetInstallationRepositoriesResponse,
  GitHubGetInstallationsResponse,
} from "./GithubForm.types";
import { cloneDeep } from "lodash-es";
import { AppState } from "@vexilla/types";

const GITHUB_BASE_URL = `https://api.github.com`;
const commonHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export class GitHubFetcher extends GitFetcher {
  async fetchInstallations() {
    if (this.config.hosting.provider === "github") {
      return this.getRequest<GitHubGetInstallationsResponse>(
        `/user/installations`
      );
    } else {
      throw new Error(
        "GithubFetcher.fetchBranches() called on non-github config"
      );
    }
  }

  async fetchBranches() {
    if (this.config.hosting.provider === "github") {
      return this.getRequest<GitHubBranch[]>(
        `/repos/${this.config.hosting.config.owner}/${this.config.hosting.config.repositoryName}/branches`
      );
    } else {
      throw new Error(
        "GithubFetcher.fetchBranches() called on non-github config"
      );
    }
  }

  async fetchRepositories(installationId: string) {
    return this.getRequest<GitHubGetInstallationRepositoriesResponse>(
      `/user/installations/${installationId}/repositories`
    );
  }

  async fetchBranch(branchName: string) {
    if (this.config.hosting.provider === "github") {
      return this.getRequest<GitHubBranch>(
        `/repos/${this.config.hosting.config.owner}/${this.config.hosting.config.repositoryName}/branches/${branchName}`
      );
    } else {
      throw new Error(
        "GithubFetcher.fetchBranch() called on non-github config"
      );
    }
  }

  async fetchTree(treeSha: string) {
    if (this.config.hosting.provider === "github") {
      return this.getRequest<GitHubCreateTreeResponse>(
        `/repos/${this.config.hosting.config.owner}/${this.config.hosting.config.repositoryName}/git/trees/${treeSha}`
      );
    } else {
      throw new Error("GithubFetcher.fetchTree() called on non-github config");
    }
  }

  async createTree(
    baseTreeSha: string,
    files: {
      content: string;
      filePath: string;
    }[]
  ) {
    if (this.config.hosting.provider === "github") {
      return this.payloadRequest<GitHubCreateTreeResponse>(
        `/repos/${this.config.hosting.config.owner}/${this.config.hosting.config.repositoryName}/git/trees`,
        {
          tree: files.map(({ filePath, content }) => ({
            path: filePath,
            mode: "100644",
            type: "blob",
            content,
          })),
          base_tree: baseTreeSha,
        }
      );
    } else {
      throw new Error("GithubFetcher.createTree() called on non-github config");
    }
  }

  async createBranch(newBranchName: string, head: string) {
    if (this.config.hosting.provider === "github") {
      return this.payloadRequest<GitHubCreateBranchResponse>(
        `/repos/${this.config.hosting.config.owner}/${this.config.hosting.config.repositoryName}/git/refs`,
        {
          ref: `refs/heads/${newBranchName}`,
          sha: head,
        }
      );
    } else {
      throw new Error(
        "GithubFetcher.createBranch() called on non-github config"
      );
    }
  }

  async createCommit(treeSha: string, parentSha: string) {
    if (this.config.hosting.provider === "github") {
      return this.payloadRequest<GitHubCreateCommitResponse>(
        `/repos/${this.config.hosting.config.owner}/${this.config.hosting.config.repositoryName}/git/commits`,
        {
          message: "chore: update Vexilla feature flags",
          tree: treeSha,
          parents: [parentSha],
        }
      );
    } else {
      throw new Error(
        "GithubFetcher.createCommit() called on non-github config"
      );
    }
  }

  async updateBranch(branchName: string, commitSha: string) {
    if (this.config.hosting.provider === "github") {
      return this.payloadRequest<GitHubCreateBranchResponse>(
        `/repos/${this.config.hosting.config.owner}/${this.config.hosting.config.repositoryName}/git/refs/heads/${branchName}`,
        {
          sha: commitSha,
        },
        "PATCH"
      );
    } else {
      throw new Error(
        "GithubFetcher.updateBranch() called on non-github config"
      );
    }
  }

  async createPullRequest(
    branchName: string,
    baseBranchName: string,
    description = ""
  ) {
    if (this.config.hosting.provider === "github") {
      return this.payloadRequest<GitHubCreatePullRequestResponse>(
        `/repos/${this.config.hosting.config.owner}/${this.config.hosting.config.repositoryName}/pulls`,
        {
          title: "Update Vexilla feature flags",
          head: branchName,
          base: baseBranchName,
          maintainer_can_modify: true,
          body: `
${description}
This PR was generated by Vexilla.
        `,
        }
      );
    } else {
      throw new Error(
        "GithubFetcher.createPullRequest() called on non-github config"
      );
    }
  }

  async getCurrentConfig() {
    if (this.config.hosting.provider === "github") {
      // fetch target branch
      const branch = await this.fetchBranch(
        this.config.hosting.config.targetBranch
      );

      console.log({ branch });

      // get current tree for branch
      const tree = await this.fetchTree(branch.commit.sha);

      // get blob id from current tree (not a fetch)
      const blobId = tree.tree.find((blob) => blob.url === "config.json")?.sha;

      if (!blobId) {
        // this would be ideal
        // return snapshot(this.config);
        // instead...
        return cloneDeep(this.config);
      } else {
        const blobResult = await this.getRequest<GetBlobResponse>(
          `/repos/${this.config.hosting.config.owner}/${this.config.hosting.config.repositoryName}/git/blobs/${blobId}`
        );

        const config = JSON.parse(blobResult.content) as AppState;
        console.log("blob result", config);
        return config;
      }
    } else {
      throw new Error(
        "GithubFetcher.getCurrentConfig() called on non-github config"
      );
    }
  }

  async publish(
    branchName: string,
    files: {
      content: string;
      filePath: string;
    }[]
  ) {
    if (
      this.config.hosting.provider === "git" &&
      this.config.hosting.provider === "github"
    ) {
      if (this.config.hosting.config.shouldCreatePullRequest) {
        this.publishPullRequest(branchName, files);
      } else {
        this.publishDirectly(branchName, files);
      }
    } else {
      throw new Error("GithubFetcher.publish() called on non-github config");
    }
  }

  private async publishDirectly(
    branchName: string,
    files: {
      content: string;
      filePath: string;
    }[]
  ) {
    try {
      const currentBranchResponse = await this.fetchBranch(branchName);
      const currentBranchSha = currentBranchResponse.commit.sha;

      // createTree
      const newTreeResponse = await this.createTree(currentBranchSha, files);
      const newTreeSha = newTreeResponse.sha;

      // createCommit
      const newCommitResponse = await this.createCommit(
        newTreeSha,
        currentBranchSha
      );
      const newCommitSha = newCommitResponse.sha;

      const updateBranchResponse = await this.updateBranch(
        branchName,
        newCommitSha
      );
    } catch (e: any) {
      console.log({ e });
    }
  }

  private async publishPullRequest(
    baseBranch: string,
    files: {
      content: string;
      filePath: string;
    }[],
    description = ""
  ) {
    try {
      const currentBranchResponse = await this.fetchBranch(baseBranch);
      const currentBranchSha = currentBranchResponse.commit.sha;

      const newTreeResponse = await this.createTree(currentBranchSha, files);
      const newTreeSha = newTreeResponse.sha;

      const newCommitResponse = await this.createCommit(
        newTreeSha,
        currentBranchSha
      );
      const newCommitSha = newCommitResponse.sha;

      const newBranchName = `${
        this.config.hosting.config.branchNamePrefix
      }${Date.now()}`;
      await this.createBranch(newBranchName, newCommitSha);

      await this.createPullRequest(newBranchName, baseBranch, description);
    } catch (e: any) {
      console.log({ e });
    }
  }

  private async getRequest<T>(path: string) {
    if (this.config.hosting.provider === "github") {
      const Authorization = `Bearer ${this.config.hosting.config.accessToken}`;

      const url = `${GITHUB_BASE_URL}${path}`;

      const response = await fetch(url, {
        headers: {
          ...commonHeaders,
          Authorization,
        },
      });

      const responseBody: T = await response.json();

      if (response.status < 200 || response.status > 299) {
        console.log(`Error fetching ${url}`, responseBody);
        throw new Error(`Error fetching ${url}`);
      } else {
        return responseBody;
      }
    } else {
      throw new Error(
        "GithubFetcher.createPullRequest() called on non-github config"
      );
    }
  }

  private async payloadRequest<T>(
    path: string,
    payload: Record<string, any>,
    method: "POST" | "PUT" | "PATCH" | "QUERY" = "POST"
  ) {
    if (this.config.hosting.provider === "github") {
      const Authorization = `Bearer ${this.config.hosting.config.accessToken}`;

      const url = `${GITHUB_BASE_URL}${path}`;

      const response = await fetch(url, {
        headers: {
          ...commonHeaders,
          Authorization,
        },
        body: JSON.stringify(payload),
        method,
      });

      const responseBody: T = await response.json();

      if (response.status < 200 || response.status > 299) {
        console.log(`Error fetching ${url}`, responseBody);
        throw new Error(`Error fetching ${url}`);
      } else {
        return responseBody;
      }
    } else {
      throw new Error(
        "GithubFetcher.createPullRequest() called on non-github config"
      );
    }
  }
}
