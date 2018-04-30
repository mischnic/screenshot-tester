let interactive = process.argv[2] === "--interactive" || process.argv[2] === "-i";

const test = require("..")({outDir: __dirname+"/snapshots", interactive});

(async function(){
	// await test("../libui/build/out/test", "Main Window", {raw: true});

	await test("area-adv.js", "libui textDrawArea Example");
	await test("text.js", "libui textDrawArea Example");
	// // await test("../libui-node/examples/core-api.js", "Test window");
	// // await test("../libui-node/examples/control-gallery.js", "Control Gallery");
	// // await test("../libui-node/examples/histogram.js", "libui Histogram Example");
	// await test("../libui-node/examples/forms.js", "Forms window");
	// await test("../libui-node/examples/grid.js", "Forms window");
	// await test("../libui-node/examples/node-pad.js", "Node Pad");

	test.generateHTML();

	process.exitCode = test.result();
})();
