# screenshot-tester

Take screenshots (= snapshots) of desktop (node) apps (i.e. [libui-node](https://github.com/parro-it/libui-node)) to test for regressions.

Usage:

```js
const test = require("screenshot-tester")();

(async function(){
    await test("my_example.js", "The Window Title");
})();
```

or for native apps:

```js
const test = require("screenshot-tester")(".", false);

(async function(){
    await test("app", "The Window Title");
})();
```

This will:
- Run `node my_example.js` or `app`
- Take a screenshot of the window with the specified title
- Close the app
- Compare with or create a new reference screenshot
- If `-i` is passed on the command line or `true` as the second argument to the curried `require`, a failed test will cause a prompt asking whether to update the reference screenshot.


A failed test will generate a diff file, hightlighting the differing areas in red:

```
─ outDir ('.')
  ├─ reference
  │  └─ my_example.js.png
  └─ tmp
     ├─ my_example.js.png
     └─ my_example.js_diff.png
```

## Reference

```js
const test = require("screenshot-tester")(outDirPath = ".", useNode = true, interactiveFlag);

test(file, title, additionalDelay);
```

## Bundled projects

- pyscreencapture for macOS from https://github.com/thismachinechills/pyscreencapture
- screenshot-cmd for Windows from https://github.com/chuntaro/screenshot-cmd