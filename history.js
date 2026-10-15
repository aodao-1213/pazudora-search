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
        historyArea.innerHTML = '<div class="history-empty">履歴はありません</div>';
        return;
    }

    let html = '<ul class="history-list">';
    history.forEach(item => {
        const safeItem = item.replace(/'/g, "\\'");
        // クリックしたら検索ボックスに入力するだけ（検索は「検索する」ボタンかEnterで行う）
        html += `<li onclick="selectHistoryItem('${safeItem}')">${item}</li>`;
    });
    html += '</ul>';
    historyArea.innerHTML = html;
}

// 履歴から選んだワードを検索ボックスに入れて、履歴の一覧を閉じる
function selectHistoryItem(keyword) {
    const input = document.getElementById('searchInput');
    input.value = keyword;
    input.classList.remove('input-active');

    const historyArea = document.getElementById('searchHistoryArea');
    if (historyArea) historyArea.style.display = 'none';
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
        listEl.innerHTML = '<li class="settings-history-empty">検索履歴はありません。</li>';
        return;
    }

    let html = '';
    history.forEach((item, index) => {
        html += `<li class="settings-history-item">
                    <span class="settings-history-word">${item}</span>
                    <button class="history-delete-btn" onclick="deleteHistoryItem(${index})">✕ 削除</button>
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

// ==========================================
// ★ カラーテーマ設定機能
// ==========================================

function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        localStorage.setItem('padTheme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('padTheme', 'light');
    }
    updateThemeButtons();
}

// カラー設定画面で、今使っているテーマのカードに「使用中」を付ける
function updateThemeButtons() {
    const current = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    document.querySelectorAll('[data-theme-option]').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.themeOption === current);
    });
}

// ページが読み込まれた時に保存されたテーマを復元する
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('padTheme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    updateThemeButtons();
});