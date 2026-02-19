import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllHubArticles, getHubArticleBySlug } from "@/lib/hub";
import HubCtaButton from "@/components/hub/HubCtaButton";
import styles from "../page.module.css";

type PageProps = {
    params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
    const articles = await getAllHubArticles();
    return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const article = await getHubArticleBySlug(slug);
    if (!article) {
        return { title: "Материал не найден" };
    }
    return {
        title: `${article.title} | Westroy Hub`,
        description: article.description,
        openGraph: {
            title: article.title,
            description: article.description,
            type: "article",
            url: `https://westroy.kz/hub/${article.slug}`,
        },
    };
}

export default async function HubArticlePage({ params }: PageProps) {
    const { slug } = await params;
    const article = await getHubArticleBySlug(slug);
    if (!article) notFound();

    const all = await getAllHubArticles();
    const related = all
        .filter((item) => item.slug !== article.slug && item.category === article.category)
        .slice(0, 3);

    const articleJsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
        author: {
            "@type": "Organization",
            name: "WESTROY",
        },
        mainEntityOfPage: `https://westroy.kz/hub/${article.slug}`,
    };

    return (
        <div className={styles.pageWrap}>
            <div className="container">
                <article className={styles.card}>
                    <div className={styles.meta}>
                        <span className="badge badge-info">{article.category}</span>
                        <span className="badge">{new Date(article.publishedAt).toLocaleDateString("ru-RU")}</span>
                    </div>
                    <h1>{article.title}</h1>
                    <p className="text-secondary" style={{ marginTop: 8 }}>{article.description}</p>
                    <div
                        style={{ marginTop: 16 }}
                        dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
                    />

                    <div className={styles.ctaRow} style={{ marginTop: 20 }}>
                        <HubCtaButton
                            className="btn btn-primary"
                            href={`https://app.westroy.kz/search?utm_source=hub&utm_medium=cta&utm_campaign=hub_article&utm_content=${article.slug}`}
                            label="Перейти в каталог в приложении"
                            placement={`hub_article_${article.slug}`}
                        />
                    </div>
                </article>

                {related.length > 0 && (
                    <section style={{ marginTop: 20 }}>
                        <h2 style={{ marginBottom: 10 }}>Похожие материалы</h2>
                        <div className={styles.grid}>
                            {related.map((item) => (
                                <article key={item.slug} className={styles.card}>
                                    <h3>{item.title}</h3>
                                    <p>{item.description}</p>
                                    <div className={styles.ctaRow}>
                                        <Link className="btn btn-secondary btn-sm" href={`/hub/${item.slug}`}>Открыть</Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
            </div>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
            />
        </div>
    );
}
