const { promisify } = require("util");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const createDiff = promisify(require("looks-same").createDiff);
const looksSame = promisify(require("looks-same"));
const Confirm = require("prompt-confirm");

const wait = t =>
	new Promise((res, rej) => {
		setTimeout(() => res(), t);
	});

async function screenshot(title, filename, raw, file) {
	if (process.platform === "darwin") {
		return execFileSync("python3", [`${__dirname}/lib/pyscreencapture/screencapture.py`, raw ? path.basename(file) : "node", "-t", title, "-f", filename]);
	} else if (process.platform === "win32") {
		return execFileSync(`${__dirname}\\lib\\screenshot-cmd\\screenshot.exe`, ["-wt", title, "-o", filename]);
	} else {
		throw Error("Platform not supported!");
	}
}

module.exports = function({ outDir = ".", raw = false, interactive = false } = {}) {
	if (!fs.existsSync(`${outDir}`)) {
		fs.mkdirSync(`${outDir}`);
	}
	if (!fs.existsSync(`${outDir}/reference`)) {
		fs.mkdirSync(`${outDir}/reference`);
	}
	if (!fs.existsSync(`${outDir}/reference/` + process.platform)) {
		fs.mkdirSync(`${outDir}/reference/` + process.platform);
	}

	if (!fs.existsSync(`${outDir}/temp`)) {
		fs.mkdirSync(`${outDir}/temp`);
	}

	return async function compare(file, title, { delay, raw: rawLocal } = {}) {
		rawLocal = typeof rawLocal === "undefined" ? raw : rawLocal;
		let proc;
		try {
			// for(let i = 0; i < 1; i++){

			const filename = path.basename(file).replace(/\s/g, "_"); //+"_"+i

			const reference = `${outDir}/reference/${process.platform}/${filename}.png`;
			const temp = `${outDir}/temp/${filename}.png`;

			if (rawLocal) {
				proc = spawn(file);
			} else {
				proc = spawn("node", [file]);
			}
			await wait(delay + (process.platform === "win32" ? 600 : 100));
			await screenshot(title, temp, rawLocal, file);

			proc.kill("SIGINT");

			if (!fs.existsSync(reference)) {
				console.log("Creating new test:", filename + ".png");
				fs.copyFileSync(temp, reference);
			} else {
				const same = await looksSame(reference, temp, process.platform === "win32" ? { tolerance: 60 } : {});

				if (same) {
					console.log(`passed: ${path.basename(file)} - "${title}"`);
				} else {
					console.log(`failed: ${path.basename(file)} - "${title}" didn't pass, see ${temp.replace(/\.png$/, "_diff.png")}`);
					await createDiff({
						reference: reference,
						current: temp,
						diff: temp.replace(/\.png$/, "_diff.png"),
						highlightColor: "#ff0000"
					});

					if (interactive) {
						const answer = await new Confirm({
							message: `Do you want to update "${path.basename(file)}" ?`,
							default: false
						}).run();

						if (answer) {
							fs.copyFileSync(temp, reference);
							console.log(`\tUpdated: ${path.basename(file)}`);
						}
					}
				}
			}
			// }
		} catch (e) {
			if (proc) {
				proc.kill("SIGINT");
			}
			console.error(`error: ${file} - "${title}"`);
			console.error("\t", e.message);
			if (e.stdout) console.error("\t", e.stdout.toString("utf8"));
		}
	};
};
