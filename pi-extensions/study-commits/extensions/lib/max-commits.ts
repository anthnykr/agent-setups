const DEFAULT_MAX_COMMITS = 20;
export const CONFIG_ENTRY_TYPE = "study-commits-config";

export type MaxCommitsSource = "arg" | "command" | "default";

interface ParseMaxCommitsArgsResult {
	maxCommits?: number;
	clear?: boolean;
	error?: string;
}

export interface ResolveMaxCommitsResult {
	maxCommits?: number;
	source?: MaxCommitsSource;
	error?: string;
}

export const parsePositiveInt = ({ value }: { value: string }): number | null => {
	if (!/^\d+$/.test(value)) return null;

	const parsed = Number.parseInt(value, 10);
	if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
	return parsed;
};

export const parseMaxCommitsArgs = ({
	args,
	allowClear,
	usage,
}: {
	args?: string;
	allowClear?: boolean;
	usage: string;
}): ParseMaxCommitsArgsResult => {
	const trimmedArgs = args?.trim();
	if (!trimmedArgs) return {};

	const tokens = trimmedArgs.split(/\s+/);
	if (allowClear && tokens.length === 1 && ["clear", "reset"].includes(tokens[0])) {
		return { clear: true };
	}

	if (tokens.length !== 1) {
		return { error: usage };
	}

	const maxCommits = parsePositiveInt({ value: tokens[0] });
	if (!maxCommits) {
		return { error: `Invalid max commits: ${tokens[0]}. Use a positive integer.` };
	}

	return { maxCommits };
};

export const getStoredMaxCommits = ({ data }: { data: unknown }): number | undefined => {
	if (!data || typeof data !== "object") return undefined;

	const record = data as Record<string, unknown>;
	const maxCommits = record.maxCommits;
	if (typeof maxCommits !== "number") return undefined;
	if (!Number.isSafeInteger(maxCommits) || maxCommits < 1) return undefined;
	return maxCommits;
};

export const resolveDefaultMaxCommits = ({
	commandMaxCommits,
}: {
	commandMaxCommits?: number;
}): ResolveMaxCommitsResult => {
	if (commandMaxCommits) {
		return { maxCommits: commandMaxCommits, source: "command" };
	}

	return { maxCommits: DEFAULT_MAX_COMMITS, source: "default" };
};

export const resolveMaxCommits = ({
	args,
	commandMaxCommits,
}: {
	args?: string;
	commandMaxCommits?: number;
}): ResolveMaxCommitsResult => {
	const parsed = parseMaxCommitsArgs({
		args,
		usage: "Usage: /study-commits [count]",
	});
	if (parsed.error) return { error: parsed.error };
	if (parsed.maxCommits) return { maxCommits: parsed.maxCommits, source: "arg" };
	return resolveDefaultMaxCommits({ commandMaxCommits });
};

export const formatMaxCommitsSource = ({ source }: { source: MaxCommitsSource }): string => {
	if (source === "arg") return "command arg";
	if (source === "command") return "slash override";
	return "built-in default";
};
