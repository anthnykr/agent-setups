import type { Theme } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@mariozechner/pi-tui";
import type { CommitInfo } from "./types";

const MAX_VISIBLE = 12;

interface CommitPickerOptions {
	commits: CommitInfo[];
	theme: Theme;
	onConfirm: (commits: CommitInfo[]) => void;
	onCancel: () => void;
}

export class CommitPicker {
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
			const checkbox = this.checked[i] ? th.fg("success", "[x]") : th.fg("dim", "[ ]");
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
