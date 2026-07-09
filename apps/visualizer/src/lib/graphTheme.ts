export type VisualizerTheme = "light" | "dark";

export type MiniMapTheme = {
    bgColor: string;
    maskColor: string;
    nodeStrokeColor: string;
};

export function getMiniMapTheme(theme: VisualizerTheme): MiniMapTheme {
    if (theme === "dark") {
        return {
            bgColor: "#172232",
            maskColor: "rgba(13, 20, 32, 0.66)",
            nodeStrokeColor: "#e5edf6",
        };
    }

    return {
        bgColor: "#f6f8fb",
        maskColor: "rgba(238, 243, 248, 0.62)",
        nodeStrokeColor: "#17212d",
    };
}
