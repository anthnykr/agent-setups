import { BorderedLoader } from "@mariozechner/pi-coding-agent";
import type { ExecOptions, ExecResult, ExtensionAPI, Theme } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@mariozechner/pi-tui";

const MAX_COMMITS = 20;
const MAX_VISIBLE = 12;
const MAX_DIFF_LINES = 4000;

interface CommitInfo {
	sha: string;
	shortSha: string;
	subject: string;
	author: string;
	date: string;
}

type ExecFn = (command: string, args: string[], options?: ExecOptions) => Promise<ExecResult>;

interface CommitPickerOptions {
	commits: CommitInfo[];
	theme: Theme;
	onConfirm: (commits: CommitInfo[]) => void;
	onCancel: () => void;
}

class CommitPicker {
	private commits: CommitInfo[];
	private theme: Theme;
	private onConfirm: (commits: CommitInfo[]) => void;
	private onCancel: () => void;
	private selected = 0;
	private checked: boolean[];
	private scrollOffset = 0;
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor({ commits, theme, onConfirm, onCancel }: CommitPickerOptions) {
		this.commits = commits;
		this.theme = theme;
		this.onConfirm = onConfirm;
		this.onCancel = onCancel;
		this.checked = new Array(commits.length).fill(false);
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.up)) {
			this.moveSelection({ delta: -1 });
			return;
		}

		if (matchesKey(data, Key.down)) {
			this.moveSelection({ delta: 1 });
			return;
		}

		if (matchesKey(data, Key.space)) {
			this.toggleCurrent();
			return;
		}

		if (matchesKey(data, Key.enter)) {
			this.confirm();
			return;
		}

		if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) {
			this.onCancel();
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const lines: string[] = [];
		const th = this.theme;
		const pageSize = this.getPageSize();
		const endIndex = Math.min(this.scrollOffset + pageSize, this.commits.length);
		const title = `${th.bold("Study commits")}`;
		const subtitle = th.fg("dim", "space toggle • enter confirm • esc cancel");
		const border = th.fg("borderMuted", "─".repeat(Math.max(0, width)));

		lines.push(truncateToWidth(border, width));
		lines.push(truncateToWidth(`${th.fg("accent", title)} ${subtitle}`, width));
		lines.push("");

		for (let i = this.scrollOffset; i < endIndex; i++) {
			const commit = this.commits[i];
			const isSelected = i === this.selected;
			const cursor = isSelected ? th.fg("accent", "›") : " ";
			const checkbox = this.checked[i]
				? th.fg("success", "[x]")
				: th.fg("dim", "[ ]");
			const sha = isSelected ? th.fg("accent", commit.shortSha) : th.fg("muted", commit.shortSha);
			const subject = isSelected ? th.fg("accent", commit.subject) : th.fg("text", commit.subject);
			const meta = th.fg("dim", `${commit.date} ${commit.author}`);
			const line = `${cursor} ${checkbox} ${sha} ${subject} ${meta}`;
			lines.push(truncateToWidth(line, width));
		}

		if (this.commits.length === 0) {
			lines.push(truncateToWidth(th.fg("dim", "No commits found."), width));
		}

		lines.push("");

		const selectedCount = this.checked.filter((value) => value).length;
		const rangeInfo = `${this.scrollOffset + 1}-${endIndex} of ${this.commits.length}`;
		const footer = `${th.fg("muted", `${selectedCount} selected`)} · ${th.fg("dim", rangeInfo)}`;
		lines.push(truncateToWidth(footer, width));
		lines.push(truncateToWidth(border, width));

		this.cachedLines = lines;
		this.cachedWidth = width;
		return lines;
	}

	invalidate(): void {
		this.cachedLines = undefined;
		this.cachedWidth = undefined;
	}

	private moveSelection({ delta }: { delta: number }): void {
		if (this.commits.length === 0) return;

		const next = Math.max(0, Math.min(this.commits.length - 1, this.selected + delta));
		if (next === this.selected) return;

		this.selected = next;
		this.ensureVisible({ index: next });
		this.invalidate();
	}

	private toggleCurrent(): void {
		if (this.commits.length === 0) return;
		this.checked[this.selected] = !this.checked[this.selected];
		this.invalidate();
	}

	private confirm(): void {
		const selectedCommits = this.commits.filter((_commit, index) => this.checked[index]);
		this.onConfirm(selectedCommits);
	}

	private ensureVisible({ index }: { index: number }): void {
		const pageSize = this.getPageSize();
		if (index < this.scrollOffset) {
			this.scrollOffset = index;
			return;
		}

		if (index >= this.scrollOffset + pageSize) {
			this.scrollOffset = index - pageSize + 1;
		}
	}

	private getPageSize(): number {
		return Math.min(MAX_VISIBLE, this.commits.length);
	}
}

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

const parseCommits = ({ output }: { output: string }): CommitInfo[] => {
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

interface TruncateDiffResult {
	text: string;
	usedLines: number;
	totalLines: number;
	truncated: boolean;
	omitted: boolean;
}

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

const buildContext = async ({ commits, cwd, exec, signal }: BuildContextOptions): Promise<string> => {
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

const ensureGitRepo = async ({ exec, cwd }: { exec: ExecFn; cwd: string }): Promise<boolean> => {
	const result = await exec("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
	return result.code === 0 && result.stdout.trim() === "true";
};

export default function (pi: ExtensionAPI) {
	pi.registerCommand("study-commits", {
		description: "Select recent commits and inject diffs",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("study-commits requires interactive mode", "error");
				return;
			}

			const hasGit = await ensureGitRepo({ exec: pi.exec, cwd: ctx.cwd });
			if (!hasGit) {
				ctx.ui.notify("Not inside a git repository", "error");
				return;
			}

			const logResult = await pi.exec(
				"git",
				[
					"log",
					"-n",
					String(MAX_COMMITS),
					"--date=short",
					"--pretty=format:%H%x09%h%x09%ad%x09%an%x09%s",
				],
				{ cwd: ctx.cwd },
			);

			if (logResult.code !== 0) {
				ctx.ui.notify("Failed to load git log", "error");
				return;
			}

			const commits = parseCommits({ output: logResult.stdout });
			if (commits.length === 0) {
				ctx.ui.notify("No commits found", "warning");
				return;
			}

			const selected = await ctx.ui.custom<CommitInfo[] | null>(
				(tui, theme, _keybindings, done) => {
					const picker = new CommitPicker({
						commits,
						theme,
						onConfirm: (selectedCommits) => done(selectedCommits),
						onCancel: () => done(null),
					});

					return {
						render: (width) => picker.render(width),
						invalidate: () => picker.invalidate(),
						handleInput: (data) => {
							picker.handleInput(data);
							tui.requestRender();
						},
					};
				},
				{ overlay: true, overlayOptions: { width: "80%", maxHeight: "80%", minWidth: 60 } },
			);

			if (!selected || selected.length === 0) {
				ctx.ui.notify("No commits selected", "info");
				return;
			}

			const context = await ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
				const loader = new BorderedLoader(tui, theme, "Gathering commit context...");
				loader.onAbort = () => done(null);

				buildContext({ commits: selected, cwd: ctx.cwd, exec: pi.exec, signal: loader.signal })
					.then(done)
					.catch(() => done(null));

				return loader;
			});

			if (!context) {
				ctx.ui.notify("Commit context cancelled", "info");
				return;
			}

			pi.sendUserMessage(context);
			ctx.ui.notify("Commit context sent", "success");
		},
	});
}
