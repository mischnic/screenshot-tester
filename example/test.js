let interactive = process.argv[2] === "--interactive" || process.argv[2] === "-i";

process.chdir(__dirname);
const test = require("..")({ outDir: "snapshots", interactive });

(async function() {
	// await test(["../../libui/build/out/test", "nomenus"], "Main Window", {raw: true});

	await test("src/area-adv.js", "libui textDrawArea Example", { delta: 100 });
	await test("src/text.js", "libui textDrawArea Example");
	// await test("../libui-node/examples/core-api.js", "Test window");
	// await test("../libui-node/examples/control-gallery.js", "Control Gallery");
	// await test("../libui-node/examples/histogram.js", "libui Histogram Example");
	await test("src/forms.js", "Forms window");
	await test("src/grid.js", "Forms window");
	await test("src/node-pad.js", "Node Pad");

	test.generateHTML();

	const PR_REPO = process.env.TRAVIS_REPO_SLUG || process.env.APPVEYOR_REPO_NAME;
	const PR_NUM = process.env.TRAVIS_PULL_REQUEST || process.env.APPVEYOR_PULL_REQUEST_NUMBER;
	const NODE_MAJOR = process.version.substr(1).split(".")[0];
	if (PR_REPO && Number(PR_NUM)) {
		test.pushToServer("https://screenshot-tester-server.mischnic.ml", PR_REPO, PR_NUM, NODE_MAJOR !== "10", " - Node " + NODE_MAJOR);
	}
	// test.pushToServer("http://localhost:3000", "mischnic/screenshot-tester", 2, process.version.substr(1).split(".")[0] !== "10");

	process.exitCode = test.result();
})();
