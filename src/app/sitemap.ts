import type { MetadataRoute } from "next";

const ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/car-value-check", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/is-this-car-worth-it", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/used-car-analysis", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/car-scam-check", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/login", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" as const }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const lastModified = new Date();
  return ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority
  }));
}
