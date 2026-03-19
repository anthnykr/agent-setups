import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const thisFile = realpathSync(fileURLToPath(import.meta.url));
const entryPath = resolve(dirname(thisFile), "extensions", "study-commits.ts");
const extensionModule = await import(pathToFileURL(entryPath).href);

export default extensionModule.default;
