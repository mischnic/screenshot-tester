let total = 0,
	passed = 0,
	failed = 0;

function tapLogger(type, file, err) {
	switch (type) {
		case "MISSING":
			total++;
			failed++;
			console.log(`not ok ${total} - ${file} # Skip`);
			console.log("  ---");
			console.log(`    message: Reference missing`);
			console.log("  ...");
			break;
		case "FAILED":
		case "ERROR":
			total++;
			failed++;
			console.log(`not ok ${total} - ${file}`);
			console.log("  ---");
			console.log(`    message: Looks different, see ${err}`);
			console.log("  ...");
			break;
		case "PASSED":
			total++;
			passed++;
			console.log(`ok ${total} - ${file}`);
			break;
	}
}

process.chdir(__dirname);
const test = require("..")({ outDir: "snapshots", logger: tapLogger });

(async function() {
	console.log("TAP VERSION 13");
	console.log("# screenshot-tester");

	await test("src/area-adv.js", "libui textDrawArea Example", { delta: 100 });
	await test("src/text.js", "libui textDrawArea Example");
	await test("src/forms.js", "Forms window");
	await test("src/grid.js", "Forms window");
	await test("src/node-pad.js", "Node Pad");

	test.generateHTML();

	console.log(`\n1..${total}`);
	console.log(`# tests ${total}`);
	console.log(`# pass ${passed}`);
	if (failed) console.log(`# fail ${failed}`);
	else console.log("\n# ok\n");
})();
