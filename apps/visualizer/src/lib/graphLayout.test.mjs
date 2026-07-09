import assert from "node:assert/strict";

import {getTopicPosition} from "./graphLayout.ts";

const first = getTopicPosition({ageRangeStart: 10, domainColumn: 0, row: 0});
const second = getTopicPosition({ageRangeStart: 10, domainColumn: 0, row: 1});
const third = getTopicPosition({ageRangeStart: 10, domainColumn: 0, row: 2});
const fifth = getTopicPosition({ageRangeStart: 10, domainColumn: 0, row: 4});
const nextDomain = getTopicPosition({ageRangeStart: 10, domainColumn: 1, row: 0});

assert.deepEqual(first, {x: 0, y: 1080});
assert.deepEqual(second, {x: 112, y: 1148});
assert.deepEqual(third, {x: 224, y: 1216});
assert.deepEqual(fifth, {x: 0, y: 1352});
assert.equal(nextDomain.x - first.x, 420);
assert.equal(second.x - first.x >= 100, true);
assert.equal(second.y - first.y >= 60, true);
