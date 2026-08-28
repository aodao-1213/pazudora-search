// 目的：検索機能

// 素材検索の処理
function searchMaterial() {
    const query = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');

    if (query === "") {
        resultDiv.innerHTML = "検索キーワードを入力してください。";
        return;
    }

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
                        <div class="item-title"><span class="material-badge">${name}</span></div>
                        <div style="margin-top: 8px;">📍 ドロップ場所: ${foundMap[name].join('、 ')}</div>
                     </div>`;
        });
        resultDiv.innerHTML = html;
    } else {
        resultDiv.innerHTML = "該当する素材は見つかりませんでした。";
    }
}