let dungeonData = [];
let announcementData = [];
let globalIdMap = {};
let maintenanceData = [];

// メンテ期間・お知らせは管理画面から書き換える JSON ファイルで管理する
// （Excel の「お知らせ」「メンテ期間」シートはもう読んでいない。管理画面で保存しても Excel には書き込まれない）
const SETTINGS_FILES = {
    maintenance: 'maintenance.json',
    announcements: 'announcements.json',
    backgrounds: 'backgrounds.json'
};

// 背景画像ごとの表示位置 { 画像ファイル名: { x, y, zoom } }（backgrounds.json。無ければ既定の位置で表示）
let bgFocusData = {};
const settingsLoaded = { maintenance: false, announcements: false };

// 「2026/10/20 10:00」「2026-10-20T10:00」「未定」などの文字列 → メンテ期間1件分
function toMaintenancePeriod(startStr, endStr) {
    startStr = String(startStr || '未定').trim();
    endStr = String(endStr || '未定').trim();
    const toTime = (s, fallback) => s === '未定' ? fallback : new Date(s.replace(/-/g, '/').replace('T', ' ')).getTime();
    const start = toTime(startStr, 0);
    const end = toTime(endStr, 9999999999999);
    if (isNaN(start) || isNaN(end)) return null;
    return { start, end, startStr, endStr };
}

// お知らせを新しい順（日付が新しい順、同じ日付なら後から追加した順）に並べる
function sortAnnouncements(items) {
    return items.slice().sort((a, b) => {
        const byDate = String(b.date).localeCompare(String(a.date));
        return byDate !== 0 ? byDate : (b.id - a.id);
    });
}

async function fetchJsonFile(path) {
    try {
        // 管理画面で書き換えた直後でも最新を読むよう、キャッシュを使わない
        const response = await fetch(`${path}?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
}

// maintenance.json / announcements.json を読み込む
async function loadSiteSettings() {
    const [maintenance, announcements, backgrounds] = await Promise.all([
        fetchJsonFile(SETTINGS_FILES.maintenance),
        fetchJsonFile(SETTINGS_FILES.announcements),
        fetchJsonFile(SETTINGS_FILES.backgrounds)
    ]);

    if (backgrounds && backgrounds.images && typeof backgrounds.images === 'object') {
        bgFocusData = backgrounds.images;
    }

    if (maintenance && Array.isArray(maintenance.periods)) {
        maintenanceData = maintenance.periods
            .map(p => toMaintenancePeriod(p.start, p.end))
            .filter(Boolean);
        settingsLoaded.maintenance = true;
    }

    if (announcements && Array.isArray(announcements.items)) {
        announcementData = sortAnnouncements(announcements.items
            .filter(n => n && n.title)
            .map(n => ({ id: Number(n.id), date: String(n.date || ''), title: String(n.title), body: String(n.body || '') })));
        settingsLoaded.announcements = true;
    }
}

// ====================================================
// ダンジョンのデータ読み込み
//
// 普段は data.json（dangeon.xlsx の中身をサイト用に書き出した軽いファイル）だけを読む。
// data.json は管理画面で Excel をアップロードした時に自動で作られる。
// data.json が無い時だけ、Excel 読み込み用の部品（SheetJS・約900KB）を読み込んで dangeon.xlsx を直接読む。
// ====================================================

const DATA_FILE = 'data.json';
const SHEETJS_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
let dataGeneratedAt = '';   // data.json を作った日時（データの最終更新日）

// 外部の部品（script）を必要になった時に1回だけ読み込む
const loadedScripts = {};
function loadScriptOnce(url) {
    if (!loadedScripts[url]) {
        loadedScripts[url] = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url;
            s.onload = resolve;
            s.onerror = () => reject(new Error(`${url} を読み込めませんでした`));
            document.head.appendChild(s);
        });
    }
    return loadedScripts[url];
}

// Excel のブック → サイトで使う形（data.json の中身）
// ・dungeons：1枚目のシートの各行
// ・idMap：「素材名と図鑑番号の対応」シート（素材名 → 図鑑No）
// ・exchanges：「交換」シートの各行
function compileWorkbook(workbook) {
    const getSheet = (name) => workbook.Sheets[name] || null;

    const dungeons = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const idMap = {};
    const idSheet = getSheet('素材名と図鑑番号の対応');
    if (idSheet) {
        XLSX.utils.sheet_to_json(idSheet, { header: "A", defval: "" }).forEach(row => {
            const colA = String(row.A || '').trim();
            const colB = String(row.B || '').trim();
            if (colA && colB && !colA.includes('図鑑番号') && !colB.includes('素材名')) {
                idMap[colB] = colA;
            }
        });
    }

    const exchangeSheet = getSheet('交換');
    const exchanges = exchangeSheet ? XLSX.utils.sheet_to_json(exchangeSheet) : [];

    return { generatedAt: new Date().toISOString(), dungeons, idMap, exchanges };
}

// data.json の中身をサイトのデータとして使う
function applyCompiledData(compiled) {
    globalIdMap = compiled.idMap || {};
    dungeonData = parseExcelData(compiled.dungeons || [], globalIdMap);

    // 「交換」シートの内容を、対応するダンジョンにくっつける
    const exchangeMap = parseExchangeData(compiled.exchanges || []);
    dungeonData.forEach(d => {
        d.exchanges = exchangeMap[d.name] || [];
    });
    dataGeneratedAt = compiled.generatedAt || '';
}

// サイトのデータを読み込む（data.json → 無ければ dangeon.xlsx）
async function loadSiteData() {
    const compiled = await fetchJsonFile(DATA_FILE);
    if (compiled && Array.isArray(compiled.dungeons)) {
        applyCompiledData(compiled);
        return;
    }
    await loadExcel();
}

// dangeon.xlsx を直接読む（data.json がまだ無い時の予備）
async function loadExcel() {
    try {
        await loadScriptOnce(SHEETJS_URL);
        // ブラウザのキャッシュ（古い記憶）を無視して常に最新のエクセルを読み込む
        const response = await fetch('dangeon.xlsx?t=' + new Date().getTime());
        const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' });
        applyCompiledData(compileWorkbook(workbook));
        // この場合の日時は「今読んだ時刻」でデータの更新日ではないので、更新日は出さない
        dataGeneratedAt = '';
    } catch (error) {
        console.error('Excelの読み込みに失敗:', error);
        document.getElementById('arenaList').innerHTML = "データの読み込みに失敗しました。";
    }
}

// 「交換」シート → { ダンジョン名: [交換先ごとのデータ, ...] }
// 列：交換先 / ダンジョン / 必要周回数 / 必要モンスター / 条件
function parseExchangeData(rows) {
    const map = {};
    rows.forEach(row => {
        const target = row['交換先'] ? String(row['交換先']).trim() : '';
        const dungeon = row['ダンジョン'] ? String(row['ダンジョン']).trim() : '';
        if (!target || !dungeon) return;

        // 「約550周,(※〜)」や「約65周(※〜)」のように、「,」か「(※」から後ろは補足として分けて表示する
        const rawRate = row['必要周回数'] ? String(row['必要周回数']).trim() : '';
        const splitCandidates = [rawRate.indexOf(','), rawRate.indexOf('(※')].filter(i => i >= 0);
        const splitIndex = splitCandidates.length > 0 ? Math.min(...splitCandidates) : -1;
        const rate = splitIndex >= 0 ? rawRate.slice(0, splitIndex).trim() : rawRate;
        let rateNote = splitIndex >= 0 ? rawRate.slice(splitIndex).replace(/^,/, '').trim() : '';
        if (rateNote.startsWith('(') && rateNote.endsWith(')')) rateNote = rateNote.slice(1, -1);

        // 必要モンスターはドロップ列と同じ「名前(×数)」の書き方なので parseCategory を使い回す
        const materials = parseCategory(row['必要モンスター'], false)
            .map(g => ({ name: g.items[0], count: g.note }));

        const condition = row['条件'] ? String(row['条件']).trim() : 'すべて';

        if (!map[dungeon]) map[dungeon] = [];
        map[dungeon].push({ target, rate, rateNote, materials, condition });
    });
    return map;
}

function parseCategory(text, isRandom) {
    if (!text) return [];
    let items = text.toString().split(',');
    let groups = [];
    let currentGroup = { items: [], note: "" };

    for (let item of items) {
        item = item.trim();
        if (!item) continue;
        
        let match = item.match(/^(.*?)(?:\((.*)\))?$/);
        let name = match[1].trim();
        let note = match[2] ? match[2].trim() : "";

        if (isRandom) {
            currentGroup.items.push(name);
            if (note) {
                currentGroup.note = note;
                groups.push(currentGroup);
                currentGroup = { items: [], note: "" };
            }
        } else {
            groups.push({ items: [name], note: note });
        }
    }
    if (isRandom && currentGroup.items.length > 0) {
        groups.push(currentGroup);
    }
    return groups;
}

// 「追加日」列の値 → その日の0時の日時（ミリ秒）。読めない時は 0
// ・Excelの日付セル（数値。1900/1/0 からの日数）と、「2026/10/17」「2026-10-17」のような文字の両方に対応
function parseExcelDate(value) {
    if (typeof value === 'number' && value > 0) {
        const d = new Date(Math.round((value - 25569) * 86400000));
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime();
    }
    const m = String(value || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : 0;
}

function parseExcelData(data, idMap) {
    const result = [];
    const knownColumns = ['ステージ', 'ステージ名', 'ダンジョン', 'ダンジョン名', '交換可能なレート', 'ボス・部位破壊', 'ボス・乱入・部位破壊', '確定ドロップ', '確率ドロップ', '確定ランダムドロップ', '確率ランダムドロップ', '注意書き', '背景モンスター', '追加日'];

    data.forEach(row => {
        const series = row['ステージ'] || row['ステージ名'] || 'その他';
        const name = row['ダンジョン'] || row['ダンジョン名'] || '不明';
        const exchangeRate = row['交換可能なレート'] ? String(row['交換可能なレート']).trim() : '';
        const warning = row['注意書き'] ? String(row['注意書き']).trim() : '';
        // ダンジョン一覧のカード背景に使うモンスター名（または画像ファイル名）
        const bgMonster = row['背景モンスター'] ? String(row['背景モンスター']).trim() : '';
        // ダンジョンを追加した日（一定期間「NEW」を付ける）
        const addedAt = parseExcelDate(row['追加日']);

        const remarks = [];
        for (const key in row) {
            if (!knownColumns.includes(key)) {
                let val = String(row[key]).trim();
                if (!val) continue;

                val = val.replace(/,/g, ''); 
                val = val.replace(/\d+/g, match => Number(match).toLocaleString());

                if (key.includes('ポイント') || key.includes('プラス限界突破')) {
                    if (!val.startsWith('+')) val = '+' + val;
                }
                
                let displayLabel = key;
                if (key === 'ポイント') displayLabel = '+ポイント';
                if (key === 'プラス限界突破') displayLabel = '+限界突破';
                
                remarks.push({ label: displayLabel, value: val });
            }
        }

        const bossCategoryName = row['ボス・乱入・部位破壊'] ? 'ボス・乱入・部位破壊' : 'ボス・部位破壊';
        const bossCategoryData = row['ボス・乱入・部位破壊'] || row['ボス・部位破壊'];

        const drops = [
            // ボス欄は「A,B,C(ボス本体(5体からランダム1つ))」のように複数をまとめて1つの注記を付けることがあるので、ランダム扱いでまとめる
            { category: bossCategoryName, groups: parseCategory(bossCategoryData, true) },
            { category: "確定ドロップ", groups: parseCategory(row['確定ドロップ'], false) },
            { category: "確率ドロップ", groups: parseCategory(row['確率ドロップ'], false) },
            { category: "確定ランダムドロップ", groups: parseCategory(row['確定ランダムドロップ'], true) },
            { category: "確率ランダムドロップ", groups: parseCategory(row['確率ランダムドロップ'], true) }
        ];

        const allRewards = [];
        drops.forEach(d => {
            d.groups.forEach(g => {
                g.items.forEach(item => {
                    allRewards.push({ 
                        name: item, 
                        category: d.category, 
                        note: g.note,
                        id: idMap[item] || "" 
                    });
                });
            });
        });

        result.push({ series, name, remarks, exchangeRate, drops, allRewards, warning, bgMonster, addedAt });
    });
    return result;
}
