let dungeonData = [];

async function loadExcel() {
    try {
        const response = await fetch('dangeon.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet1);
        
        let idMap = {};
        if (workbook.SheetNames.length > 1) {
            const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
            const idData = XLSX.utils.sheet_to_json(sheet2, { header: "A", defval: "" });
            
            idData.forEach(row => {
                const colA = String(row.A || '').trim(); 
                const colB = String(row.B || '').trim(); 
                
                if (colA && colB && !colA.includes('図鑑番号') && !colB.includes('素材名')) {
                    idMap[colB] = colA;
                }
            });
        }
        
        dungeonData = parseExcelData(jsonData, idMap);
    } catch (error) {
        console.error('Excelの読み込みに失敗:', error);
        document.getElementById('arenaList').innerHTML = "データの読み込みに失敗しました。";
    }
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
    // ★ 「その他の効果」も除外リストに追加
    const knownColumns = ['ステージ', 'ステージ名', 'ダンジョン', 'ダンジョン名', 'スタミナ', 'バトル', 'バトル数', '交換可能なレート', 'ボス・部位破壊', '確定ドロップ', '確率ドロップ', '確定ランダムドロップ', '確率ランダムドロップ', '注意書き', '陽/陰', '超重力', '超高度', 'その他の効果'];

    data.forEach(row => {
        const series = row['ステージ'] || row['ステージ名'] || 'その他';
        const name = row['ダンジョン'] || row['ダンジョン名'] || '不明';
        const stamina = row['スタミナ'] || '';
        const battles = row['バトル'] || row['バトル数'] || '';
        const exchangeRate = row['交換可能なレート'] ? String(row['交換可能なレート']).trim() : '';
        const warning = row['注意書き'] ? String(row['注意書き']).trim() : '';

        const yinYang = row['陽/陰'] ? String(row['陽/陰']).trim() : '';
        let gravity = row['超重力'] ? String(row['超重力']).trim() : '';
        let altitude = row['超高度'] ? String(row['超高度']).trim() : '';
        
        if (gravity.match(/^\d+\/\d+$/)) gravity = gravity.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        if (altitude.match(/^\d+\/\d+$/)) altitude = altitude.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        // ★ 「その他の効果」を【効果名】と詳細説明に分割する
        const rawOtherEffects = row['その他の効果'] ? String(row['その他の効果']).trim() : '';
        let effectName = '';
        let effectDetail = '';
        if (rawOtherEffects) {
            // 例: "【灼熱】,HP10%減少..." -> 【灼熱】と詳細に分ける
            const match = rawOtherEffects.match(/^(【.*?】)(?:[,、]\s*(.*))?$/);
            if (match) {
                effectName = match[1];
                effectDetail = match[2] || '';
            } else {
                // 【】がついていない場合はそのまま名前にする
                effectName = rawOtherEffects;
            }
        }

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

        const drops = [
            { category: "ボス・部位破壊", groups: parseCategory(row['ボス・部位破壊'], false) },
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

        // 分割した effectName と effectDetail を追加
        result.push({ series, name, stamina, battles, remarks, exchangeRate, drops, allRewards, warning, yinYang, gravity, altitude, effectName, effectDetail });
    });
    return result;
}