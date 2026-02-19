import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/", "/hub", "/hub/*", "/partners"],
                disallow: ["/admin", "/dashboard", "/login", "/register", "/search", "/company", "/api"],
            },
        ],
        sitemap: "https://westroy.kz/sitemap.xml",
        host: "https://westroy.kz",
    };
}

