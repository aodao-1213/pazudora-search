let dungeonData = [];

// ページ読み込み時にCSVデータを自動取得
window.onload = async function() {
    await loadCSV();
    displayArenaList();
};

// 1. CSVファイルを読み込んでパース（解析）する関数
async function loadCSV() {
    try {
        const response = await fetch('dangeon.csv');
        const text = await response.text();
        dungeonData = parseCSV(text);
    } catch (error) {
        console.error('CSVの読み込みに失敗しました:', error);
    }
}

// CSV文字を判定して配列データに変換する処理
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

        if (row.length >= 3) {
            const name = row[0];
            const stamina = row[1];
            // クォーテーションを外し、カンマ区切りで素材リストを作る
            const rawItems = row[2].replace(/^"|"$/g, '');
            const rewards = rawItems.split(',').map(item => item.trim()).filter(item => item.length > 0);

            result.push({ name, stamina, rewards });
        }
    }
    return result;
}

// 2. タブ切り替え処理
function switchTab(tabName) {
    document.getElementById('sectionSearch').classList.add('hidden');
    document.getElementById('sectionArena').classList.add('hidden');
    document.getElementById('btnSearch').classList.remove('active');
    document.getElementById('btnArena').classList.remove('active');

    if (tabName === 'search') {
        document.getElementById('sectionSearch').classList.remove('hidden');
        document.getElementById('btnSearch').classList.add('active');
    } else if (tabName === 'arena') {
        document.getElementById('sectionArena').classList.remove('hidden');
        document.getElementById('btnArena').classList.add('active');
    }
}

// 3. 素材検索の処理
function searchMaterial() {
    const query = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');

    if (query === "") {
        resultDiv.innerHTML = "検索キーワードを入力してください。";
        return;
    }

    // 入力キーワードが含まれる素材と、そのドロップ場所をまとめる
    const foundMap = {};

    dungeonData.forEach(dungeon => {
        dungeon.rewards.forEach(reward => {
            if (reward.includes(query)) {
                if (!foundMap[reward]) {
                    foundMap[reward] = [];
                }
                if (!foundMap[reward].includes(dungeon.name)) {
                    foundMap[reward].push(dungeon.name);
                }
            }
        });
    });

    const itemNames = Object.keys(foundMap);

    if (itemNames.length > 0) {
        let html = "";
        itemNames.forEach(name => {
            html += `<div class="item">
                        <div class="item-title">${name}</div>
                        <div>📍 ドロップ場所: ${foundMap[name].join('、 ')}</div>
                     </div>`;
        });
        resultDiv.innerHTML = html;
    } else {
        resultDiv.innerHTML = "該当する素材は見つかりませんでした。";
    }
}

// 4. 報酬リスト表示処理
function displayArenaList() {
    const listDiv = document.getElementById('arenaList');
    if (dungeonData.length === 0) {
        listDiv.innerHTML = "データを読み込み中か、データが存在しません。";
        return;
    }

    let html = "";
    dungeonData.forEach(arena => {
        html += `<div class="item">
                    <div class="item-title">${arena.name} <span class="stamina-badge">スタミナ: ${arena.stamina}</span></div>
                    <div>🎁 ドロップ報酬: ${arena.rewards.join('、 ')}</div>
                 </div>`;
    });

    listDiv.innerHTML = html;
}