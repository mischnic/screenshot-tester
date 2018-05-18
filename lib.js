"use strict";

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const { promisify } = require("util");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const BlinkDiff = require("blink-diff");
const Confirm = require("prompt-confirm");
const chalk = require("chalk");

function getOSVersion() {
	if (process.platform == "win32") {
		// https://stackoverflow.com/a/44916050/2352201
		const versions = os.release().split(".");
		switch (versions[0]) {
			case "10":
				return "win10";

			case "6":
				switch (versions[1]) {
					case "3":
						return "win81";
					case "2":
						return "win8";
					case "1":
						return "win7";
					case "0":
						return "winVista";
				}
				break;

			case "5":
				switch (versions[1]) {
					case "1":
						return "winXP";
					case "0":
						return "win2000";
				}
				break;
		}
		return "win";
	} else {
		return process.platform;
	}
}

const wait = t => new Promise((res, rej) => {
	setTimeout(() => res(), t);
});

function screenshot(title, filename, raw, file) {
	if (process.platform === "darwin") {
		return execFileSync("python3", [`${__dirname}/lib/pyscreencapture/screencapture.py`, raw ? path.basename(file) : "node", "-t", title, "-f", filename]);
	} else if (process.platform === "win32") {
		return execFileSync(`${__dirname}\\lib\\screenshot-cmd\\screenshot.exe`, ["-wt", title, "-o", filename]);
	} else {
		return execFileSync("import", ["-window", title, filename]);
	}
}

const tests = [];

module.exports = function ({ outDir = ".", raw = false, interactive = false, delay = 0, accuracy = "0.01%" } = {}) {
	let compare = (() => {
		var _ref = _asyncToGenerator(function* (file, title, { delay: delayLocal, raw: rawLocal, delta = 20, accuracy: accuracyLocal } = {}) {
			rawLocal = typeof rawLocal === "undefined" ? raw : rawLocal;
			delayLocal = typeof delayLocal === "undefined" ? delay : delayLocal;
			accuracyLocal = typeof accuracyLocal === "undefined" ? accuracy : accuracyLocal;
			let proc;
			const filename = path.basename(file).replace(/\s/g, "_"); //+"_"+i
			try {
				// for(let i = 0; i < 1; i++){

				const reference = `${referenceFolder}/${filename}.png`;
				const temp = `${tempFolder}/${filename}.png`;

				if (rawLocal) {
					proc = spawn(file);
				} else {
					proc = spawn("node", [file]);
				}
				proc.stderr.on("data", function (buf) {
					const d = buf.toString("utf8").trim();
					if (d.indexOf("get 0x0") === -1 || d.split("\n").length > 1) {
						console.error(chalk.red(d));
					}
				});

				yield wait(delayLocal + (process.platform === "win32" ? 600 : process.platform === "linux" ? 1500 : 100));

				function makeScreenshot(retry = true) {
					let d;
					try {
						return screenshot(title, temp, rawLocal, file);
					} catch (e) {
						if (e.stdout && e.stdout.toString("utf8").match(/Window with parent `.*` and title `.*` not found\./)) {
							if (retry) {
								console.log(`${chalk.yellow("Retrying")}: ${filename}`);
								return makeScreenshot(false);
							} else {
								return false;
							}
						} else {
							console.log(e);
							throw e;
						}
					}
				}

				let screenshotOutput = makeScreenshot();
				if (screenshotOutput === false) {
					throw new Error("Couldn't make a screenshot, does the window with the specified title actually open?");
				} else {
					const d = screenshotOutput.toString("utf8");
					if (d) {
						console.log(d);
					}
				}

				proc.kill("SIGINT");

				if (!fs.existsSync(reference)) {
					console.log(`${chalk.yellow("Creating new test")}: ${filename}.png`);
					tests.push(["new", file, filename, title]);
					fs.copyFileSync(temp, reference);
				} else {
					const diff = new BlinkDiff({
						imageAPath: temp,
						imageBPath: reference,
						composition: false,
						outputMaskOpacity: 0.9,

						delta, // Distance between the color coordinates in the 4 dimensional color-space that will not trigger a difference.
						// perceptual: true,
						thresholdType: String(accuracyLocal).indexOf("%") !== -1 ? BlinkDiff.THRESHOLD_PERCENT : BlinkDiff.THRESHOLD_PIXEL,
						threshold: Number(String(accuracyLocal).replace("%", "")),

						imageOutputPath: temp.replace(/\.png$/, "_diff.png")
					});

					const r = yield new Promise(function (res, rej) {
						diff.run(function (error, result) {
							if (error) {
								rej(error);
							} else {
								res(result);
							}
						});
					});
					if (diff.hasPassed(r.code)) {
						console.log(`${chalk.green("Passed")}: ${path.basename(file)} - "${title}"`);
						tests.push(["passed", file, filename, title]);
					} else {
						console.log(`${chalk.red("Failed")}: ${path.basename(file)} - "${title}", see ${temp.replace(/\.png$/, "_diff.png")}`);
						tests.push(["failed", file, filename, title]);

						if (interactive) {
							const answer = yield new Confirm({
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
			} catch (e) {
				if (proc) {
					proc.kill("SIGINT");
				}
				console.error(chalk.red(`error: ${file} - "${title}"`));
				console.error("\t", e.message);
				if (e.stdout) console.error("\t", e.stdout.toString("utf8"));
				tests.push(["error", file, filename, title]);
			}
		});

		return function compare(_x, _x2) {
			return _ref.apply(this, arguments);
		};
	})();

	const referenceFolder = `${outDir}/reference/${getOSVersion()}`;
	const tempFolder = `${outDir}/temp`;

	if (!fs.existsSync(`${outDir}`)) {
		fs.mkdirSync(`${outDir}`);
	}
	if (!fs.existsSync(`${outDir}/reference`)) {
		fs.mkdirSync(`${outDir}/reference`);
	}
	if (!fs.existsSync(referenceFolder)) {
		fs.mkdirSync(referenceFolder);
	}
	if (!fs.existsSync(tempFolder)) {
		fs.mkdirSync(tempFolder);
	}

	console.log("OS:", getOSVersion());


	compare.generateHTML = function () {
		const r = path.relative(outDir, referenceFolder).replace(/\\/g, "/");
		const t = path.relative(outDir, tempFolder).replace(/\\/g, "/");
		const html = `<!DOCTYPE html>
	<html>
	<head>
		<title></title>
		<style>
			body{
				font-family: sans-serif;
			}

			.center {
				text-align: center;
			}

			a:visited {
				color: black;
			}

			table {
				border-spacing: 0;
				width: 100%;
			}

			td, th {
				padding: 10px;
				text-align: center;
			}

			tr > td:last-child > div > img:last-child {
				display: none;
			}

			tr > td:last-child > div:hover > img:first-child {
				display: none;
			}

			tr > td:last-child > div:hover > img:last-child {
				display: initial;
			}

			.passed {
				background-color: limegreen;
			}

			.failed, .error {
				background-color: orangered;
			}

			.new {
				background-color: yellow;
			}

			img {
				max-width: 100%;
			}

		</style>
	</head>
	<body>
		<h1 class="center">
			<a href="https://github.com/mischnic/screenshot-tester">screenshot-tester</a> report
		</h1>
		<div class="center">
			Hover over the screenshots on the right to highlight the differing areas in red.
			<br>
			<br>
			(${getOSVersion()})
		</div>
		<br>
		<table>
			<tbody>
				<tr>
					<th>Reference</th>
					<th>Test result</th>
				</tr>
				${tests.map(([status, file, filename, title]) => {
			if (status === "new") {
				return `
						<tr class="${status}">
							<td colspan="2">
								<img src="${r}/${filename}.png">
							</td>
						</tr>`;
			} else {
				return `
						<tr class="${status}">
							<td>
								<img src="${r}/${filename}.png">
							</td>
							<td>
								<div>
									<img src="${t}/${filename}.png">
									<img src="${t}/${filename}_diff.png">
								</div>
							</td>
						</tr>`;
			}
		}).join("\n")}
			</tbody>
		</table>
	</body>
	</html>
	`;
		fs.writeFileSync(`${outDir}/index.html`, html);
		console.log(chalk.magenta(`Generated HTML report: ${outDir}/index.html`));
	};

	compare.result = function () {
		for (const [status, file, filename, title] of tests) {
			if (status !== "passed") {
				return 1;
			}
		}
		return 0;
	};

	return compare;
};
