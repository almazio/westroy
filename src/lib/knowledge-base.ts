export type KnowledgeItemType = 'standard' | 'snippet' | 'calculation' | 'measurement' | 'hack';
export type KnowledgeItemStatus = 'draft' | 'reviewed' | 'published' | 'archived';
export type KnowledgeSourceType = 'standard' | 'law' | 'article' | 'vendor' | 'internal';

export interface StarterKnowledgeSource {
    type: KnowledgeSourceType;
    title: string;
    url?: string;
    publisher?: string;
    notes?: string;
}

export interface StarterKnowledgeItem {
    title: string;
    type: KnowledgeItemType;
    status: KnowledgeItemStatus;
    topic: string;
    summary: string;
    contentMd: string;
    formula?: string;
    inputSchemaJson?: string;
    outputSchemaJson?: string;
    tags: string[];
    regionCode?: string;
    sourceName?: string;
    sourceUrl?: string;
    verificationNote?: string;
    sources: StarterKnowledgeSource[];
}

export function slugifyKnowledgeTitle(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9а-яё]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120);
}

export const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeItemType, string> = {
    standard: 'Норматив',
    snippet: 'Сниппет',
    calculation: 'Расчет',
    measurement: 'Замер',
    hack: 'Лайфхак',
};

export const STARTER_KZ_KNOWLEDGE_BASE: StarterKnowledgeItem[] = [
    {
        title: 'ГОСТ 34028-2016: арматурный прокат для железобетона',
        type: 'standard',
        status: 'reviewed',
        topic: 'materials/rebar',
        summary: 'Базовый стандарт на арматуру классов A500 и выше. Используется как reference при закупке и входном контроле.',
        contentMd: 'Используйте стандарт как минимум для проверки сертификатов поставщика, класса прочности и геометрии стержней. Для закупки в заявке фиксируйте: класс, диаметр, длину, массу партии и требуемые документы на каждую плавку.',
        tags: ['арматура', 'ГОСТ', 'железобетон', 'входной-контроль'],
        sourceName: 'ГОСТ 34028-2016',
        sourceUrl: 'https://docs.cntd.ru/document/1200138241',
        verificationNote: 'Проверь актуальную редакцию и применимость в РК перед включением в договор и ППР.',
        sources: [
            {
                type: 'standard',
                title: 'ГОСТ 34028-2016',
                url: 'https://docs.cntd.ru/document/1200138241',
                notes: 'Текст стандарта и структура требований.',
            },
        ],
    },
    {
        title: 'ГОСТ 7473-2010: бетонные смеси. Технические условия',
        type: 'standard',
        status: 'reviewed',
        topic: 'materials/concrete',
        summary: 'Опорный стандарт для марки/класса, подвижности, морозостойкости и водонепроницаемости бетонной смеси.',
        contentMd: 'При заказе бетона фиксируйте минимум: класс прочности, подвижность, крупность заполнителя, требования по морозостойкости/водонепроницаемости, объем и интервал поставки. На приемке сверяйте паспорт партии.',
        tags: ['бетон', 'ГОСТ', 'смесь', 'бетонирование'],
        sourceName: 'ГОСТ 7473-2010',
        sourceUrl: 'https://docs.cntd.ru/document/1200088362',
        verificationNote: 'Перед применением проверь национальные требования РК по бетонным работам.',
        sources: [
            {
                type: 'standard',
                title: 'ГОСТ 7473-2010',
                url: 'https://docs.cntd.ru/document/1200088362',
            },
        ],
    },
    {
        title: 'СП РК/СН РК по бетонным и железобетонным конструкциям (чек-лист применения)',
        type: 'standard',
        status: 'draft',
        topic: 'standards/rk',
        summary: 'Карточка для фиксации действующих на объекте сводов правил и строительных норм РК.',
        contentMd: 'Перед стартом проекта укажите актуальные документы РК, которые применяются к объекту: проектирование, производство работ, контроль качества, приемка. В карточке храните номер, редакцию, дату проверки и ссылку на официальный источник.',
        tags: ['СП РК', 'СН РК', 'РК', 'проектирование'],
        verificationNote: 'Требуется заполнить точными номерами документов под тип объекта.',
        sources: [
            {
                type: 'internal',
                title: 'Шаблон верификации нормативов по объекту',
                notes: 'Заполняется инженером ПТО или технадзором.',
            },
        ],
    },
    {
        title: 'Расчет объема бетона для ленты/плиты',
        type: 'calculation',
        status: 'published',
        topic: 'calculations/concrete',
        summary: 'Базовый расчет V = L × W × H с добавлением технологического запаса.',
        contentMd: 'Формула подходит для первичного расчета закупки. После расчета объема добавляйте запас 3-10% в зависимости от геометрии, потерь при подаче и качества опалубки.',
        formula: 'V = L * W * H; Vfinal = V * (1 + reservePct / 100)',
        inputSchemaJson: '{"L":"м","W":"м","H":"м","reservePct":"%"}',
        outputSchemaJson: '{"V":"м3","Vfinal":"м3"}',
        tags: ['бетон', 'объем', 'калькуляция', 'фундамент'],
        sources: [
            {
                type: 'internal',
                title: 'Внутренний шаблон калькуляции WESTROY',
            },
        ],
    },
    {
        title: 'Расчет количества арматуры по массе',
        type: 'calculation',
        status: 'published',
        topic: 'calculations/rebar',
        summary: 'Расчет массы по удельному весу погонного метра для сметы и закупки.',
        contentMd: 'Используйте таблицу удельного веса для выбранного диаметра. Итоговая масса = суммарная длина стержней × кг/м. Для заказа учитывайте отходы на резку и нахлест (обычно 5-12%).',
        formula: 'M = totalLengthM * weightPerMeterKg',
        inputSchemaJson: '{"totalLengthM":"м","weightPerMeterKg":"кг/м","wastePct":"%"}',
        outputSchemaJson: '{"massKg":"кг","massWithWasteKg":"кг"}',
        tags: ['арматура', 'масса', 'смета', 'закупка'],
        sources: [
            {
                type: 'internal',
                title: 'Таблицы удельного веса арматуры',
            },
        ],
    },
    {
        title: 'Расчет сухих смесей для стяжки пола',
        type: 'calculation',
        status: 'published',
        topic: 'calculations/finishing',
        summary: 'Расчет по площади, толщине слоя и норме расхода на 1 м2/мм.',
        contentMd: 'Формула: количество мешков = площадь × толщина × расход / вес мешка. Норму расхода берите из технической карты конкретной смеси и храните как источник в карточке.',
        formula: 'bags = (areaM2 * thicknessMm * consumptionKgPerM2Mm) / bagKg',
        inputSchemaJson: '{"areaM2":"м2","thicknessMm":"мм","consumptionKgPerM2Mm":"кг/м2/мм","bagKg":"кг"}',
        outputSchemaJson: '{"bags":"шт"}',
        tags: ['стяжка', 'сухие-смеси', 'расчет', 'отделка'],
        sources: [
            {
                type: 'vendor',
                title: 'Техническая карта производителя смеси',
                notes: 'Нужна привязка к бренду и артикулу.',
            },
        ],
    },
    {
        title: 'Замер площади стены под штукатурку',
        type: 'measurement',
        status: 'published',
        topic: 'measurements/finishing',
        summary: 'Площадь стен = периметр × высота, минус проемы.',
        contentMd: 'Фиксируйте отдельно глухие стены и стены с большим количеством проемов. Для сметы добавляйте коэффициент сложности для углов, откосов и кривизны основания.',
        formula: 'S = perimeterM * heightM - openingsAreaM2',
        tags: ['штукатурка', 'замер', 'площадь', 'отделка'],
        sources: [
            {
                type: 'internal',
                title: 'Шаблон замеров WESTROY',
            },
        ],
    },
    {
        title: 'Замер объема щебня/песка на площадке',
        type: 'measurement',
        status: 'published',
        topic: 'measurements/aggregates',
        summary: 'Приближенный расчет через геометрию кучи с пересчетом в массу по насыпной плотности.',
        contentMd: 'Для оперативной оценки используйте геометрию (конус/усеченный конус/параллелепипед), затем переводите в тонны по насыпной плотности. Плотность берите из паспорта материала или лабораторного протокола.',
        formula: 'massTons = volumeM3 * bulkDensityTPerM3',
        tags: ['щебень', 'песок', 'замер', 'логистика'],
        sources: [
            {
                type: 'internal',
                title: 'Инструкция по приемке инертных материалов',
            },
        ],
    },
    {
        title: 'Сниппет: чек-лист приемки бетона на объекте',
        type: 'snippet',
        status: 'published',
        topic: 'snippets/concrete',
        summary: 'Короткий шаблон для прораба: документы, время доставки, визуальный контроль и фиксация отклонений.',
        contentMd: '1) Проверить паспорт партии и соответствие заказу. 2) Зафиксировать время отгрузки/прибытия. 3) Оценить подвижность и однородность смеси. 4) Подтвердить объем по накладной. 5) Любые отклонения оформить актом в день поставки.',
        tags: ['бетон', 'приемка', 'прораб', 'чек-лист'],
        sources: [
            {
                type: 'internal',
                title: 'Операционный чек-лист WESTROY',
            },
        ],
    },
    {
        title: 'Сниппет: стандартная структура техзадания на закуп материалов',
        type: 'snippet',
        status: 'published',
        topic: 'snippets/procurement',
        summary: 'Шаблон ТЗ для тендера/запроса коммерческих предложений.',
        contentMd: 'В ТЗ обязательно указывайте: объект, спецификацию (бренд/аналог), единицу измерения, объем, график поставки, требования к документам качества, условия доставки/разгрузки и правила приемки.',
        tags: ['ТЗ', 'закуп', 'материалы', 'тендер'],
        sources: [
            {
                type: 'internal',
                title: 'Шаблон закупки WESTROY',
            },
        ],
    },
    {
        title: 'Лайфхак: как снижать переплаты на логистике инертных материалов',
        type: 'hack',
        status: 'published',
        topic: 'hacks/logistics',
        summary: 'Считайте не только цену за тонну, но и цену за тонно-километр, потери на перегрузе и простои техники.',
        contentMd: 'Сравнивайте предложения по полной стоимости доставки: материал + транспорт + ожидание + разгрузка. Часто выгоднее частые короткие рейсы от ближнего карьера, чем дешевая тонна с дальнего плеча.',
        tags: ['логистика', 'щебень', 'песок', 'экономия'],
        sources: [
            {
                type: 'internal',
                title: 'Практика закупок WESTROY',
            },
        ],
    },
    {
        title: 'Лайфхак: инструментальный минимум бригады под монолит',
        type: 'hack',
        status: 'published',
        topic: 'hacks/tools',
        summary: 'Минимальный набор инструмента и контроль его готовности до бетонирования.',
        contentMd: 'Перед заливкой проверяйте наличие и рабочее состояние: вибратор, лазерный уровень, правило, глубинные вибраторы, расходники для опалубки, резервное питание и освещение. Это снижает риск переделок и простоев.',
        tags: ['инструменты', 'монолит', 'бригада', 'подготовка'],
        sources: [
            {
                type: 'internal',
                title: 'Чек-лист подготовки к бетонированию',
            },
        ],
    },
];
