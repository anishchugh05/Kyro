import { createFileRoute } from "@tanstack/react-router";
import { RangerWorkspace } from "@/components/RangerWorkspace";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    repo: typeof search.repo === "string" ? search.repo : "",
  }),
  head: () => ({
    meta: [
      { title: "Kyro — Autonomous AI Software Engineer" },
      {
        name: "description",
        content:
          "Kyro ingests GitHub repositories, visualizes the codebase as a 3D city, and autonomously fixes issues.",
      },
      { property: "og:title", content: "Kyro" },
      {
        property: "og:description",
        content:
          "Autonomous AI engineer that explores, diagnoses, and patches your repository in real time.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { repo } = Route.useSearch();
  return <RangerWorkspace initialRepo={repo} />;
}
