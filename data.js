// 目的：データの読み込みと文字化け解消

//========================================================================================================================================================================

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
        const response = await fetch('dangeon.csv');
        const buffer = await response.arrayBuffer();
        
        // 1. まず標準のUTF-8で解釈してみる
        let text = new TextDecoder('utf-8').decode(buffer);
        
        // 2. もし文字化け記号（\uFFFD は「」のプログラム上の表記）が含まれていたら、Shift_JISで解釈し直す
        // （※前回はここが空っぽだったため、データが壊れて消えてしまっていました）
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

        // 3列以上（ダンジョン名、スタミナ、報酬）ある場合のみデータとして追加
        if (row.length >= 3) {
            const name = row[0];
            const stamina = row[1];
            const rawItems = row[2].replace(/^"|"$/g, '');
            const rewards = rawItems.split(',').map(item => item.trim()).filter(item => item.length > 0);

            result.push({ name, stamina, rewards });
        }
    }
    return result;
}