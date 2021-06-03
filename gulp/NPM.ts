import { exec } from "child_process";
import { Series } from "./Task";

namespace NPM {
	export function publish (dir: string, tag?: string) {
		return new Series(() => new Promise<void>(resolve => {
			const publishProcess = exec(`npm publish ${!tag ? "" : `--tag ${tag}`}`, {
				cwd: dir,
			}, () => resolve());
			publishProcess.stdout?.pipe(process.stdout);
			publishProcess.stderr?.pipe(process.stderr);
		}));
	}
}

export default NPM;
