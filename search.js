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
                const locationStr = `${dungeon.series} / ${dungeon.name}`;
                if (!foundMap[reward].includes(locationStr)) {
                    foundMap[reward].push(locationStr);
                }
            }
        });
    });

    const itemNames = Object.keys(foundMap);

    if (itemNames.length > 0) {
        let html = "";
        itemNames.forEach(name => {
            html += `<div class="item">
                        <div class="item-title">
                            <div class="material-badge" title="${name}">
                                <!-- ★検索結果も同様に変更 -->
                                <img src="images/${name}.png" alt="${name}" 
                                     onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                <span class="fallback-text" style="display:none;">${name}</span>
                            </div>
                        </div>
                        <div style="margin-top: 8px;">📍 ドロップ場所:<br> ${foundMap[name].join('<br> ')}</div>
                     </div>`;
        });
        resultDiv.innerHTML = html;
    } else {
        resultDiv.innerHTML = "該当する素材は見つかりませんでした。";
    }
}