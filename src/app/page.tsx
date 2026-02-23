
import Hero from '@/components/home/Hero';
import CategoriesGrid from '@/components/home/CategoriesGrid';
import FeaturedProducers from '@/components/home/FeaturedProducers';
import PopularMaterials from '@/components/home/PopularMaterials';
import styles from './page.module.css';

export const revalidate = 3600; // ISR: regenerate every hour

export default async function Home() {
  return (
    <div className={styles.page}>
      <Hero />
      <PopularMaterials />

      <section className={styles.howItWorks}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Как это работает</h2>
          <div className={styles.steps}>
            <article className={styles.stepCard}>
              <span className={styles.stepNum}>1</span>
              <h3>Опишите, что нужно</h3>
              <p>Напишите материал, объём и город в поиске или оставьте заявку.</p>
            </article>
            <article className={styles.stepCard}>
              <span className={styles.stepNum}>2</span>
              <h3>Получите предложения</h3>
              <p>Проверенные поставщики отправят цены и условия доставки.</p>
            </article>
            <article className={styles.stepCard}>
              <span className={styles.stepNum}>3</span>
              <h3>Выберите лучшее</h3>
              <p>Сравните офферы, подтвердите подходящий и закройте задачу.</p>
            </article>
          </div>
        </div>
      </section>

      <CategoriesGrid />
      <FeaturedProducers />

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <div className={styles.ctaCard}>
            <h2>Вы производитель?</h2>
            <p>Подайте заявку на подключение. После проверки мы откроем доступ в кабинет партнера.</p>
            <a href="/partners" className="btn btn-primary">Стать партнером</a>
          </div>
        </div>
      </section>
    </div>
  );
}
