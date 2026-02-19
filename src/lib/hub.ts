import { promises as fs } from "fs";
import path from "path";

export interface HubArticleMeta {
    slug: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    publishedAt: string;
    updatedAt?: string;
    featured?: boolean;
}

export interface HubArticle extends HubArticleMeta {
    body: string;
    bodyHtml: string;
}

const HUB_CONTENT_DIR = path.join(process.cwd(), "content", "hub");

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
    if (!raw.startsWith("---\n")) {
        return { data: {}, body: raw };
    }

    const end = raw.indexOf("\n---\n", 4);
    if (end < 0) {
        return { data: {}, body: raw };
    }

    const fmRaw = raw.slice(4, end).trim();
    const body = raw.slice(end + 5).trim();
    const data: Record<string, string> = {};

    for (const line of fmRaw.split("\n")) {
        const idx = line.indexOf(":");
        if (idx < 0) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        data[key] = value;
    }

    return { data, body };
}

function parseTags(raw?: string) {
    if (!raw) return [];
    return raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function formatInlineMarkdown(value: string) {
    return value
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
        .replace(/`(.*?)`/g, "<code>$1</code>");
}

function markdownToHtml(raw: string) {
    const lines = raw.split("\n");
    const html: string[] = [];
    let inList = false;
    let inTable = false;

    const closeList = () => {
        if (inList) {
            html.push("</ul>");
            inList = false;
        }
    };

    const closeTable = () => {
        if (inTable) {
            html.push("</tbody></table>");
            inTable = false;
        }
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            closeList();
            closeTable();
            continue;
        }

        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            closeList();
            const cells = trimmed
                .slice(1, -1)
                .split("|")
                .map((c) => `<td>${formatInlineMarkdown(escapeHtml(c.trim()))}</td>`)
                .join("");
            if (!inTable) {
                html.push('<table><tbody>');
                inTable = true;
            }
            html.push(`<tr>${cells}</tr>`);
            continue;
        }

        if (trimmed.startsWith("- ")) {
            closeTable();
            if (!inList) {
                html.push("<ul>");
                inList = true;
            }
            html.push(`<li>${formatInlineMarkdown(escapeHtml(trimmed.slice(2)))}</li>`);
            continue;
        }

        closeList();
        closeTable();

        if (trimmed.startsWith("### ")) {
            html.push(`<h3>${formatInlineMarkdown(escapeHtml(trimmed.slice(4)))}</h3>`);
            continue;
        }
        if (trimmed.startsWith("## ")) {
            html.push(`<h2>${formatInlineMarkdown(escapeHtml(trimmed.slice(3)))}</h2>`);
            continue;
        }
        if (trimmed.startsWith("# ")) {
            html.push(`<h1>${formatInlineMarkdown(escapeHtml(trimmed.slice(2)))}</h1>`);
            continue;
        }

        html.push(`<p>${formatInlineMarkdown(escapeHtml(trimmed))}</p>`);
    }

    closeList();
    closeTable();

    return html.join("\n");
}

async function readHubFile(fileName: string): Promise<HubArticle> {
    const slug = fileName.replace(/\.mdx?$/i, "");
    const fullPath = path.join(HUB_CONTENT_DIR, fileName);
    const raw = await fs.readFile(fullPath, "utf8");
    const { data, body } = parseFrontmatter(raw);

    const title = data.title?.replace(/^["']|["']$/g, "") || slug;
    const description = data.description?.replace(/^["']|["']$/g, "") || "";
    const category = data.category?.replace(/^["']|["']$/g, "") || "Документация";
    const publishedAt = data.publishedAt?.replace(/^["']|["']$/g, "") || new Date().toISOString();
    const updatedAt = data.updatedAt?.replace(/^["']|["']$/g, "");
    const featured = data.featured === "true";

    return {
        slug,
        title,
        description,
        category,
        tags: parseTags(data.tags),
        publishedAt,
        updatedAt: updatedAt || undefined,
        featured,
        body,
        bodyHtml: markdownToHtml(body),
    };
}

export async function getAllHubArticles() {
    const files = await fs.readdir(HUB_CONTENT_DIR);
    const mdxFiles = files.filter((file) => file.endsWith(".mdx") || file.endsWith(".md"));
    const articles = await Promise.all(mdxFiles.map(readHubFile));
    return articles.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}

export async function getHubArticleBySlug(slug: string) {
    const targetFile = `${slug}.mdx`;
    try {
        return await readHubFile(targetFile);
    } catch {
        try {
            return await readHubFile(`${slug}.md`);
        } catch {
            return null;
        }
    }
}

export async function getHubCategories() {
    const articles = await getAllHubArticles();
    const counts = new Map<string, number>();
    for (const article of articles) {
        counts.set(article.category, (counts.get(article.category) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, total]) => ({
        slug: toCategorySlug(name),
        name,
        total,
    }));
}

export function toCategorySlug(value: string) {
    return value
        .toLowerCase()
        .replaceAll(" ", "-")
        .replace(/[^a-zа-я0-9-]/gi, "");
}

export function fromCategorySlug(slug: string, categories: string[]) {
    const found = categories.find((name) => toCategorySlug(name) === slug);
    return found || null;
}

