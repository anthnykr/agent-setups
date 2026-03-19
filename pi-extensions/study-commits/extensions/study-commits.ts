import { BorderedLoader } from "@mariozechner/pi-coding-agent";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { CommitPicker } from "./lib/commit-picker";
import { buildContext, ensureGitRepo, parseCommits } from "./lib/git-context";
import {
	CONFIG_ENTRY_TYPE,
	formatMaxCommitsSource,
	getStoredMaxCommits,
	parseMaxCommitsArgs,
	resolveDefaultMaxCommits,
	resolveMaxCommits,
} from "./lib/max-commits";
import type { CommitInfo } from "./lib/types";

const restoreCommandMaxCommits = ({
	ctx,
	onRestore,
}: {
	ctx: ExtensionContext;
	onRestore: (maxCommits: number | undefined) => void;
}): void => {
	let commandMaxCommits: number | undefined;

	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type !== "custom" || entry.customType !== CONFIG_ENTRY_TYPE) continue;
		commandMaxCommits = getStoredMaxCommits({ data: entry.data });
	}

	onRestore(commandMaxCommits);
};

export default function (pi: ExtensionAPI) {
	let commandMaxCommits: number | undefined;

	const syncCommandMaxCommits = ({ ctx }: { ctx: ExtensionContext }): void => {
		restoreCommandMaxCommits({
			ctx,
			onRestore: (maxCommits) => {
				commandMaxCommits = maxCommits;
			},
		});
	};

	pi.on("session_start", async (_event, ctx) => {
		syncCommandMaxCommits({ ctx });
	});

	pi.on("session_switch", async (_event, ctx) => {
		syncCommandMaxCommits({ ctx });
	});

	pi.on("session_fork", async (_event, ctx) => {
		syncCommandMaxCommits({ ctx });
	});

	pi.registerCommand("study-commits-max", {
		description: "Show or set default max commits for /study-commits",
		handler: async (args, ctx) => {
			const parsed = parseMaxCommitsArgs({
				args,
				allowClear: true,
				usage: "Usage: /study-commits-max <count> | /study-commits-max clear",
			});
			if (parsed.error) {
				ctx.ui.notify(parsed.error, "error");
				return;
			}

			if (parsed.clear) {
				commandMaxCommits = undefined;
				pi.appendEntry(CONFIG_ENTRY_TYPE, {});
				const resolved = resolveDefaultMaxCommits({ commandMaxCommits });
				if (resolved.error || !resolved.maxCommits || !resolved.source) {
					ctx.ui.notify(resolved.error ?? "Failed to reset study-commits max", "error");
					return;
				}

				ctx.ui.notify(
					`study-commits max reset to ${resolved.maxCommits} (${formatMaxCommitsSource({ source: resolved.source })})`,
					"info",
				);
				return;
			}

			if (parsed.maxCommits) {
				commandMaxCommits = parsed.maxCommits;
				pi.appendEntry(CONFIG_ENTRY_TYPE, { maxCommits: parsed.maxCommits });
				ctx.ui.notify(`study-commits max set to ${parsed.maxCommits}`, "info");
				return;
			}

			const resolved = resolveDefaultMaxCommits({ commandMaxCommits });
			if (resolved.error || !resolved.maxCommits || !resolved.source) {
				ctx.ui.notify(resolved.error ?? "Failed to read study-commits max", "error");
				return;
			}

			ctx.ui.notify(
				`study-commits max: ${resolved.maxCommits} (${formatMaxCommitsSource({ source: resolved.source })})`,
				"info",
			);
		},
	});

	pi.registerCommand("study-commits", {
		description: "Select recent commits and inject diffs (/study-commits [count])",
		handler: async (args, ctx) => {
			const { maxCommits, error } = resolveMaxCommits({ args, commandMaxCommits });
			if (error || !maxCommits) {
				ctx.ui.notify(error ?? "Invalid max commits", "error");
				return;
			}

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
					String(maxCommits),
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
			ctx.ui.notify("Commit context sent", "info");
		},
	});
}
