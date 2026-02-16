
import Hero from '@/components/home/Hero';
import CategoriesGrid from '@/components/home/CategoriesGrid';
import FeaturedProducers from '@/components/home/FeaturedProducers';
import PopularMaterials from '@/components/home/PopularMaterials';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  return (
    <div className={styles.page}>
      <Hero />
      <PopularMaterials />
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
