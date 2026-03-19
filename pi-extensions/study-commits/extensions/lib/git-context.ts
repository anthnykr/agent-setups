import type { CommitInfo, ExecFn } from "./types";

const MAX_DIFF_LINES = 4000;

interface BuildContextOptions {
	commits: CommitInfo[];
	cwd: string;
	exec: ExecFn;
	signal?: AbortSignal;
}

interface BuildCommitSectionOptions {
	commit: CommitInfo;
	cwd: string;
	exec: ExecFn;
	signal?: AbortSignal;
	remainingDiffLines: number;
}

interface BuildCommitSectionResult {
	section: string;
	diffLinesUsed: number;
}

interface TruncateDiffResult {
	text: string;
	usedLines: number;
	totalLines: number;
	truncated: boolean;
	omitted: boolean;
}

export const parseCommits = ({ output }: { output: string }): CommitInfo[] => {
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => {
			const [sha, shortSha, date, author, subject] = line.split("\t");
			if (!sha || !shortSha || !date || !author || !subject) return null;
			return {
				sha,
				shortSha,
				date,
				author,
				subject,
			};
		})
		.filter((commit): commit is CommitInfo => Boolean(commit));
};

const truncateDiffByLines = ({
	content,
	remainingLines,
}: {
	content: string;
	remainingLines: number;
}): TruncateDiffResult => {
	const lines = content.split("\n");
	const totalLines = lines.length;

	if (remainingLines <= 0) {
		return {
			text: "[Diff omitted; line cap reached]",
			usedLines: 0,
			totalLines,
			truncated: totalLines > 0,
			omitted: true,
		};
	}

	if (totalLines <= remainingLines) {
		return {
			text: content,
			usedLines: totalLines,
			totalLines,
			truncated: false,
			omitted: false,
		};
	}

	return {
		text: lines.slice(0, remainingLines).join("\n"),
		usedLines: remainingLines,
		totalLines,
		truncated: true,
		omitted: false,
	};
};

const buildCommitSection = async ({
	commit,
	cwd,
	exec,
	signal,
	remainingDiffLines,
}: BuildCommitSectionOptions): Promise<BuildCommitSectionResult> => {
	const diffResult = await exec("git", ["show", "--stat", "--patch", "--no-color", commit.sha], {
		cwd,
		signal,
	});

	const diffRaw = diffResult.code === 0 ? diffResult.stdout : diffResult.stderr || diffResult.stdout;
	const diff = truncateDiffByLines({ content: diffRaw, remainingLines: remainingDiffLines });
	const diffNotice = diff.truncated
		? diff.omitted
			? "_Diff omitted; line cap reached._"
			: `_Diff truncated to ${diff.usedLines}/${diff.totalLines} lines (cap ${MAX_DIFF_LINES})._`
		: "";

	const sectionLines = [
		`## Commit ${commit.shortSha} ${commit.subject}`,
		`Author: ${commit.author}`,
		`Date: ${commit.date}`,
		`SHA: ${commit.sha}`,
		"",
		"### Diff",
		"```diff",
		diff.text,
		"```",
	];

	if (diffNotice) {
		sectionLines.push(diffNotice);
	}

	return { section: sectionLines.join("\n"), diffLinesUsed: diff.usedLines };
};

export const buildContext = async ({ commits, cwd, exec, signal }: BuildContextOptions): Promise<string> => {
	const sections: string[] = [];
	let remainingDiffLines = MAX_DIFF_LINES;

	sections.push(
		`Study these commits. Analyze what changed from the diffs. Diff line cap: ${MAX_DIFF_LINES}.`,
		"",
	);

	for (const commit of commits) {
		if (signal?.aborted) break;
		const { section, diffLinesUsed } = await buildCommitSection({
			commit,
			cwd,
			exec,
			signal,
			remainingDiffLines,
		});
		remainingDiffLines = Math.max(0, remainingDiffLines - diffLinesUsed);
		sections.push(section, "");
	}

	return sections.join("\n");
};

export const ensureGitRepo = async ({ exec, cwd }: { exec: ExecFn; cwd: string }): Promise<boolean> => {
	const result = await exec("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
	return result.code === 0 && result.stdout.trim() === "true";
};
