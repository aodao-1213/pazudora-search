let dungeonData = [];

window.onload = async function() {
    await loadCSV();
    if (typeof displayArenaList === 'function') {
        displayArenaList();
    }
};

async function loadCSV() {
    try {
        const response = await fetch('dangeon.csv');
        const buffer = await response.arrayBuffer();
        
        let text = new TextDecoder('utf-8').decode(buffer);
        if (text.includes('\uFFFD')) {
            text = new TextDecoder('shift_jis').decode(buffer);
        }
        
        dungeonData = parseCSV(text);
    } catch (error) {
        console.error('CSVの読み込みに失敗:', error);
        document.getElementById('arenaList').innerHTML = "データの読み込みに失敗しました。";
    }
}

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

        // ★追加：CSVの1行目が「見出し（ヘッダー）」だった場合、無視してスキップする
        if (row[0] === 'シリーズ' || row[0] === 'シリーズ名' || row[1] === 'ダンジョン名' || row[1] === 'スタミナ') {
            continue;
        }

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

            // 素材名の中にある不要な記号や空白を徹底的に消去
            rawItems = rawItems.replace(/^"|"$/g, '');
            const rewards = rawItems.split(',').map(item => item.trim()).filter(item => item.length > 0);

            result.push({ series, name, stamina, rewards });
        }
    }
    return result;
}