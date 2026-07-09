export type AlignmentFilterState = {
    curriculum: string;
    board: string;
    classValue: string;
    strand: string;
};

export const ALL_ALIGNMENT_FILTERS: AlignmentFilterState = {
    curriculum: "All curricula",
    board: "All boards",
    classValue: "All classes",
    strand: "All strands",
};

export type CurriculumAlignment = {
    topicId: string;
    standardKey: string;
    curriculum: string;
    country: string;
    board: string;
    class?: number;
    stage?: string;
    subject: string;
    strand?: string;
    unit?: string;
    matchType: "direct" | "partial" | "supporting" | "extension";
    confidence: "machine" | "reviewed" | "verified";
    source: "manual" | "machine" | "imported";
    notes?: string;
};

export type AlignmentOptions = {
    curricula: string[];
    boards: string[];
    classes: string[];
    strands: string[];
};

export function isAlignmentFilterActive(filters: AlignmentFilterState): boolean {
    return (
        filters.curriculum !== ALL_ALIGNMENT_FILTERS.curriculum ||
        filters.board !== ALL_ALIGNMENT_FILTERS.board ||
        filters.classValue !== ALL_ALIGNMENT_FILTERS.classValue ||
        filters.strand !== ALL_ALIGNMENT_FILTERS.strand
    );
}

export function getAlignmentOptions(
    alignments: CurriculumAlignment[],
    subject: string,
): AlignmentOptions {
    const matchingSubject = alignments.filter((alignment) => alignment.subject === subject);

    return {
        curricula: uniqueSorted(matchingSubject.map((alignment) => alignment.curriculum)),
        boards: uniqueSorted(matchingSubject.map((alignment) => alignment.board)),
        classes: uniqueSorted(
            matchingSubject
                .map((alignment) => alignment.class)
                .filter((classValue): classValue is number => typeof classValue === "number")
                .map(String),
            (a, b) => Number(a) - Number(b),
        ),
        strands: uniqueSorted(
            matchingSubject
                .map((alignment) => alignment.strand)
                .filter((strand): strand is string => Boolean(strand)),
        ),
    };
}

export function getAlignedTopicIds(
    alignments: CurriculumAlignment[],
    filters: AlignmentFilterState,
): Set<string> {
    return new Set(
        alignments
            .filter((alignment) => {
                if (
                    filters.curriculum !== ALL_ALIGNMENT_FILTERS.curriculum &&
                    alignment.curriculum !== filters.curriculum
                ) {
                    return false;
                }
                if (filters.board !== ALL_ALIGNMENT_FILTERS.board && alignment.board !== filters.board) {
                    return false;
                }
                if (
                    filters.classValue !== ALL_ALIGNMENT_FILTERS.classValue &&
                    String(alignment.class) !== filters.classValue
                ) {
                    return false;
                }
                if (filters.strand !== ALL_ALIGNMENT_FILTERS.strand && alignment.strand !== filters.strand) {
                    return false;
                }
                return true;
            })
            .map((alignment) => alignment.topicId),
    );
}

function uniqueSorted(values: string[], compare?: (a: string, b: string) => number): string[] {
    return Array.from(new Set(values)).sort(compare ?? ((a, b) => a.localeCompare(b)));
}
