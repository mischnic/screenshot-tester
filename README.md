# screenshot-tester

Take screenshots (= snapshots) of desktop node apps (i.e. [libui-node](https://github.com/parro-it/libui-node)) to test for regressions.

Usage:

```js
const test = require("screenshot-tester");

(async function(){
    await test("my_example.js", "The Window Title");
})();
```

This will:
- run `node my_example.js`
- take a screenshot of the window with the specified title
- close the app
- compare with or create a new reference screenshot