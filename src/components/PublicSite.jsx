import React, { useEffect } from 'react';
import {
  FiActivity,
  FiArrowRight,
  FiBarChart2,
  FiBookOpen,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCompass,
  FiCpu,
  FiLayers,
  FiPieChart,
  FiShield,
  FiTarget,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';
import Brand, { KryvionMark } from './Brand.jsx';
import PeterAccountGateway from './PeterAccountGateway.jsx';
import { blogArticles, findArticle } from '../content/blogArticles.js';

const SITE_URL = 'https://kryvion.petertecnet.com.br';

function setMeta(name, content, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(property ? 'property' : 'name', name);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function Seo({ title, description, path = '/', type = 'website', schemas = [] }) {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${path === '/' ? '' : path}`;
    document.title = title;
    setMeta('description', description);
    setMeta('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', type, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:site_name', 'Kryvion', true);
    setMeta('twitter:card', 'summary');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    document.head.querySelectorAll('script[data-kryvion-schema]').forEach((node) => node.remove());
    schemas.forEach((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.kryvionSchema = 'true';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });
  }, [title, description, path, type, schemas]);

  return null;
}

function PublicHeader() {
  return (
    <header className="public-header">
      <a className="public-brand-link" href="/" aria-label="Kryvion - página inicial"><Brand /></a>
      <nav className="public-nav" aria-label="Navegação principal">
        <a href="/#recursos">Recursos</a>
        <a href="/#como-funciona">Como funciona</a>
        <a href="/blog">Blog</a>
      </nav>
      <div className="public-header-actions">
        <a className="public-login-link" href="/entrar">Entrar</a>
        <a className="public-primary small" href="/entrar">Criar conta grátis <FiArrowRight /></a>
      </div>
    </header>
  );
}

const featureCards = [
  { icon: FiBarChart2, title: 'Visão de mercado', text: 'Acompanhe ativos, variação, volume e contexto em uma visão centralizada.' },
  { icon: FiCompass, title: 'Radar de oportunidades', text: 'Compare ativos por múltiplos fatores em vez de depender de um único indicador.' },
  { icon: FiActivity, title: 'Gráficos avançados', text: 'Leia tendência, momentum, estrutura e comportamento do mercado com mais contexto.' },
  { icon: FiShield, title: 'Risk Guardian', text: 'Defina limites pessoais de exposição e mantenha o risco visível antes de aumentar posições.' },
  { icon: FiPieChart, title: 'Portfólio organizado', text: 'Reúna posições, valor atual, concentração e desempenho em um só lugar.' },
  { icon: FiLayers, title: 'Simulador de cenários', text: 'Teste impactos de movimentos de mercado e entenda como sua carteira reagiria.' },
];

const workflow = [
  { number: '01', icon: FiTarget, title: 'Encontre o que merece atenção', text: 'O radar prioriza ativos e reduz o ruído de acompanhar dezenas de telas ao mesmo tempo.' },
  { number: '02', icon: FiCpu, title: 'Cruze sinais e contexto', text: 'Tendência, momentum, liquidez, volatilidade e risco são analisados como conjunto.' },
  { number: '03', icon: FiShield, title: 'Decida com limites claros', text: 'Antes de agir, visualize exposição, cenários e concentração. A decisão continua sendo sua.' },
];

function Landing() {
  const description = 'Kryvion é uma plataforma gratuita de inteligência para o mercado de criptomoedas: análise de mercado, radar de oportunidades, gráficos, portfólio, simulação e gestão de risco.';
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Kryvion',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      brand: { '@type': 'Brand', name: 'Kryvion' },
      publisher: { '@type': 'Organization', name: 'Peter Tecnet', url: 'https://petertecnet.com.br' },
      featureList: [
        'Análise de mercado de criptomoedas',
        'Radar multifator de oportunidades',
        'Gestão de risco',
        'Acompanhamento de portfólio',
        'Simulação de cenários',
        'Gráficos de mercado',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Kryvion',
      url: SITE_URL,
      inLanguage: 'pt-BR',
      description,
      publisher: { '@type': 'Organization', name: 'Peter Tecnet', url: 'https://petertecnet.com.br' },
    },
  ];

  return (
    <div className="public-site">
      <Seo title="Kryvion | Análise de Criptomoedas, Mercado e Gestão de Risco" description={description} schemas={schemas} />
      <PublicHeader />

      <main className="public-main">
        <section className="public-hero">
          <div className="public-hero-grid" aria-hidden="true" />
          <div className="public-glow public-glow-one" aria-hidden="true" />
          <div className="public-glow public-glow-two" aria-hidden="true" />

          <div className="public-hero-copy">
            <span className="public-kicker"><i /> INTELIGÊNCIA PARA O MERCADO CRIPTO</span>
            <h1>Entenda o mercado antes de <em>arriscar seu capital.</em></h1>
            <p>A Kryvion transforma dados de criptomoedas em contexto: tendência, oportunidade, risco, portfólio e cenários reunidos em uma plataforma criada para decisões mais conscientes.</p>
            <div className="public-hero-actions">
              <a className="public-primary" href="/entrar">Criar conta gratuita <FiArrowRight /></a>
              <a className="public-secondary" href="#recursos">Ver o que você recebe <FiChevronRight /></a>
            </div>
            <div className="public-proof-row">
              <span><FiCheckCircle /> Conta gratuita</span>
              <span><FiCheckCircle /> Mercado 24/7</span>
              <span><FiCheckCircle /> Sem execução automática de ordens</span>
            </div>
          </div>

          <div className="public-hero-visual" aria-label="Prévia conceitual do painel Kryvion">
            <div className="public-terminal-head"><span><i /> MARKET INTELLIGENCE</span><b>kryvion</b></div>
            <div className="public-terminal-metrics">
              <div><small>REGIME</small><strong>Leitura multifator</strong><span>contexto + tendência</span></div>
              <div><small>OPPORTUNITY</small><strong>Score comparável</strong><span>priorização de ativos</span></div>
              <div><small>RISK GUARDIAN</small><strong>Exposição visível</strong><span>limites e cenários</span></div>
            </div>
            <div className="public-terminal-chart">
              <div className="chart-lines"><i /><i /><i /><i /><i /></div>
              <svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label="Ilustração de tendência de mercado">
                <defs><linearGradient id="publicChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8f4dff" stopOpacity=".35"/><stop offset="100%" stopColor="#38bfff" stopOpacity="0"/></linearGradient></defs>
                <path d="M0 145 C45 132 55 148 90 118 S150 135 185 104 S245 92 276 112 S335 66 370 78 S420 42 452 58 S520 18 600 32 L600 180 L0 180 Z" fill="url(#publicChartFill)" />
                <path d="M0 145 C45 132 55 148 90 118 S150 135 185 104 S245 92 276 112 S335 66 370 78 S420 42 452 58 S520 18 600 32" fill="none" stroke="#a86cff" strokeWidth="4" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <div className="public-terminal-footer"><span><FiShield /> Risco antes da decisão</span><span><FiZap /> Dados organizados</span></div>
          </div>
        </section>

        <section className="public-strip" aria-label="Proposta da Kryvion">
          <div><strong>24/7</strong><span>mercado que não fecha</span></div>
          <div><strong>1 painel</strong><span>para reduzir o ruído</span></div>
          <div><strong>multifator</strong><span>em vez de indicador mágico</span></div>
          <div><strong>risco</strong><span>como parte da análise</span></div>
        </section>

        <section className="public-section" id="recursos">
          <div className="public-section-head">
            <span className="public-kicker"><i /> SUA CONTA GRATUITA</span>
            <h2>Mais contexto para analisar cripto. <em>Menos decisões no impulso.</em></h2>
            <p>Abra sua conta e transforme várias etapas da análise de criptomoedas em uma rotina única e visual.</p>
          </div>
          <div className="public-feature-grid">
            {featureCards.map(({ icon: Icon, title, text }) => (
              <article className="public-feature-card" key={title}>
                <span className="public-feature-icon"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-section public-process" id="como-funciona">
          <div className="public-section-head left">
            <span className="public-kicker"><i /> COMO A KRYVION AJUDA</span>
            <h2>Do excesso de informação a um <em>processo de decisão.</em></h2>
            <p>O objetivo não é prever o futuro por você. É tornar o raciocínio mais estruturado, comparável e consciente do risco.</p>
          </div>
          <div className="public-workflow">
            {workflow.map(({ number, icon: Icon, title, text }) => (
              <article key={number}>
                <div className="public-step-top"><span>{number}</span><Icon /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-section public-audience">
          <div className="public-audience-card">
            <div>
              <span className="public-kicker"><i /> PARA QUEM É</span>
              <h2>Uma interface para quem quer acompanhar cripto com mais método.</h2>
            </div>
            <div className="public-audience-list">
              <div><FiTrendingUp /><span><b>Quem está começando</b><small>Entenda os sinais sem depender apenas de redes sociais ou palpites.</small></span></div>
              <div><FiActivity /><span><b>Quem já acompanha o mercado</b><small>Centralize leitura, radar e risco em vez de alternar entre várias telas.</small></span></div>
              <div><FiPieChart /><span><b>Quem possui uma carteira</b><small>Visualize posições, concentração e cenários com mais clareza.</small></span></div>
            </div>
          </div>
        </section>

        <section className="public-section public-blog-preview">
          <div className="public-section-head split">
            <div>
              <span className="public-kicker"><i /> KRYVION LAB</span>
              <h2>Aprenda a ler o <em>mercado cripto.</em></h2>
            </div>
            <a href="/blog">Ver todos os artigos <FiArrowRight /></a>
          </div>
          <div className="public-article-grid compact">
            {blogArticles.slice(0, 3).map((article) => <ArticleCard article={article} key={article.slug} />)}
          </div>
        </section>

        <section className="public-section public-faq">
          <div className="public-section-head left">
            <span className="public-kicker"><i /> PERGUNTAS FREQUENTES</span>
            <h2>O essencial antes de começar.</h2>
          </div>
          <div className="public-faq-grid">
            <details><summary>A Kryvion é uma corretora de criptomoedas?</summary><p>Não. A Kryvion é uma plataforma de inteligência, acompanhamento e gestão de risco. Ela não executa ordens automaticamente e não promete rentabilidade.</p></details>
            <details><summary>A conta da Kryvion é gratuita?</summary><p>Sim. Você pode criar uma conta gratuita para acessar os recursos disponíveis da plataforma. O acesso com Google usa a Conta Peter Tecnet e cria o usuário automaticamente quando o e-mail ainda não existe.</p></details>
            <details><summary>A Kryvion diz qual criptomoeda vai subir?</summary><p>Não. A plataforma organiza dados, scores, tendências e risco para apoiar análise. Criptoativos são voláteis e nenhum indicador consegue garantir resultado futuro.</p></details>
            <details><summary>Consigo acompanhar minha carteira?</summary><p>Sim. A área de portfólio permite organizar posições e acompanhar valor, exposição e métricas relacionadas ao risco da carteira.</p></details>
            <details><summary>Os dados do mercado são atualizados?</summary><p>A Kryvion consulta dados de mercado periodicamente e informa no painel quando a fonte está atualizada, em cache ou indisponível, evitando apresentar dados sintéticos como se fossem atuais.</p></details>
          </div>
        </section>

        <section className="public-cta">
          <div className="public-cta-mark"><KryvionMark /></div>
          <div><span>COMECE COM UMA CONTA GRATUITA</span><h2>Troque o achismo por contexto.</h2><p>Abra a Kryvion, acompanhe o mercado e construa seu próprio processo de análise e risco.</p></div>
          <a className="public-primary" href="/entrar">Começar agora <FiArrowRight /></a>
        </section>
      </main>

      <PublicFooter />
      <PeterAccountGateway />
    </div>
  );
}

function ArticleCard({ article }) {
  return (
    <article className="public-article-card">
      <div className="public-article-meta"><span>{article.category}</span><small><FiClock /> {article.readingTime}</small></div>
      <h3><a href={`/blog/${article.slug}`}>{article.title}</a></h3>
      <p>{article.excerpt}</p>
      <a className="public-read-more" href={`/blog/${article.slug}`}>Ler artigo <FiArrowRight /></a>
    </article>
  );
}

function BlogIndex() {
  const description = 'Kryvion Lab: artigos sobre Bitcoin, criptomoedas, análise técnica, RSI, dominância do BTC, portfólio e gestão de risco no mercado cripto.';
  const schema = {
    '@context': 'https://schema.org', '@type': 'Blog', name: 'Kryvion Lab', url: `${SITE_URL}/blog`, description, inLanguage: 'pt-BR',
    publisher: { '@type': 'Organization', name: 'Peter Tecnet', url: 'https://petertecnet.com.br' },
    blogPost: blogArticles.map((article) => ({ '@type': 'BlogPosting', headline: article.title, url: `${SITE_URL}/blog/${article.slug}`, datePublished: article.datePublished })),
  };

  return (
    <div className="public-site public-blog-page">
      <Seo title="Kryvion Lab | Bitcoin, Criptomoedas, Análise e Gestão de Risco" description={description} path="/blog" schemas={[schema]} />
      <PublicHeader />
      <main className="public-main">
        <section className="public-blog-hero">
          <span className="public-kicker"><i /> KRYVION LAB</span>
          <h1>Cripto sem ruído: <em>análise, contexto e risco.</em></h1>
          <p>Conteúdo educativo para quem pesquisa Bitcoin, criptomoedas, indicadores e estratégias e quer entender o raciocínio por trás dos números.</p>
        </section>
        <section className="public-section public-blog-list">
          <div className="public-article-grid">
            {blogArticles.map((article) => <ArticleCard article={article} key={article.slug} />)}
          </div>
        </section>
        <section className="public-cta compact-cta">
          <div><span>LEVE A TEORIA PARA O PAINEL</span><h2>Crie sua conta gratuita na Kryvion.</h2><p>Use os conceitos dos artigos para construir uma leitura mais organizada do mercado.</p></div>
          <a className="public-primary" href="/entrar">Criar conta grátis <FiArrowRight /></a>
        </section>
      </main>
      <PublicFooter />
      <PeterAccountGateway />
    </div>
  );
}

function ArticlePage({ article }) {
  const path = `/blog/${article.slug}`;
  const schemas = [
    {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: article.title, description: article.description,
      datePublished: article.datePublished, dateModified: article.dateModified, mainEntityOfPage: `${SITE_URL}${path}`,
      author: { '@type': 'Organization', name: 'Kryvion Lab', url: `${SITE_URL}/blog` },
      publisher: { '@type': 'Organization', name: 'Peter Tecnet', url: 'https://petertecnet.com.br' },
      keywords: article.keywords.join(', '), inLanguage: 'pt-BR', articleSection: article.category,
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Kryvion', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: article.title, item: `${SITE_URL}${path}` },
      ],
    },
  ];
  const related = blogArticles.filter((candidate) => candidate.slug !== article.slug).slice(0, 3);

  return (
    <div className="public-site public-article-page">
      <Seo title={`${article.title} | Kryvion`} description={article.description} path={path} type="article" schemas={schemas} />
      <PublicHeader />
      <main className="public-main">
        <article className="public-article-shell">
          <nav className="public-breadcrumb" aria-label="Breadcrumb"><a href="/">Kryvion</a><FiChevronRight/><a href="/blog">Blog</a><FiChevronRight/><span>{article.category}</span></nav>
          <header className="public-article-head">
            <span className="public-kicker"><i /> {article.category.toUpperCase()}</span>
            <h1>{article.title}</h1>
            <p>{article.excerpt}</p>
            <div className="public-article-byline"><span>Kryvion Lab</span><span><FiClock /> {article.readingTime} de leitura</span><time dateTime={article.datePublished}>4 de setembro de 2026</time></div>
          </header>
          <div className="public-editorial-note"><FiShield /><p><b>Conteúdo educativo.</b> Este artigo não é recomendação de investimento. Criptoativos têm alta volatilidade e podem gerar perdas.</p></div>
          <div className="public-article-content">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
          </div>
          <div className="public-article-conclusion">
            <span>PRÓXIMO PASSO</span><h2>Transforme leitura em processo.</h2><p>Na Kryvion você reúne mercado, radar, portfólio, simulação e gestão de risco em uma interface única.</p><a className="public-primary" href="/entrar">Criar conta gratuita <FiArrowRight /></a>
          </div>
        </article>
        <section className="public-section public-related">
          <div className="public-section-head split"><h2>Continue aprendendo</h2><a href="/blog">Todos os artigos <FiArrowRight /></a></div>
          <div className="public-article-grid compact">{related.map((item) => <ArticleCard article={item} key={item.slug} />)}</div>
        </section>
      </main>
      <PublicFooter />
      <PeterAccountGateway />
    </div>
  );
}

function NotFoundArticle() {
  return (
    <div className="public-site">
      <Seo title="Artigo não encontrado | Kryvion" description="O artigo solicitado não foi encontrado no Kryvion Lab." path={window.location.pathname} schemas={[]} />
      <PublicHeader />
      <main className="public-main"><section className="public-blog-hero"><span className="public-kicker"><i /> KRYVION LAB</span><h1>Este artigo não foi encontrado.</h1><p>Explore os conteúdos disponíveis sobre Bitcoin, criptomoedas, indicadores e gestão de risco.</p><a className="public-primary" href="/blog">Ir para o blog <FiArrowRight /></a></section></main>
      <PublicFooter />
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div><Brand /><p>Inteligência de mercado e gestão de risco para ativos digitais.</p></div>
      <div><b>Kryvion</b><a href="/#recursos">Recursos</a><a href="/#como-funciona">Como funciona</a><a href="/blog">Kryvion Lab</a></div>
      <div><b>Conta</b><a href="/entrar">Entrar</a><a href="/entrar">Criar conta gratuita</a><a href="https://petertecnet.com.br">Peter Tecnet</a></div>
      <div className="public-footer-legal"><span>© 2026 Peter Tecnet · Kryvion</span><small>Ferramenta de apoio à análise. Não constitui recomendação de investimento e não garante resultados.</small></div>
    </footer>
  );
}

export default function PublicSite() {
  const cleanPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (cleanPath === '/blog') return <BlogIndex />;
  if (cleanPath.startsWith('/blog/')) {
    const slug = decodeURIComponent(cleanPath.slice('/blog/'.length));
    const article = findArticle(slug);
    return article ? <ArticlePage article={article} /> : <NotFoundArticle />;
  }
  return <Landing />;
}
