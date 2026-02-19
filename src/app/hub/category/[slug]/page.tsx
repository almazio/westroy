import Link from "next/link";
import { notFound } from "next/navigation";
import { fromCategorySlug, getAllHubArticles, getHubCategories } from "@/lib/hub";
import styles from "../../page.module.css";

type PageProps = {
    params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
    const categories = await getHubCategories();
    return categories.map((item) => ({ slug: item.slug }));
}

export default async function HubCategoryPage({ params }: PageProps) {
    const { slug } = await params;
    const articles = await getAllHubArticles();
    const categories = await getHubCategories();
    const categoryName = fromCategorySlug(slug, categories.map((item) => item.name));

    if (!categoryName) notFound();

    const filtered = articles.filter((item) => item.category === categoryName);

    return (
        <div className={styles.pageWrap}>
            <div className="container">
                <div className={styles.hero}>
                    <h1>{categoryName}</h1>
                    <p>Материалы раздела. Для операционной работы переходите в приложение.</p>
                </div>

                <div className={styles.grid}>
                    {filtered.map((article) => (
                        <article key={article.slug} className={styles.card}>
                            <div className={styles.meta}>
                                <span className="badge">{new Date(article.publishedAt).toLocaleDateString("ru-RU")}</span>
                            </div>
                            <h3>{article.title}</h3>
                            <p>{article.description}</p>
                            <div className={styles.ctaRow}>
                                <Link className="btn btn-secondary btn-sm" href={`/hub/${article.slug}`}>Читать</Link>
                            </div>
                        </article>
                    ))}
                </div>

                <div className={styles.ctaRow} style={{ marginTop: 16 }}>
                    <Link className="btn btn-ghost" href="/hub">Назад в Hub</Link>
                </div>
            </div>
        </div>
    );
}

