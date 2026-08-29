let dungeonData = [];

window.onload = async function() {
    await loadExcel();
    if (typeof displayArenaList === 'function') displayArenaList();
};

async function loadExcel() {
    try {
        const response = await fetch('dangeon.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // 1枚目のシート（ダンジョンデータ）
        const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet1);
        
        // 2枚目のシート（図鑑データ）
        let idMap = {};
        if (workbook.SheetNames.length > 1) {
            const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
            const idData = XLSX.utils.sheet_to_json(sheet2);
            idData.forEach(row => {
                // ★ A列「図鑑番号」、B列「素材名」として読み込み
                const bookId = row['図鑑番号'];
                const materialName = row['素材名'];
                
                if (materialName && bookId) {
                    idMap[String(materialName).trim()] = String(bookId).trim();
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
    const knownColumns = ['ステージ', 'ステージ名', 'ダンジョン', 'ダンジョン名', 'スタミナ', 'バトル数', 'ボス・部位破壊', '確定ドロップ', '確率ドロップ', '確定ランダムドロップ', '確率ランダムドロップ', '注意書き'];

    data.forEach(row => {
        const series = row['ステージ'] || row['ステージ名'] || 'その他';
        const name = row['ダンジョン'] || row['ダンジョン名'] || '不明';
        const stamina = row['スタミナ'] || '';
        const battles = row['バトル数'] || '';
        const warning = row['注意書き'] ? String(row['注意書き']).trim() : '';

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

        result.push({ series, name, stamina, battles, remarks, drops, allRewards, warning });
    });
    return result;
}