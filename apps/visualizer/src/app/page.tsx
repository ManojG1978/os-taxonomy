import {GraphExplorer} from "@/components/GraphExplorer";
import {getTaxonomyGraph} from "@/lib/taxonomy";

export default function Home() {
    const graph = getTaxonomyGraph();

    return <GraphExplorer graph={graph}/>;
}
