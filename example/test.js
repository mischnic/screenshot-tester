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

	const REPO = process.env.TRAVIS_REPO_SLUG || process.env.APPVEYOR_REPO_NAME;
	const PR_NUM = process.env.TRAVIS_PULL_REQUEST || process.env.APPVEYOR_PULL_REQUEST_NUMBER;
	const COMMIT = process.env.TRAVIS_COMMIT || process.env.APPVEYOR_REPO_COMMIT;
	const NODE_MAJOR = process.version.substr(1).split(".")[0];
	if (REPO && Number(PR_NUM)) {
		test.pushToServer("https://sts.mischnic.ml", REPO, PR_NUM, NODE_MAJOR !== "11", " - Node " + NODE_MAJOR);
	} else if (REPO && COMMIT) {
		test.pushToServer("https://sts.mischnic.ml", REPO, COMMIT, NODE_MAJOR !== "11", " - Node " + NODE_MAJOR);
	}

	// test.pushToServer("http://localhost:3000", "mischnic/screenshot-tester", "2", false, " - Node " + NODE_MAJOR);
	// test.pushToServer("http://localhost:3000", "mischnic/screenshot-tester", "43afd1409f60cdb38ba7c3aa34ab22f9eca1a66e", false, " - Node " + NODE_MAJOR);

	process.exitCode = test.result();
})();
