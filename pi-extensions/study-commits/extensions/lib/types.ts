import type { ExecOptions, ExecResult } from "@mariozechner/pi-coding-agent";

export interface CommitInfo {
	sha: string;
	shortSha: string;
	subject: string;
	author: string;
	date: string;
}

export type ExecFn = (command: string, args: string[], options?: ExecOptions) => Promise<ExecResult>;
