const compare = require(".");

(async function(){
	await compare("../libui-node/examples/area-adv.js", "libui textDrawArea Example");
	await compare("../libui-node/examples/text.js", "libui textDrawArea Example");
	await compare("../libui-node/examples/control-gallery.js", "Control Gallery");
	await compare("../libui-node/examples/forms.js", "Forms window");
	await compare("../libui-node/examples/grid.js", "Forms window");
	await compare("../libui-node/examples/node-pad.js", "Node Pad");
})();
