export const releaseEnvelope = (release) => ({
  taxonomyVersion: release.taxonomyVersion,
  release: {
    taxonomyVersion: release.taxonomyVersion,
    counts: release.manifest.counts,
    subjects: release.manifest.subjects,
    files: release.manifest.files,
    codesOnlySources: release.codesOnlySources,
    sourceFileHashes: release.sourceFileHashes,
  },
});

export const filterTopics = (topics, query) => {
  const age = Number.isFinite(query.age) ? query.age : null;
  return topics.filter((topic) => {
    const subjectMatches = query.subject == null || topic.subject === query.subject;
    const domainMatches = query.domain == null || topic.domain === query.domain;
    const typeMatches = query.type == null || topic.type === query.type;
    const standardMatches = query.standard == null || (topic.standards ?? []).includes(query.standard);
    const ageMatches = age == null || (
      Number.isFinite(topic.ageRangeStart)
      && Number.isFinite(topic.ageRangeEnd)
      && topic.ageRangeStart <= age
      && topic.ageRangeEnd >= age
    );
    return subjectMatches && domainMatches && typeMatches && standardMatches && ageMatches;
  });
};

export const setValues = (rows, pick) => [...new Set(rows.map(pick).filter((value) => value != null))].sort((a, b) =>
  String(a).localeCompare(String(b)),
);

export const curriculumSummary = (curriculum, release) => ({
  slug: curriculum.slug,
  country: curriculum.country,
  name: curriculum.name,
  version: curriculum.version,
  sourceUrl: curriculum.sourceUrl,
  textIncluded: curriculum.textIncluded,
  codesOnly: release.codesOnlySources.includes(curriculum.slug),
  license: curriculum.license,
  topicCount: curriculum.topicCount ?? (curriculum.topics ?? []).length,
});

export const filterCurricula = (release, query) => release.curricula
  .map((curriculum) => curriculumSummary(curriculum, release))
  .filter((curriculum) => {
    const bySlug = query.curriculum == null || curriculum.slug === query.curriculum;
    const byCountry = query.country == null || curriculum.country === query.country;
    const byCodesOnly = query.codesOnly == null || curriculum.codesOnly === query.codesOnly;
    return bySlug && byCountry && byCodesOnly;
  });

export const standardRows = (release) => release.curricula.flatMap((curriculum) => {
  const summary = curriculumSummary(curriculum, release);
  return (curriculum.topics ?? []).map((standard) => ({
    taxonomyVersion: release.taxonomyVersion,
    curriculum: curriculum.slug,
    country: curriculum.country,
    curriculumName: curriculum.name,
    textIncluded: curriculum.textIncluded,
    codesOnly: summary.codesOnly,
    key: standard.key,
    code: standard.code,
    ...(standard.data === undefined ? {} : {data: standard.data}),
  }));
});

const alignmentsByStandardKey = (release) => {
  const byKey = new Map();
  for (const alignment of release.alignments) {
    const rows = byKey.get(alignment.standardKey) || [];
    rows.push(alignment);
    byKey.set(alignment.standardKey, rows);
  }
  return byKey;
};

export const filterStandards = (release, query) => {
  const alignmentIndex = alignmentsByStandardKey(release);
  return standardRows(release).filter((standard) => {
    const alignedRows = alignmentIndex.get(standard.key) || [];
    const subject = standard.data?.subject;
    const domain = standard.data?.domain;
    const matchesAlignment = (key, value) => value == null || alignedRows.some((alignment) => alignment[key] === value);

    const byCurriculum = query.curriculum == null || standard.curriculum === query.curriculum;
    const byCountry = query.country == null || standard.country === query.country;
    const bySubject = query.subject == null || subject === query.subject || matchesAlignment('subject', query.subject);
    const byDomain = query.domain == null || domain === query.domain;
    const byBoard = matchesAlignment('board', query.board);
    const byClass = matchesAlignment('class', query.class);
    const byStrand = matchesAlignment('strand', query.strand);
    const byKey = query.key == null || standard.key === query.key;
    const byCode = query.code == null || standard.code === query.code;
    const byCodesOnly = query.codesOnly == null || standard.codesOnly === query.codesOnly;
    return byCurriculum && byCountry && bySubject && byDomain && byBoard && byClass && byStrand && byKey && byCode && byCodesOnly;
  });
};

export const filterAlignments = (release, query) => release.alignments.filter((alignment) => {
  const byTopic = query.topicId == null || alignment.topicId === query.topicId;
  const byStandard = query.standardKey == null || alignment.standardKey === query.standardKey;
  const byCurriculum = query.curriculum == null || alignment.curriculum === query.curriculum;
  const byCountry = query.country == null || alignment.country === query.country;
  const byBoard = query.board == null || alignment.board === query.board;
  const byClass = query.class == null || alignment.class === query.class;
  const bySubject = query.subject == null || alignment.subject === query.subject;
  const byStrand = query.strand == null || alignment.strand === query.strand;
  const byMatch = query.matchType == null || alignment.matchType === query.matchType;
  const byConfidence = query.confidence == null || alignment.confidence === query.confidence;
  return byTopic && byStandard && byCurriculum && byCountry && byBoard && byClass && bySubject && byStrand && byMatch && byConfidence;
});

export const filterClusters = (release, query) => release.clusters.filter((cluster) => {
  const bySubject = query.subject == null || cluster.subject === query.subject;
  const byDomain = query.domain == null || cluster.domain === query.domain;
  const byAge = query.age == null || cluster.ageRangeStart === query.age;
  return bySubject && byDomain && byAge;
});

export const buildCoverage = (release, query) => {
  const standardsByCurriculum = new Map();
  for (const row of standardRows(release)) {
    const rows = standardsByCurriculum.get(row.curriculum) || [];
    rows.push(row);
    standardsByCurriculum.set(row.curriculum, rows);
  }

  const alignmentsByCurriculum = new Map();
  for (const alignment of release.alignments) {
    const rows = alignmentsByCurriculum.get(alignment.curriculum) || [];
    rows.push(alignment);
    alignmentsByCurriculum.set(alignment.curriculum, rows);
  }

  return filterCurricula(release, query).map((curriculum) => {
    const standards = standardsByCurriculum.get(curriculum.slug) || [];
    const alignments = alignmentsByCurriculum.get(curriculum.slug) || [];
    return {
      taxonomyVersion: release.taxonomyVersion,
      curriculum: curriculum.slug,
      country: curriculum.country,
      name: curriculum.name,
      textIncluded: curriculum.textIncluded,
      codesOnly: curriculum.codesOnly,
      standardCount: standards.length,
      alignmentCount: alignments.length,
      alignedStandardCount: new Set(alignments.map((row) => row.standardKey)).size,
      alignedTopicCount: new Set(alignments.map((row) => row.topicId)).size,
      subjects: setValues(alignments, (row) => row.subject),
      boards: setValues(alignments, (row) => row.board),
      classes: setValues(alignments, (row) => row.class),
      strands: setValues(alignments, (row) => row.strand),
    };
  });
};
