// 全てのプログラムで共有するデータ
let dungeonData = [];

// ページ読み込み時の処理
window.onload = async function() {
    await loadCSV();
    if (typeof displayArenaList === 'function') {
        displayArenaList(); // ui.js の関数を呼び出す
    }
};

async function loadCSV() {
    try {
        // ★修正点1：新しいファイル名「dangeon_2.csv」を読み込むように変更
        const response = await fetch('dangeon_2.csv');
        const buffer = await response.arrayBuffer();
        
        let text = new TextDecoder('utf-8').decode(buffer);
        
        if (text.includes('\uFFFD')) {
            text = new TextDecoder('shift_jis').decode(buffer);
        }
        
        dungeonData = parseCSV(text);
    } catch (error) {
        console.error('CSVの読み込みに失敗しました:', error);
        document.getElementById('arenaList').innerHTML = "データの読み込みに失敗しました。";
    }
}

// CSV文字を配列データに変換する処理
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const result = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        const row = [];
        let cur = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(cur.trim());
                cur = '';
            } else {
                cur += char;
            }
        }
        row.push(cur.trim());

        // ★修正点2：3列でも4列でも自動で読み込めるように変更
        if (row.length >= 3) {
            let series = "";
            let name = "";
            let stamina = "";
            let rawItems = "";

            if (row.length >= 4) {
                series = row[0];
                name = row[1];
                stamina = row[2];
                rawItems = row[3];
            } else {
                const fullName = row[0];
                if (fullName.includes('/')) {
                    const parts = fullName.split('/');
                    series = parts[0].trim();
                    name = parts[1].trim();
                } else {
                    series = "その他";
                    name = fullName;
                }
                stamina = row[1];
                rawItems = row[2];
            }

            rawItems = rawItems.replace(/^"|"$/g, '');
            const rewards = rawItems.split(',').map(item => item.trim()).filter(item => item.length > 0);

            result.push({ series, name, stamina, rewards });
        }
    }
    return result;
}