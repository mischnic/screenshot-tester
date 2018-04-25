const test = require(".")("out");

(async function(){
	await require(".")("out", false)("../libui/build/out/test", "Main Window");

	await test("../libui-node/examples/area-adv.js", "libui textDrawArea Example");
	await test("../libui-node/examples/text.js", "libui textDrawArea Example");
	// await test("../libui-node/examples/core-api.js", "Test window");
	// await test("../libui-node/examples/control-gallery.js", "Control Gallery");
	await test("../libui-node/examples/forms.js", "Forms window");
	await test("../libui-node/examples/grid.js", "Forms window");
	await test("../libui-node/examples/node-pad.js", "Node Pad");

})();
