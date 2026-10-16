let dungeonData = [];
let announcementData = []; 
let globalIdMap = {}; 
let maintenanceData = []; 

function formatExcelDate(dateVal) {
    if (!dateVal) return '';
    if (!isNaN(dateVal) && typeof dateVal === 'number') {
        const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        return `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }
    const str = String(dateVal).trim();
    const dateObj = new Date(str.replace(/-/g, '/'));
    if (!isNaN(dateObj.getTime())) {
        return `${dateObj.getFullYear()}/${String(dateObj.getMonth()+1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
    }
    return str; 
}

async function loadExcel() {
    try {
        // ★修正: ブラウザのキャッシュ（古い記憶）を無視して常に最新のエクセルを読み込むようにする
        const response = await fetch('dangeon.xlsx?t=' + new Date().getTime());
        const arrayBuffer = await response.arrayBuffer();
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        maintenanceData = []; // 一旦リセット

        // シートは「名前」で探す（Excel側でシートの並び順を変えても読み込みがずれないように）
        // ダンジョン一覧だけは従来どおり1枚目のシートを使う
        const getSheet = (name) => workbook.Sheets[name] || null;

        const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet1);

        let idMap = {};
        const sheet2 = getSheet('素材名と図鑑番号の対応');
        if (sheet2) {
            const idData = XLSX.utils.sheet_to_json(sheet2, { header: "A", defval: "" });
            
            idData.forEach(row => {
                const colA = String(row.A || '').trim(); 
                const colB = String(row.B || '').trim(); 
                
                if (colA && colB && !colA.includes('図鑑番号') && !colB.includes('素材名')) {
                    idMap[colB] = colA;
                }
            });
        }
        globalIdMap = idMap;

        announcementData = [];
        const noticeSheet = getSheet('お知らせ');
        if (noticeSheet) {
            const noticeData = XLSX.utils.sheet_to_json(noticeSheet, { raw: true });
            
            noticeData.forEach((row, index) => {
                const date = formatExcelDate(row['日付']);
                const title = row['アナウンス(タイトル)'] ? String(row['アナウンス(タイトル)']).trim() : '';
                const body = row['アナウンス(本文)'] ? String(row['アナウンス(本文)']).trim() : '';
                
                if (title) {
                    announcementData.push({ id: index, date, title, body });
                }
            });
            announcementData.reverse(); 
        }

        const mainteSheet = getSheet('メンテ期間');
        if (mainteSheet) {
            const mainteData = XLSX.utils.sheet_to_json(mainteSheet, { raw: false, header: "A", defval: "" });
            
            for (let i = 1; i < mainteData.length; i++) { 
                const row = mainteData[i];
                if (row.B || row.C) {
                    const startStr = String(row.B || "未定").trim();
                    const endStr = String(row.C || "未定").trim();
                    
                    const startDate = startStr === "未定" ? 0 : new Date(startStr.replace(/-/g, '/')).getTime();
                    const endDate = endStr === "未定" ? 9999999999999 : new Date(endStr.replace(/-/g, '/')).getTime();
                    
                    if (!isNaN(startDate) && !isNaN(endDate)) {
                        maintenanceData.push({ 
                            start: startDate, 
                            end: endDate,
                            startStr: startStr,
                            endStr: endStr
                        });
                    }
                }
            }
        }
        
        dungeonData = parseExcelData(jsonData, idMap);

        // 「交換」シートの内容を、対応するダンジョンにくっつける
        const exchangeSheet = getSheet('交換');
        const exchangeMap = exchangeSheet ? parseExchangeData(XLSX.utils.sheet_to_json(exchangeSheet)) : {};
        dungeonData.forEach(d => {
            d.exchanges = exchangeMap[d.name] || [];
        });
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

function parseExcelData(data, idMap) {
    const result = [];
    const knownColumns = ['ステージ', 'ステージ名', 'ダンジョン', 'ダンジョン名', '交換可能なレート', 'ボス・部位破壊', 'ボス・乱入・部位破壊', '確定ドロップ', '確率ドロップ', '確定ランダムドロップ', '確率ランダムドロップ', '注意書き', '背景モンスター'];

    data.forEach(row => {
        const series = row['ステージ'] || row['ステージ名'] || 'その他';
        const name = row['ダンジョン'] || row['ダンジョン名'] || '不明';
        const exchangeRate = row['交換可能なレート'] ? String(row['交換可能なレート']).trim() : '';
        const warning = row['注意書き'] ? String(row['注意書き']).trim() : '';
        // ダンジョン一覧のカード背景に使うモンスター名（または画像ファイル名）
        const bgMonster = row['背景モンスター'] ? String(row['背景モンスター']).trim() : '';

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

        result.push({ series, name, remarks, exchangeRate, drops, allRewards, warning, bgMonster });
    });
    return result;
}