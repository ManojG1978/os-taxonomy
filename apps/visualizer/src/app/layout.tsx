import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Marble Curriculum Graph Visualizer",
    description: "Explore the Marble Skill Taxonomy prerequisite graph.",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    );
}
