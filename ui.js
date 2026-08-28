// 目的：画面の表示・タブ切り替え

// --- 画面の切り替え処理 ---
function showScreen(screenName) {
    // 1. 全ての画面を一旦隠す
    document.getElementById('sectionTop').classList.add('hidden');
    document.getElementById('sectionSearch').classList.add('hidden');
    document.getElementById('sectionArena').classList.add('hidden');

    // 2. 指定された画面の hidden（隠す設定）を外して表示する
    if (screenName === 'top') {
        document.getElementById('sectionTop').classList.remove('hidden');
    } else if (screenName === 'search') {
        document.getElementById('sectionSearch').classList.remove('hidden');
    } else if (screenName === 'arena') {
        document.getElementById('sectionArena').classList.remove('hidden');
    }
}

// --- 報酬リスト表示処理（画像化に向けたレイアウト） ---
function displayArenaList() {
    const listDiv = document.getElementById('arenaList');
    if (dungeonData.length === 0) {
        listDiv.innerHTML = "データを読み込み中か、データが存在しません。";
        return;
    }

    let html = "";
    dungeonData.forEach(arena => {
        let materialsHtml = '<div class="materials-container">';
        arena.rewards.forEach(reward => {
            materialsHtml += `<div class="material-badge">${reward}</div>`;
        });
        materialsHtml += '</div>';

        html += `<div class="item">
                    <div class="item-title">${arena.name} <span class="stamina-badge">スタミナ: ${arena.stamina}</span></div>
                    ${materialsHtml}
                 </div>`;
    });

    listDiv.innerHTML = html;
}