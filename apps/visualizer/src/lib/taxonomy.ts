import clustersJson from "../../../../data/clusters.json";
import alignmentsJson from "../../../../data/curriculum-alignments.json";
import dependenciesJson from "../../../../data/dependencies.json";
import manifestJson from "../../../../data/manifest.json";
import topicsJson from "../../../../data/topics.json";
import type {CurriculumAlignment} from "./alignmentFilters";

export type Topic = {
    id: string;
    type: string;
    subject: string;
    domain: string;
    name: string;
    description: string;
    ageRangeStart: number;
    ageRangeEnd: number;
    centrality: number;
    evidence: string[];
    assessmentPrompt: string;
    standards: string[];
};

export type Dependency = {
    topicId: string;
    prerequisiteId: string;
    strength: "hard" | "soft";
    reason: string;
};

export type Cluster = {
    subject: string;
    domain: string;
    ageRangeStart: number;
    summary: string;
};

export type TaxonomyGraph = {
    topics: Topic[];
    dependencies: Dependency[];
    alignments: CurriculumAlignment[];
    clusters: Cluster[];
    manifest: {
        taxonomyVersion: string;
        generatedAt: string;
        counts: {
            topics: number;
            dependencies: number;
            clusters: number;
            curricula: number;
            curriculumStandards: number;
            curriculumAlignments: number;
        };
    };
    subjects: string[];
    domainsBySubject: Record<string, string[]>;
    ageRange: {
        min: number;
        max: number;
    };
};

export function getTaxonomyGraph(): TaxonomyGraph {
    const topics = topicsJson.topics as Topic[];
    const dependencies = dependenciesJson.dependencies as Dependency[];
    const alignments = alignmentsJson.alignments as CurriculumAlignment[];
    const clusters = clustersJson.clusters as Cluster[];
    const subjects = Array.from(new Set(topics.map((topic) => topic.subject))).sort();
    const domainsBySubject = subjects.reduce<Record<string, string[]>>((domains, subject) => {
        domains[subject] = Array.from(
            new Set(
                topics
                    .filter((topic) => topic.subject === subject)
                    .map((topic) => topic.domain),
            ),
        ).sort();
        return domains;
    }, {});
    const ages = topics.flatMap((topic) => [topic.ageRangeStart, topic.ageRangeEnd]);

    return {
        topics,
        dependencies,
        alignments,
        clusters,
        manifest: manifestJson,
        subjects,
        domainsBySubject,
        ageRange: {
            min: Math.min(...ages),
            max: Math.max(...ages),
        },
    };
}
