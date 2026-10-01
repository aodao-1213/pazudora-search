const HISTORY_KEY = 'padSearchHistory';
const MAX_HISTORY = 20; // 保存する最大履歴数

// 履歴を取得する
function getSearchHistory() {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
}

// 新しいワードを履歴に保存する
function saveSearchHistory(keyword) {
    if (!keyword) return;
    let history = getSearchHistory();
    
    // 重複するワードがあれば削除して、最新のものを一番上(先頭)にする
    history = history.filter(item => item !== keyword);
    history.unshift(keyword);
    
    // 最大数を超えたら古いものから削除
    if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
    }
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    updateSearchHistoryUI();
}

// 検索ボックス下のサジェスト（プルダウン）を更新する
function updateSearchHistoryUI() {
    const historyArea = document.getElementById('searchHistoryArea');
    if (!historyArea) return;
    
    const history = getSearchHistory();
    if (history.length === 0) {
        historyArea.innerHTML = '<div style="padding: 10px; color: #7f8c8d; text-align: center; font-size: 13px;">履歴はありません</div>';
        return;
    }

    let html = '<ul class="history-list" style="list-style: none; padding: 0; margin: 0;">';
    history.forEach(item => {
        const safeItem = item.replace(/'/g, "\\'");
        // クリックしたら検索ボックスに入力して即検索
        html += `<li style="padding: 10px; border-bottom: 1px solid #ecf0f1; cursor: pointer;" 
                     onclick="document.getElementById('searchInput').value='${safeItem}'; searchMaterial();">${item}</li>`;
    });
    html += '</ul>';
    historyArea.innerHTML = html;
}

// ==========================================
// ★ 設定画面用の機能
// ==========================================

// 設定画面に履歴リストを描画する
function renderSettingsHistory() {
    const listEl = document.getElementById('settingsHistoryList');
    if (!listEl) return;

    const history = getSearchHistory();
    if (history.length === 0) {
        listEl.innerHTML = '<li style="text-align: center; color: #7f8c8d; padding: 20px 0;">検索履歴はありません。</li>';
        return;
    }

    let html = '';
    history.forEach((item, index) => {
        const safeItem = item.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `<li style="display: flex; justify-content: space-between; align-items: center; padding: 12px 5px; border-bottom: 1px dashed #bdc3c7;">
                    <span style="font-size: 15px; color: #2c3e50; font-weight: bold;">${item}</span>
                    <button onclick="deleteHistoryItem(${index})" style="background: #95a5a6; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 12px; font-weight: bold; transition: background 0.2s;">
                        ✕ 削除
                    </button>
                 </li>`;
    });
    listEl.innerHTML = html;
}

// 特定の履歴を1件だけ削除する
function deleteHistoryItem(index) {
    let history = getSearchHistory();
    if (index >= 0 && index < history.length) {
        history.splice(index, 1); // 該当の1件を配列から削除
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        
        renderSettingsHistory(); // 画面を更新
        updateSearchHistoryUI(); // 検索ボックス側の表示も更新
    }
}

// すべての履歴を削除する
function clearAllSearchHistory() {
    let history = getSearchHistory();
    if (history.length === 0) {
        alert("削除する検索履歴がありません。");
        return;
    }

    // 誤操作防止のために確認ダイアログを出す
    if (confirm("本当にすべての検索履歴を削除しますか？\n（この操作は元に戻せません）")) {
        localStorage.removeItem(HISTORY_KEY);
        
        renderSettingsHistory(); // 画面を更新
        updateSearchHistoryUI(); // 検索ボックス側の表示も更新
    }
}