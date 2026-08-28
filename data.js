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
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        dungeonData = parseExcelData(jsonData);
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

function parseExcelData(data) {
    const result = [];
    const knownColumns = ['ステージ', 'ステージ名', 'ダンジョン', 'ダンジョン名', 'スタミナ', 'ボス・部位破壊', '確定ドロップ', '確率ドロップ', '確定ランダムドロップ', '確率ランダムドロップ'];

    data.forEach(row => {
        const series = row['ステージ'] || row['ステージ名'] || 'その他';
        const name = row['ダンジョン'] || row['ダンジョン名'] || '不明';
        const stamina = row['スタミナ'] || '';

        const remarks = [];
        for (const key in row) {
            if (!knownColumns.includes(key)) {
                let val = String(row[key]).trim();
                if (!val) continue;

                // ★ 自動カンマ付与処理
                // 万が一エクセルで既にカンマを入れていても二重にならないよう一旦消す
                val = val.replace(/,/g, ''); 
                // 数字の並びを見つけて、自動で3桁区切りのカンマをつける
                val = val.replace(/\d+/g, match => Number(match).toLocaleString());

                // 「ポイント」や「プラス限界突破」が含まれる列名なら、数値の前に + をつける
                if (key.includes('ポイント') || key.includes('プラス限界突破')) {
                    if (!val.startsWith('+')) val = '+' + val;
                }
                
                remarks.push({ label: key, value: val });
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
                    allRewards.push({ name: item, category: d.category, note: g.note });
                });
            });
        });

        result.push({ series, name, stamina, remarks, drops, allRewards });
    });
    return result;
}