/**
 * Simplified → Traditional (Taiwan usage) conversion for this site's copy.
 *
 * Hand-maintained, no external dictionary. Two layers, applied in a single
 * left-to-right pass so an output is never re-converted:
 *   1. PHRASES — terminology that differs between zh-CN and zh-TW usage
 *      (数据→資料, 软件→軟體 …) plus disambiguations for characters whose
 *      Traditional form depends on the word (行/列 as row/column, 划算 …).
 *      Longest match wins.
 *   2. CHARS — one-to-one character map for everything else.
 *
 * Only characters that actually occur in the site's Simplified copy are
 * mapped; when you add copy that uses a new Simplified character, add it
 * here. ASCII, numbers, markup and URLs pass through untouched.
 */

const PHRASES: Array<[string, string]> = [
  // terminology (zh-TW usage)
  ['数据库', '資料庫'],
  ['不变量', '不變量'],
  ['窗口类型', '視窗類型'],
  ['只读', '唯讀'],
  ['获取', '取得'],
  ['调用', '呼叫'],
  ['实现', '實作'],
  ['数据', '資料'],
  ['字段', '欄位'],
  ['软件', '軟體'],
  ['硬件', '硬體'],
  ['源码', '原始碼'],
  ['代码', '程式碼'],
  ['程序', '程式'],
  ['文档', '文件'],
  ['文件', '檔案'],
  ['网络', '網路'],
  ['信息', '資訊'],
  ['用户', '使用者'],
  ['默认', '預設'],
  ['支持', '支援'],
  ['服务器', '伺服器'],
  ['通过', '透過'],
  ['点击', '點擊'],
  ['复现', '重現'],
  ['复杂', '複雜'],
  ['重复', '重複'],
  ['复制', '複製'],
  ['缓存', '快取'],
  ['接口', '介面'],
  ['界面', '介面'],
  ['命令行', '命令列'],
  ['命令', '指令'],
  ['跨域', '跨來源'],
  ['仓库', '儲存庫'],
  ['返回', '回傳'],
  ['窗口', '視窗'],
  ['数组', '陣列'],
  ['对象', '物件'],
  ['类型', '型別'],
  ['标量', '純量'],
  ['插值', '內插'],
  ['分辨率', '解析度'],
  ['时间戳', '時間戳記'],
  ['语义', '語意'],
  ['响应', '回應'],
  ['示例', '範例'],
  ['概览', '總覽'],
  ['表头', '標頭'],
  ['仪表盘', '儀表板'],
  ['手工', '手動'],
  ['校验', '驗證'],
  ['许可', '授權'],
  ['信号', '訊號'],
  ['站点', '網站'],
  ['选中', '選取'],
  ['剪贴板', '剪貼簿'],
  ['访问', '造訪'],
  ['链接', '連結'],
  ['实时', '即時'],
  ['密钥', '金鑰'],
  ['缩进', '縮排'],
  ['日历', '日曆'],
  ['运行', '執行'],
  ['设置', '設定'],
  ['配置', '設定'],
  ['加载中', '載入中'],
  ['加载', '載入'],
  ['搜索', '搜尋'],
  ['注释', '註解'],
  ['调试', '除錯'],
  ['质量', '品質'],
  ['性能', '效能'],
  ['兼容', '相容'],
  ['登录', '登入'],
  ['交互', '互動'],
  ['列表', '清單'],
  ['优化', '最佳化'],
  ['视频', '影片'],
  ['智能', '智慧'],
  ['项目', '專案'],
  ['函数', '函式'],
  ['变量', '變數'],
  ['字符串', '字串'],
  ['字符', '字元'],
  ['布尔', '布林'],
  ['内存', '記憶體'],
  ['在线', '線上'],
  ['离线', '離線'],
  ['占比', '佔比'],
  ['占主导', '佔主導'],
  ['划算', '划算'],
  // row / column: TW uses 列 for rows and 欄 for columns
  ['行列', '列與欄'],
  ['逐行', '逐列'],
  ['行数', '列數'],
  ['行按', '列按'],
  ['行尾换行', '結尾換行'],
  ['按行', '逐列'],
  ['该行', '該列'],
  ['滚动行', '滾動列'],
  ['分位行', '分位列'],
  ['相同的行列', '相同的列與欄'],
  ['相同的行', '相同的列'],
];

const CHARS: Record<string, string> = Object.fromEntries(
  (
    '与與严嚴个個为為么麼义義买買于於产產仅僅从從仓倉仪儀们們价價会會余餘关關内內决決击擊则則创創动動区區单單卖賣历歷压壓参參发發变變号號后後吗嗎响響围圍图圖场場块塊处處复復够夠头頭实實对對导導属屬币幣带帶并並库庫应應开開异異张張强強当當录錄径徑态態扩擴报報拟擬择擇换換据據敛斂数數断斷无無旧舊时時显顯暂暫机機权權条條来來构構标標样樣档檔检檢槛檻没沒测測浏瀏滚滾滤濾点點热熱现現盘盤码碼确確离離种種积積称稱稳穩简簡类類约約纯純线線组組细細终終经經结結给給绝絕续續缓緩缩縮范範获獲虫蟲见見观觀规規视視览覽计計认認让讓议議许許论論设設访訪证證询詢该該语語误誤说說请請读讀调調谨謹贴貼费費资資赖賴轨軌转轉轮輪轴軸载載输輸迁遷过過运運还還这這进進连連迟遲迹跡选選邻鄰采採里裡钟鐘钥鑰链鏈锚錨长長门門闭閉问問间間阈閾静靜页頁预預频頻题題额額验驗龄齡两兩占佔'
      .match(/.{2}/gu) ?? []
  ).map((pair) => [pair[0]!, pair[1]!]),
);

const byFirstChar = new Map<string, Array<[string, string]>>();
for (const entry of PHRASES) {
  const first = entry[0][0]!;
  const list = byFirstChar.get(first) ?? [];
  list.push(entry);
  byFirstChar.set(first, list);
}
for (const list of byFirstChar.values()) {
  list.sort((a, b) => b[0].length - a[0].length);
}

/** "3,312 行" / "199 行为" → rows are 列 in zh-TW. */
const ROW_COUNT = /(\d[\d,]*) 行/g;

export function hant(input: string): string {
  const text = input.replace(ROW_COUNT, '$1 列');
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    const candidates = byFirstChar.get(ch);
    let matched = false;
    if (candidates) {
      for (const [from, to] of candidates) {
        if (text.startsWith(from, i)) {
          out += to;
          i += from.length;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      out += CHARS[ch] ?? ch;
      i += 1;
    }
  }
  return out;
}

/**
 * Convert every string inside a value: strings directly, arrays/objects
 * recursively, functions by converting their return value. Non-string leaves
 * are returned as-is. Used to derive the zh-Hant copy from the zh-Hans copy.
 */
export function hantDeep<T>(value: T): T {
  if (typeof value === 'string') return hant(value) as T;
  if (typeof value === 'function') {
    const fn = value as unknown as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) => hantDeep(fn(...args))) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => hantDeep(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = hantDeep(v);
    }
    return out as T;
  }
  return value;
}

/** Identity for en / zh-Hans, conversion for zh-Hant. */
export function localize<T>(lang: string, value: T): T {
  return lang === 'zh-hant' ? hantDeep(value) : value;
}
