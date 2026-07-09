const DOMAIN_GAP = 420;
const AGE_GAP = 180;
const LANE_X_GAP = 112;
const LANE_Y_GAP = 68;
const LANE_COLUMNS = 4;

export type TopicPositionInput = {
    ageRangeStart: number;
    domainColumn: number;
    row: number;
};

export function getTopicPosition({ageRangeStart, domainColumn, row}: TopicPositionInput): { x: number; y: number } {
    const laneColumn = row % LANE_COLUMNS;
    const laneRow = Math.floor(row / LANE_COLUMNS);

    return {
        x: domainColumn * DOMAIN_GAP + laneColumn * LANE_X_GAP,
        y: (ageRangeStart - 4) * AGE_GAP + (laneColumn + laneRow * LANE_COLUMNS) * LANE_Y_GAP,
    };
}
