import assert from "node:assert/strict";

import {getMiniMapTheme} from "./graphTheme.ts";

const darkTheme = getMiniMapTheme("dark");

assert.notEqual(darkTheme.bgColor, "#fff");
assert.equal(darkTheme.bgColor, "#172232");
assert.equal(darkTheme.maskColor, "rgba(13, 20, 32, 0.66)");
assert.equal(darkTheme.nodeStrokeColor, "#e5edf6");

const lightTheme = getMiniMapTheme("light");

assert.equal(lightTheme.bgColor, "#f6f8fb");
assert.equal(lightTheme.maskColor, "rgba(238, 243, 248, 0.62)");
assert.equal(lightTheme.nodeStrokeColor, "#17212d");
