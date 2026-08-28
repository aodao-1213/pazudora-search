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

        // ★4列（シリーズ, ダンジョン, スタミナ, 報酬）に対応
        if (row.length >= 4) {
            const series = row[0];
            const name = row[1];
            const stamina = row[2];
            const rawItems = row[3].replace(/^"|"$/g, '');
            const rewards = rawItems.split(',').map(item => item.trim()).filter(item => item.length > 0);

            result.push({ series, name, stamina, rewards });
        }
    }
    return result;
}