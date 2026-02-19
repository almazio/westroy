import type { MetadataRoute } from "next";
import { getAllHubArticles } from "@/lib/hub";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = "https://westroy.kz";
    const hubArticles = await getAllHubArticles();

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
        { url: `${baseUrl}/hub`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
        { url: `${baseUrl}/partners`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    ];

    const hubRoutes: MetadataRoute.Sitemap = hubArticles.map((article) => ({
        url: `${baseUrl}/hub/${article.slug}`,
        lastModified: new Date(article.updatedAt || article.publishedAt),
        changeFrequency: "monthly",
        priority: article.featured ? 0.8 : 0.6,
    }));

    return [...staticRoutes, ...hubRoutes];
}

