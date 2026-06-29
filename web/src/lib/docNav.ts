export type Lang = 'en' | 'zh';
export type DocKey = 'home' | 'methodology' | 'dataFormat' | 'api' | 'faq';

export interface DocMeta {
  href: string;
  /** Short lowercase label for breadcrumbs and related-card kickers. */
  label: string;
  /** One-line description shown on related-page cards. */
  cardTitle: string;
}

/**
 * Single source of truth for cross-links between the content pages, so
 * breadcrumbs and related-page cards never drift apart across languages.
 */
export function docNav(lang: Lang): Record<DocKey, DocMeta> {
  const isEn = lang === 'en';
  const base = isEn ? '' : '/zh';
  return {
    home: {
      href: isEn ? '/' : '/zh/',
      label: isEn ? 'dataset' : '数据集',
      cardTitle: isEn ? 'Live index & downloads' : '实时指标与下载',
    },
    methodology: {
      href: `${base}/methodology/`,
      label: isEn ? 'methodology' : '方法论',
      cardTitle: isEn ? 'How every value is computed' : '每个数值如何计算',
    },
    dataFormat: {
      href: `${base}/data-format/`,
      label: isEn ? 'data format' : '数据格式',
      cardTitle: isEn ? 'JSON & CSV field reference' : 'JSON 与 CSV 字段说明',
    },
    api: {
      href: `${base}/api/`,
      label: isEn ? 'api' : 'API',
      cardTitle: isEn ? 'Endpoints, CORS & examples' : '接口、CORS 与示例',
    },
    faq: {
      href: `${base}/faq/`,
      label: isEn ? 'faq' : '常见问题',
      cardTitle: isEn ? 'Common questions, answered' : '常见问题解答',
    },
  };
}
