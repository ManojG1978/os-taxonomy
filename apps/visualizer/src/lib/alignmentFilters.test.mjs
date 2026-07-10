import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

import {
    ALL_ALIGNMENT_FILTERS,
    getAlignedTopicIds,
    getAlignmentOptions,
    isAlignmentFilterActive,
} from "./alignmentFilters.ts";

const alignments = JSON.parse(
    readFileSync(new URL("../../../../data/curriculum-alignments.json", import.meta.url), "utf8"),
).alignments;
const dependencies = JSON.parse(
    readFileSync(new URL("../../../../data/dependencies.json", import.meta.url), "utf8"),
).dependencies;

const cbseClass6Math = {
    curriculum: "ncert-class6-math-2026-27",
    board: "CBSE",
    classValue: "6",
    strand: "Number System",
};

assert.equal(isAlignmentFilterActive(ALL_ALIGNMENT_FILTERS), false);
assert.equal(isAlignmentFilterActive(cbseClass6Math), true);

const options = getAlignmentOptions(alignments, "Mathematics");
assert.deepEqual(options.curricula, ["ncert-class6-math-2026-27"]);
assert.deepEqual(options.boards, ["CBSE"]);
assert.deepEqual(options.classes, ["6"]);
assert.deepEqual(options.strands, [
    "Constructions",
    "Data Handling/Patterns",
    "Fractions",
    "Geometry/Measurement",
    "Integers",
    "Number System",
    "Symmetry",
]);

const topicIds = getAlignedTopicIds(alignments, cbseClass6Math);
assert.equal(topicIds.size, 17);
assert.equal(alignments.filter((row) => row.board === "CBSE" && row.class === 6).length, 94);
assert.equal(topicIds.has("mt_FHIAv6dfhU"), true);
assert.equal(topicIds.has("mt_JwP9QFv6gQ"), true);

const cbseClass6MathTopicIds = getAlignedTopicIds(alignments, {
    ...cbseClass6Math,
    strand: "All strands",
});
const cbseClass6MathInternalEdges = dependencies.filter(
    (dependency) =>
        cbseClass6MathTopicIds.has(dependency.topicId) &&
        cbseClass6MathTopicIds.has(dependency.prerequisiteId),
);
assert.equal(cbseClass6MathTopicIds.size, 77);
assert.equal(cbseClass6MathInternalEdges.length, 65);
assert.equal(cbseClass6MathInternalEdges.filter((dependency) => dependency.strength === "hard").length, 57);

const geometryMeasurementTopicIds = getAlignedTopicIds(alignments, {
    ...cbseClass6Math,
    strand: "Geometry/Measurement",
});
assert.equal(geometryMeasurementTopicIds.size, 12);
assert.equal(
    alignments.filter((row) => row.board === "CBSE" && row.class === 6 && row.strand === "Geometry/Measurement")
        .length,
    16,
);
assert.equal(geometryMeasurementTopicIds.has("mt_8OAGVdeTJ_"), true);
assert.equal(geometryMeasurementTopicIds.has("mt_Jvvh5P06NV"), true);

const dataHandlingPatternTopicIds = getAlignedTopicIds(alignments, {
    ...cbseClass6Math,
    strand: "Data Handling/Patterns",
});
assert.equal(dataHandlingPatternTopicIds.size, 16);
assert.equal(
    alignments.filter((row) => row.board === "CBSE" && row.class === 6 && row.strand === "Data Handling/Patterns")
        .length,
    16,
);
assert.equal(dataHandlingPatternTopicIds.has("mt_ChjMU2GDJa"), true);
assert.equal(dataHandlingPatternTopicIds.has("mt_fZTn0W_iZR"), true);

const noMatches = getAlignedTopicIds(alignments, {
    ...cbseClass6Math,
    classValue: "7",
});
assert.equal(noMatches.size, 0);
