let interactive = process.argv[2] === "--interactive" || process.argv[2] === "-i";

process.chdir(__dirname);
const test = require("..")({ outDir: "snapshots", interactive });

(async function() {
	// await test("../libui/build/out/test", "Main Window", {raw: true});

	await test("src/area-adv.js", "libui textDrawArea Example", { delta: 100 });
	await test("src/text.js", "libui textDrawArea Example");
	// // await test("../libui-node/examples/core-api.js", "Test window");
	// // await test("../libui-node/examples/control-gallery.js", "Control Gallery");
	// // await test("../libui-node/examples/histogram.js", "libui Histogram Example");
	await test("src/forms.js", "Forms window");
	await test("src/grid.js", "Forms window");
	await test("src/node-pad.js", "Node Pad");

	test.generateHTML();

	process.exitCode = test.result();
})();
