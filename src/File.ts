import fs from "fs"
import path from "path"

namespace File {
	export async function stat (file: string) {
		return fs.promises.stat(file).catch(() => null)
	}

	export async function children (dir: string) {
		return fs.promises.readdir(dir)
			.then(files => files.map(file => path.resolve(dir, file)))
			.catch(() => [])
	}

	export function relative (file: string) {
		file = path.relative(process.cwd(), file)
		return file.startsWith(".") ? file : `.${path.sep}${file}`
	}
}

export default File
