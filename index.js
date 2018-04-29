const { promisify } = require("util");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const createDiff = promisify(require("looks-same").createDiff);
const looksSame = promisify(require("looks-same"));
const Confirm = require("prompt-confirm");
const chalk = require("chalk");

function getOSVersion(){
	if(process.platform == "win32"){
		// https://stackoverflow.com/a/44916050/2352201
		const versions = os.release().split(".");
		switch(versions[0]){
			case "10":
				return "win10";

			case "6":
				switch(versions[1]){
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
				switch(versions[1]){
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

module.exports = function({ outDir = ".", raw = false, interactive = false, delay = 0} = {}) {
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

	return async function compare(file, title, { delay: delayLocal, raw: rawLocal } = {}) {
		rawLocal = typeof rawLocal === "undefined" ? raw : rawLocal;
		delayLocal = typeof delayLocal === "undefined" ? delay : delayLocal;
		let proc;
		try {
			// for(let i = 0; i < 1; i++){

			const filename = path.basename(file).replace(/\s/g, "_"); //+"_"+i

			const reference = `${referenceFolder}/${filename}.png`;
			const temp = `${tempFolder}/${filename}.png`;

			if (rawLocal) {
				proc = spawn(file);
			} else {
				proc = spawn("node", [file]);
			}
			await wait(delayLocal + (process.platform === "win32" ? 600 : 100));
			await screenshot(title, temp, rawLocal, file);

			proc.kill("SIGINT");

			if (!fs.existsSync(reference)) {
				console.log(`${chalk.yellow("Creating new test")}: ${filename}.png`);
				fs.copyFileSync(temp, reference);
			} else {
				const same = await looksSame(reference, temp, process.platform === "win32" ? { tolerance: 60 } : {});

				if (same) {
					console.log(`${chalk.green("Passed")}: ${path.basename(file)} - "${title}"`);
				} else {
					console.log(`${chalk.red("Failed")}: ${path.basename(file)} - "${title}" didn't pass, see ${temp.replace(/\.png$/, "_diff.png")}`);
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
		}
	};
};
