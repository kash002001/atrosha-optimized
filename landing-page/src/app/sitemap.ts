import type { MetadataRoute } from "next";

const base = "https://kash.atrosha.bond";

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = [
        "",
        "/login",
        "/signup",
        "/docs",
        "/privacy",
        "/terms",
        "/changelog",
        "/contact",
    ];

    return routes.map((route) => ({
        url: `${base}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "weekly" : "monthly",
        priority: route === "" ? 1 : 0.7,
    }));
}
