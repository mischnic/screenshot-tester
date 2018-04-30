const { promisify } = require("util");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const createDiff = promisify(require("looks-same").createDiff);
const looksSame = promisify(require("looks-same"));
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
		throw Error("Platform not supported! Feel free to contribute at https://github.com/mischnic/screenshot-tester !");
	}
}

tests = [];

module.exports = function({ outDir = ".", raw = false, interactive = false, delay = 0 } = {}) {
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

	async function compare(file, title, { delay: delayLocal, raw: rawLocal } = {}) {
		rawLocal = typeof rawLocal === "undefined" ? raw : rawLocal;
		delayLocal = typeof delayLocal === "undefined" ? delay : delayLocal;
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
			await wait(delayLocal + (process.platform === "win32" ? 600 : 100));

			async function makeScreenshot() {
				return await screenshot(title, temp, rawLocal, file).catch(e => {
					if (e.stdout && e.stdout.toString("utf8").match(/Window with parent `.*` and title `.*` not found\./)) {
						return false;
					} else {
						throw e;
					}
				});
			}

			if ((await makeScreenshot()) === false) {
				console.log(`${chalk.yellow("Retrying")}: ${filename}`);
				if ((await makeScreenshot()) === false) {
					throw new Error("Couldn't make a screenshot, does the window with the specified title actually open?");
				}
			}

			proc.kill("SIGINT");

			if (!fs.existsSync(reference)) {
				console.log(`${chalk.yellow("Creating new test")}: ${filename}.png`);
				fs.copyFileSync(temp, reference);
			} else {
				const same = await looksSame(reference, temp, process.platform === "win32" ? { tolerance: 60 } : {});

				if (same) {
					console.log(`${chalk.green("Passed")}: ${path.basename(file)} - "${title}"`);
					tests.push(["passed", file, filename, title]);
				} else {
					console.log(`${chalk.red("Failed")}: ${path.basename(file)} - "${title}", see ${temp.replace(/\.png$/, "_diff.png")}`);
					tests.push(["failed", file, filename, title]);
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
			console.error(chalk.red(`error: ${file} - "${title}"`));
			console.error("\t", e.message);
			if (e.stdout) console.error("\t", e.stdout.toString("utf8"));
			tests.push(["error", file, filename, title]);
		}
	}

	compare.generateHTML = function() {
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

			tr.failed > td:last-child > div > img:last-child {
				display: none;
			}

			tr.failed > td:last-child > div:hover > img:first-child {
				display: none;
			}

			tr.failed > td:last-child > div:hover > img:last-child {
				display: initial;
			}

			.passed {
				background-color: limegreen;
			}

			.failed, .error {
				background-color: orangered;
			}

		</style>
	</head>
	<body>
		<h1 class="center">
			<a href="https://github.com/mischnic/screenshot-tester">screenshot-tester</a> report
		</h1>
		<div class="center">
			Hover over the screenshots on the right to highlight the differing areas in red.
		</div>
		<br>
		<table>
			<tbody>
				<tr>
					<th>Reference</th>
					<th>Test result</th>
				</tr>
				${tests
					.map(([status, file, filename, title]) => {
						if (status === "passed" || status === "error") {
							return `
						<tr class="${status}">
							<td colspan="2">
								<img src="${referenceFolder}/${filename}.png">
							</td>
						</tr>`;
						} else if (status === "failed") {
							return `
						<tr class="${status}">
							<td>
								<img src="${referenceFolder}/${filename}.png">
							</td>
							<td>
								<div>
									<img src="${tempFolder}/${filename}.png">
									<img src="${tempFolder}/${filename}_diff.png">
								</div>
							</td>
						</tr>`;
						}
					})
					.join("\n")}
			</tbody>
		</table>
	</body>
	</html>
	`;
		fs.writeFileSync(`${outDir}/report.html`, html);
		console.log(chalk.magenta(`Generated HTML report: ${outDir}/report.html`));
	};

	compare.result = function(){
		for(const [status, file, filename, title] of tests){
			if(status !== "passed"){
				return 1;
			}
		}
		return 0;
	}

	return compare;
};
