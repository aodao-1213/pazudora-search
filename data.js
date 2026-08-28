let dungeonData = [];

window.onload = async function() {
    await loadExcel();
    if (typeof displayArenaList === 'function') displayArenaList();
};

async function loadExcel() {
    try {
        const response = await fetch('dangeon.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        
        // Excelデータを解析
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // JSONデータに変換
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        dungeonData = parseExcelData(jsonData);
    } catch (error) {
        console.error('Excelの読み込みに失敗:', error);
        document.getElementById('arenaList').innerHTML = "データの読み込みに失敗しました。dangeon.xlsxが正しく配置されているか確認してください。";
    }
}

// ドロップ項目をグループ化して解析する関数
function parseCategory(text, isRandom) {
    if (!text) return [];
    let items = text.toString().split(',');
    let groups = [];
    let currentGroup = { items: [], note: "" };

    for (let item of items) {
        item = item.trim();
        if (!item) continue;
        
        // 名前とカッコ()の中身を分ける
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
            // ランダムではない場合、カンマ区切りはそれぞれ別グループ
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
    data.forEach(row => {
        const series = row['ステージ'] || row['ステージ名'] || 'その他';
        const name = row['ダンジョン'] || row['ダンジョン名'] || '不明';
        const stamina = row['スタミナ'] || '';

        const drops = [
            { category: "ボス・部位破壊", groups: parseCategory(row['ボス・部位破壊'], false) },
            { category: "確定ドロップ", groups: parseCategory(row['確定ドロップ'], false) },
            { category: "確率ドロップ", groups: parseCategory(row['確率ドロップ'], false) },
            { category: "確定ランダムドロップ", groups: parseCategory(row['確定ランダムドロップ'], true) },
            { category: "確率ランダムドロップ", groups: parseCategory(row['確率ランダムドロップ'], true) }
        ];

        // 検索用に全アイテムをフラット化
        const allRewards = [];
        drops.forEach(d => {
            d.groups.forEach(g => {
                g.items.forEach(item => {
                    allRewards.push({ name: item, category: d.category, note: g.note });
                });
            });
        });

        result.push({ series, name, stamina, drops, allRewards });
    });
    return result;
}