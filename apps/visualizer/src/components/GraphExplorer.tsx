"use client";

import {Background, Controls, type Edge, MarkerType, MiniMap, type Node, ReactFlow,} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {useEffect, useMemo, useState} from "react";
import type {Dependency, TaxonomyGraph, Topic} from "@/lib/taxonomy";

const SUBJECT_COLORS: Record<string, string> = {
    Computing: "#4568f0",
    English: "#d14c7b",
    History: "#9a6a2d",
    "Learning to Learn": "#6f5db8",
    "Life Skills": "#16866f",
    Mathematics: "#2b7aaf",
    "Personal & Social Development": "#c45b2e",
    Science: "#3f8f43",
};

type GraphExplorerProps = {
    graph: TaxonomyGraph;
};

type SelectedTopic = Topic & {
    prerequisites: Dependency[];
    unlocks: Dependency[];
};

type Theme = "light" | "dark";

export function GraphExplorer({graph}: GraphExplorerProps) {
    const [subject, setSubject] = useState("Science");
    const [domain, setDomain] = useState("All domains");
    const [minAge, setMinAge] = useState(graph.ageRange.min);
    const [maxAge, setMaxAge] = useState(graph.ageRange.max);
    const [edgeMode, setEdgeMode] = useState<"hard" | "soft" | "all">("all");
    const [query, setQuery] = useState("");
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [theme, setTheme] = useState<Theme>("light");

    useEffect(() => {
        const savedTheme = window.localStorage.getItem("marble-taxonomy-theme");
        if (savedTheme === "light" || savedTheme === "dark") {
            setTheme(savedTheme);
            return;
        }

        setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }, []);

    useEffect(() => {
        window.localStorage.setItem("marble-taxonomy-theme", theme);
    }, [theme]);

    const topicById = useMemo(
        () => new Map(graph.topics.map((topic) => [topic.id, topic])),
        [graph.topics],
    );

    const domains = graph.domainsBySubject[subject] ?? [];

    const filteredTopics = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return graph.topics
            .filter((topic) => topic.subject === subject)
            .filter((topic) => domain === "All domains" || topic.domain === domain)
            .filter((topic) => topic.ageRangeStart <= maxAge && topic.ageRangeEnd >= minAge)
            .filter((topic) => {
                if (!normalizedQuery) {
                    return true;
                }
                return `${topic.name} ${topic.description} ${topic.domain}`
                    .toLowerCase()
                    .includes(normalizedQuery);
            })
            .sort((a, b) => {
                if (a.ageRangeStart !== b.ageRangeStart) {
                    return a.ageRangeStart - b.ageRangeStart;
                }
                if (a.domain !== b.domain) {
                    return a.domain.localeCompare(b.domain);
                }
                return b.centrality - a.centrality;
            })
            .slice(0, 220);
    }, [domain, graph.topics, maxAge, minAge, query, subject]);

    const filteredTopicIds = useMemo(
        () => new Set(filteredTopics.map((topic) => topic.id)),
        [filteredTopics],
    );

    const visibleEdges = useMemo(
        () =>
            graph.dependencies.filter(
                (dependency) =>
                    filteredTopicIds.has(dependency.topicId) &&
                    filteredTopicIds.has(dependency.prerequisiteId) &&
                    (edgeMode === "all" || dependency.strength === edgeMode),
            ),
        [edgeMode, filteredTopicIds, graph.dependencies],
    );

    const selectedTopic = useMemo<SelectedTopic | null>(() => {
        if (!selectedTopicId) {
            return null;
        }
        const topic = topicById.get(selectedTopicId);
        if (!topic) {
            return null;
        }

        return {
            ...topic,
            prerequisites: graph.dependencies.filter((dependency) => dependency.topicId === topic.id),
            unlocks: graph.dependencies.filter((dependency) => dependency.prerequisiteId === topic.id),
        };
    }, [graph.dependencies, selectedTopicId, topicById]);

    const flow = useMemo(() => buildFlow(filteredTopics, visibleEdges), [filteredTopics, visibleEdges]);
    const clusters = graph.clusters.filter(
        (cluster) =>
            cluster.subject === subject &&
            (domain === "All domains" || cluster.domain === domain) &&
            cluster.ageRangeStart >= minAge &&
            cluster.ageRangeStart <= maxAge,
    );

    return (
        <main className="shell" data-theme={theme}>
            <aside className="sidebar" aria-label="Graph controls">
                <div className="brand">
                    <div>
                        <span>Marble</span>
                        <strong>Curriculum Graph</strong>
                    </div>
                    <button
                        type="button"
                        className="theme-toggle"
                        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    >
            <span className="theme-track">
              <span className="theme-thumb"/>
            </span>
                        {theme === "light" ? "Light" : "Dark"}
                    </button>
                </div>

                <section className="panel">
                    <label htmlFor="subject">Subject</label>
                    <select
                        id="subject"
                        value={subject}
                        onChange={(event) => {
                            setSubject(event.target.value);
                            setDomain("All domains");
                            setSelectedTopicId(null);
                        }}
                    >
                        {graph.subjects.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="domain">Domain</label>
                    <select
                        id="domain"
                        value={domain}
                        onChange={(event) => {
                            setDomain(event.target.value);
                            setSelectedTopicId(null);
                        }}
                    >
                        <option>All domains</option>
                        {domains.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="query">Search</label>
                    <input
                        id="query"
                        type="search"
                        value={query}
                        placeholder="Topic, concept, domain"
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </section>

                <section className="panel">
                    <div className="control-row">
                        <label htmlFor="minAge">Min age</label>
                        <input
                            id="minAge"
                            type="number"
                            min={graph.ageRange.min}
                            max={maxAge}
                            value={minAge}
                            onChange={(event) => setMinAge(Number(event.target.value))}
                        />
                    </div>
                    <div className="control-row">
                        <label htmlFor="maxAge">Max age</label>
                        <input
                            id="maxAge"
                            type="number"
                            min={minAge}
                            max={graph.ageRange.max}
                            value={maxAge}
                            onChange={(event) => setMaxAge(Number(event.target.value))}
                        />
                    </div>

                    <div className="segmented" aria-label="Dependency strength">
                        {(["all", "hard", "soft"] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                className={edgeMode === mode ? "active" : ""}
                                onClick={() => setEdgeMode(mode)}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="stats" aria-label="Visible graph statistics">
                    <div>
                        <strong>{filteredTopics.length}</strong>
                        <span>topics shown</span>
                    </div>
                    <div>
                        <strong>{visibleEdges.length}</strong>
                        <span>visible edges</span>
                    </div>
                    <div>
                        <strong>{graph.manifest.counts.topics}</strong>
                        <span>total topics</span>
                    </div>
                </section>

                <section className="panel cluster-panel">
                    <h2>Cluster Notes</h2>
                    <div className="cluster-list">
                        {clusters.slice(0, 8).map((cluster) => (
                            <article key={`${cluster.domain}-${cluster.ageRangeStart}`}>
                                <strong>
                                    Age {cluster.ageRangeStart} · {cluster.domain}
                                </strong>
                                <p>{cluster.summary}</p>
                            </article>
                        ))}
                        {clusters.length === 0 ? <p>No cluster summary matches this view.</p> : null}
                    </div>
                </section>
            </aside>

            <section className="workspace" aria-label="Curriculum graph visualizer">
                <div className="topbar">
                    <div>
                        <p>{graph.manifest.taxonomyVersion} dataset</p>
                        <h1>{subject} prerequisite map</h1>
                    </div>
                    <div className="legend">
            <span>
              <i className="hard"/> hard
            </span>
                        <span>
              <i className="soft"/> soft
            </span>
                    </div>
                </div>

                <div className="graph-frame">
                    <ReactFlow
                        nodes={flow.nodes}
                        edges={flow.edges}
                        fitView
                        minZoom={0.2}
                        maxZoom={1.7}
                        onNodeClick={(_, node) => setSelectedTopicId(node.id)}
                        nodesDraggable
                    >
                        <Background color="#c8d3df" gap={22}/>
                        <Controls position="bottom-left"/>
                        <MiniMap
                            pannable
                            zoomable
                            nodeColor={(node) => node.style?.background?.toString() ?? "#6c7684"}
                        />
                    </ReactFlow>
                    {selectedTopic ? (
                        <TopicTile
                            selectedTopic={selectedTopic}
                            topicById={topicById}
                            onClose={() => setSelectedTopicId(null)}
                        />
                    ) : null}
                </div>
            </section>
        </main>
    );
}

function TopicTile({
                       selectedTopic,
                       topicById,
                       onClose,
                   }: {
    selectedTopic: SelectedTopic;
    topicById: Map<string, Topic>;
    onClose: () => void;
}) {
    return (
        <aside className="topic-tile" aria-label="Selected topic details">
            <div className="tile-header">
                <div className="topic-kicker">
                    <span style={{background: SUBJECT_COLORS[selectedTopic.subject]}}/>
                    {selectedTopic.domain}
                </div>
                <button type="button" className="icon-button" aria-label="Close topic details" onClick={onClose}>
                    x
                </button>
            </div>
            <h2>{selectedTopic.name}</h2>
            <p className="description">{selectedTopic.description}</p>
            <dl>
                <div>
                    <dt>Age band</dt>
                    <dd>
                        {selectedTopic.ageRangeStart}-{selectedTopic.ageRangeEnd}
                    </dd>
                </div>
                <div>
                    <dt>Type</dt>
                    <dd>{selectedTopic.type.toLowerCase()}</dd>
                </div>
                <div>
                    <dt>Standards</dt>
                    <dd>{selectedTopic.standards.length}</dd>
                </div>
            </dl>
            <section>
                <h3>Evidence</h3>
                <ul className="evidence-list">
                    {selectedTopic.evidence.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </section>
            <section>
                <h3>Prerequisites</h3>
                <ConnectionList connections={selectedTopic.prerequisites} topicById={topicById} edge="in"/>
            </section>
            <section>
                <h3>Unlocks</h3>
                <ConnectionList connections={selectedTopic.unlocks} topicById={topicById} edge="out"/>
            </section>
        </aside>
    );
}

function ConnectionList({
                            connections,
                            topicById,
                            edge,
                        }: {
    connections: Dependency[];
    topicById: Map<string, Topic>;
    edge: "in" | "out";
}) {
    if (connections.length === 0) {
        return <p className="muted">No direct links.</p>;
    }

    return (
        <ul className="connection-list">
            {connections.slice(0, 12).map((connection) => {
                const relatedTopic = topicById.get(edge === "in" ? connection.prerequisiteId : connection.topicId);
                return (
                    <li key={`${connection.topicId}-${connection.prerequisiteId}`}>
                        <div className="connection-heading">
                            <strong>{relatedTopic?.name ?? "Unknown topic"}</strong>
                            <span className={`strength-pill ${connection.strength}`}>{connection.strength}</span>
                        </div>
                        <p>{connection.reason}</p>
                    </li>
                );
            })}
        </ul>
    );
}

function buildFlow(topics: Topic[], dependencies: Dependency[]): { nodes: Node[]; edges: Edge[] } {
    const domains = Array.from(new Set(topics.map((topic) => topic.domain))).sort();
    const domainIndex = new Map(domains.map((item, index) => [item, index]));
    const rowCounts = new Map<string, number>();

    const nodes: Node[] = topics.map((topic) => {
        const rowKey = `${topic.domain}-${topic.ageRangeStart}`;
        const row = rowCounts.get(rowKey) ?? 0;
        rowCounts.set(rowKey, row + 1);
        const domainColumn = domainIndex.get(topic.domain) ?? 0;
        const diameter = Math.max(10, Math.min(34, Math.sqrt(topic.centrality) * 56));

        return {
            id: topic.id,
            position: {
                x: domainColumn * 260 + row * 20,
                y: (topic.ageRangeStart - 4) * 130 + row * 34,
            },
            data: {
                label: "",
            },
            ariaLabel: `${topic.name}, age ${topic.ageRangeStart}-${topic.ageRangeEnd}`,
            style: {
                width: diameter,
                height: diameter,
                borderRadius: "999px",
                border: "2px solid var(--node-ring)",
                background: SUBJECT_COLORS[topic.subject] ?? "#58667a",
                boxShadow: "0 8px 20px var(--node-shadow)",
                padding: 0,
            },
        };
    });

    const edges: Edge[] = dependencies.map((dependency) => ({
        id: `${dependency.prerequisiteId}->${dependency.topicId}`,
        source: dependency.prerequisiteId,
        target: dependency.topicId,
        animated: dependency.strength === "hard",
        markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
        },
        style: {
            stroke: dependency.strength === "hard" ? "var(--edge-hard)" : "var(--edge-soft)",
            strokeWidth: dependency.strength === "hard" ? 2 : 1.4,
            strokeDasharray: dependency.strength === "soft" ? "6 5" : undefined,
        },
    }));

    return {nodes, edges};
}
