import Link from "next/link";
import { getAllHubArticles, getHubCategories, toCategorySlug } from "@/lib/hub";
import HubCtaButton from "@/components/hub/HubCtaButton";
import styles from "./page.module.css";

type HubPageProps = {
    searchParams?: Promise<{ q?: string }>;
};

export const metadata = {
    title: "Westroy Hub — база знаний для строительства",
    description: "Документация, строительный реестр и практические материалы для заказчиков и поставщиков в РК.",
};

export default async function HubPage({ searchParams }: HubPageProps) {
    const resolved = searchParams ? await searchParams : {};
    const q = (resolved.q || "").trim().toLowerCase();

    const [articles, categories] = await Promise.all([getAllHubArticles(), getHubCategories()]);
    const filtered = q
        ? articles.filter((item) =>
            `${item.title} ${item.description} ${item.category} ${item.tags.join(" ")}`
                .toLowerCase()
                .includes(q)
        )
        : articles;

    return (
        <div className={styles.pageWrap}>
            <div className="container">
                <section className={styles.hero}>
                    <h1>Westroy Hub</h1>
                    <p>Документация, строительный реестр и обучающие материалы. Используйте Hub как базу знаний и переходите в приложение для работы с заявками.</p>
                </section>

                <form className={styles.searchBar} action="/hub" method="get">
                    <input className="input" name="q" defaultValue={q} placeholder="Поиск по материалам и реестру" />
                    <button className="btn btn-primary" type="submit">Найти</button>
                </form>

                <div className={styles.categories}>
                    {categories.map((category) => (
                        <Link key={category.slug} className={styles.categoryChip} href={`/hub/category/${toCategorySlug(category.name)}`}>
                            {category.name} ({category.total})
                        </Link>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className={styles.empty}>Ничего не найдено. Попробуйте другой запрос.</div>
                ) : (
                    <div className={styles.grid}>
                        {filtered.map((article) => (
                            <article key={article.slug} className={styles.card}>
                                <div className={styles.meta}>
                                    <span className="badge badge-info">{article.category}</span>
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
                )}

                <div className={styles.ctaRow} style={{ marginTop: 24 }}>
                    <HubCtaButton
                        className="btn btn-primary"
                        href="https://app.westroy.kz/search?utm_source=hub&utm_medium=cta&utm_campaign=hub_launch&utm_content=hub_main"
                        label="Перейти в приложение"
                        placement="hub_main_bottom"
                    />
                </div>
            </div>
        </div>
    );
}
