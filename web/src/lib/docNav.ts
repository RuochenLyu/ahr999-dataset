import { hant } from './hant';

export type Lang = 'en' | 'zh' | 'zh-hant';
export type DocKey = 'home' | 'methodology' | 'dataFormat' | 'api' | 'faq';

export const LANGS: Lang[] = ['en', 'zh', 'zh-hant'];

/** URL prefix per language. */
export function langBase(lang: Lang): string {
  return lang === 'en' ? '' : lang === 'zh' ? '/zh' : '/zh-hant';
}

/** BCP 47 tag used in <html lang>, hreflang and JSON-LD. */
export function langTag(lang: Lang): 'en' | 'zh-Hans' | 'zh-Hant' {
  return lang === 'en' ? 'en' : lang === 'zh' ? 'zh-Hans' : 'zh-Hant';
}

/** Open Graph locale. */
export function ogLocale(lang: Lang): string {
  return lang === 'en' ? 'en_US' : lang === 'zh' ? 'zh_CN' : 'zh_TW';
}

const DOC_PATHS: Record<DocKey, string> = {
  home: '/',
  methodology: '/methodology/',
  dataFormat: '/data-format/',
  api: '/api/',
  faq: '/faq/',
};

/** The same document in every language, keyed by Lang. */
export function docPaths(key: DocKey): Record<Lang, string> {
  const p = DOC_PATHS[key];
  return {
    en: p,
    zh: `/zh${p}`,
    'zh-hant': `/zh-hant${p}`,
  };
}

export interface DocMeta {
  href: string;
  /** Short lowercase label for breadcrumbs and related-card kickers. */
  label: string;
  /** One-line description shown on related-page cards. */
  cardTitle: string;
  /** Title-cased label for the site header navigation. */
  navLabel: string;
}

/**
 * Single source of truth for cross-links between the content pages, so
 * breadcrumbs and related-page cards never drift apart across languages.
 * zh-Hant labels are derived from zh-Hans through the hant() converter.
 */
export function docNav(lang: Lang): Record<DocKey, DocMeta> {
  const isEn = lang === 'en';
  const zh = (s: string): string => (lang === 'zh-hant' ? hant(s) : s);
  const href = (key: DocKey): string => docPaths(key)[lang];
  return {
    home: {
      href: href('home'),
      label: isEn ? 'dataset' : zh('数据集'),
      cardTitle: isEn ? 'Live index & downloads' : zh('实时指标与下载'),
      navLabel: isEn ? 'Dataset' : zh('数据集'),
    },
    methodology: {
      href: href('methodology'),
      label: isEn ? 'methodology' : zh('方法论'),
      cardTitle: isEn ? 'How every value is computed' : zh('每个数值如何计算'),
      navLabel: isEn ? 'Methodology' : zh('方法论'),
    },
    dataFormat: {
      href: href('dataFormat'),
      label: isEn ? 'data format' : zh('数据格式'),
      cardTitle: isEn ? 'JSON & CSV field reference' : zh('JSON 与 CSV 字段说明'),
      navLabel: isEn ? 'Data format' : zh('数据格式'),
    },
    api: {
      href: href('api'),
      label: isEn ? 'api' : 'API',
      cardTitle: isEn ? 'Endpoints, CORS & examples' : zh('接口、CORS 与示例'),
      navLabel: 'API',
    },
    faq: {
      href: href('faq'),
      label: isEn ? 'faq' : zh('常见问题'),
      cardTitle: isEn ? 'Common questions, answered' : zh('常见问题解答'),
      navLabel: isEn ? 'FAQ' : zh('常见问题'),
    },
  };
}
