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
const request = require("request-promise-native");
const rawTerminate = require("terminate");
const terminate = pid => new Promise((res, rej) => {
	rawTerminate(pid, err => {
		if (err) rej(err);else res();
	});
});

const copyFileSync = typeof fs.copyFileSync === "function" ? fs.copyFileSync : (from, to) => fs.writeFileSync(to, fs.readFileSync(from));

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

const TEST_PASSED = "PASSED";
const TEST_FAILED = "FAILED";
const TEST_MISSING = "MISSING";
const TEST_ERROR = "ERROR";
const TEST_REPORT = "REPORT";
const TEST_PUSH = "PUSH";
const TEST_OS = "OS";
const TEST_RETRY = "RETRY";

function defaultLogger(type, file, err) {
	switch (type) {
		case TEST_MISSING:
			console.log(`${chalk.yellow("Creating new test")}: ${file}`);
			break;
		case TEST_FAILED:
			console.log(`${chalk.red("Failed")}: ${file}, see ${err}`);
			break;
		case TEST_PASSED:
			console.log(`${chalk.green("Passed")}: ${file}`);
			break;
		case TEST_ERROR:
			console.error(chalk.red(`Error: ${file}`));
			console.error("\t", err);
			break;
		case TEST_REPORT:
			console.log(chalk.magenta(`Generated HTML report: ${file}`));
			break;
		case TEST_PUSH:
			if (err) {
				console.error(chalk.red(`Sending report to: ${file} failed`));
				console.error("\t", err);
			} else {
				console.log(chalk.magenta(`Sent report to: ${file}`));
			}
			break;
		case TEST_OS:
			console.log(`OS: ${file}`);
			break;
		case TEST_RETRY:
			console.log(`${chalk.yellow("Retrying")}: ${file}`);
			break;
	}
}

module.exports = function ({ outDir = ".", raw = false, interactive = false, delay = 0, accuracy = "0.01%", logger = defaultLogger } = {}) {
	let compare = (() => {
		var _ref = _asyncToGenerator(function* (fileWithArgs, title, { delay: delayLocal, raw: rawLocal, delta = 20, accuracy: accuracyLocal } = {}) {
			rawLocal = typeof rawLocal === "undefined" ? raw : rawLocal;
			delayLocal = typeof delayLocal === "undefined" ? delay : delayLocal;
			accuracyLocal = typeof accuracyLocal === "undefined" ? accuracy : accuracyLocal;
			let proc;
			fileWithArgs = [].concat(fileWithArgs);
			const file = fileWithArgs[0];
			const filename = path.basename(file).replace(/\s/g, "_"); //+"_"+i
			try {
				// for(let i = 0; i < 1; i++){

				const reference = `${referenceFolder}/${filename}.png`;
				const temp = `${tempFolder}/${filename}.png`;

				if (rawLocal) {
					proc = spawn(fileWithArgs[0], fileWithArgs.slice(1));
				} else {
					proc = spawn("node", fileWithArgs);
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
								logger(TEST_RETRY, `${path.basename(file)} - "${title}"`);
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

				// proc.kill("SIGINT");
				yield terminate(proc.pid);

				if (!fs.existsSync(reference)) {
					logger(TEST_MISSING, `${path.basename(file)} - "${title}"`);
					tests.push(["new", file, filename, title]);
					copyFileSync(temp, reference);
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
						logger(TEST_PASSED, `${path.basename(file)} - "${title}"`);
						tests.push(["passed", file, filename, title]);
					} else {
						logger(TEST_FAILED, `${path.basename(file)} - "${title}"`, temp.replace(/\.png$/, "_diff.png"));
						tests.push(["failed", file, filename, title]);

						if (interactive) {
							const answer = yield new Confirm({
								message: `Do you want to update "${path.basename(file)}" ?`,
								default: false
							}).run();

							if (answer) {
								copyFileSync(temp, reference);
								console.log(`\tUpdated: ${path.basename(file)}`);
							}
						}
					}
				}
			} catch (e) {
				if (proc) {
					yield terminate(proc.pid);
					// proc.kill("SIGINT");
				}
				let msg = e.message;
				if (e.stdout) {
					msg += "\n" + e.stdout.toString("utf8");
				}
				logger(TEST_ERROR, `${file} - "${title}"`, msg);
				tests.push(["error", file, filename, title]);
			}
		});

		return function compare(_x, _x2) {
			return _ref.apply(this, arguments);
		};
	})();

	const tests = [];
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

	logger(TEST_OS, getOSVersion());


	compare.generateHTML = function (silent = false) {
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
		if (!silent) logger(TEST_REPORT, `${outDir}/index.html`);
	};

	compare.pushToServer = (() => {
		var _ref2 = _asyncToGenerator(function* (host, repoId, issue, onlyFailed = false, osAppend = "") {
			compare.generateHTML(true);
			const failed = tests.filter(function (v) {
				return v[0] !== "passed";
			});

			const data = (onlyFailed ? failed : tests).reduce(function (acc, [status, file, filename, title]) {
				const ref = `${referenceFolder}/${filename}.png`;
				const temp = `${tempFolder}/${filename}.png`;
				const diff = `${tempFolder}/${filename}_diff.png`;
				if (fs.existsSync(ref)) acc[`${filename}:${ref}:ref`] = fs.createReadStream(ref);
				if (fs.existsSync(temp)) acc[`${filename}:${temp}:res`] = fs.createReadStream(temp);
				if (fs.existsSync(diff)) acc[`${filename}:${diff}:diff`] = fs.createReadStream(diff);
				return acc;
			}, onlyFailed ? {} : { [`:${outDir}/index.html:`]: fs.createReadStream(`${outDir}/index.html`) });

			try {
				yield request.post({
					url: host + "/" + repoId + "/" + issue,
					qs: {
						os: getOSVersion() + osAppend,
						failed: failed.map(function (v) {
							return v[2];
						})
					},
					formData: data
				});
				logger(TEST_PUSH, `${host} - ${repoId}/${issue}`);
			} catch (e) {
				logger(TEST_PUSH, `${host} - ${repoId}/${issue}`, e);
			}
		});

		return function (_x3, _x4, _x5) {
			return _ref2.apply(this, arguments);
		};
	})();

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

module.exports.defaultLogger = defaultLogger;
