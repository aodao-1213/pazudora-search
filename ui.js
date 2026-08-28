// 目的：画面の表示・タブ切り替え

// タブ切り替え処理
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

// 報酬リスト表示処理（画像化に向けたレイアウト変更）
function displayArenaList() {
    const listDiv = document.getElementById('arenaList');
    if (dungeonData.length === 0) {
        listDiv.innerHTML = "データを読み込み中か、データが存在しません。";
        return;
    }

    let html = "";
    dungeonData.forEach(arena => {
        // 素材を1つずつバッジ枠（将来の画像を入れる場所）に変換
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