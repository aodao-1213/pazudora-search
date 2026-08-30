function updateSearchHistoryUI() {
    let historyArea = document.getElementById('searchHistoryArea');
    if (!historyArea) {
        historyArea = document.createElement('div');
        historyArea.id = 'searchHistoryArea';
        historyArea.className = 'history-dropdown';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.parentNode.insertBefore(historyArea, searchInput.nextSibling);
        }
    }
    
    let history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
    if (history.length === 0) {
        historyArea.innerHTML = '';
        historyArea.style.display = 'none';
        return;
    }

    let html = '';
    history.forEach(word => {
        const safeWord = word.replace(/'/g, "\\'");
        html += `<button type="button" class="history-item" onclick="useHistory('${safeWord}')">${word}</button>`;
    });
    historyArea.innerHTML = html;
}

// ★ 修正: クリック時に文字を入力するだけで、検索は実行しない
function useHistory(word) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = word; // 文字をセット
        
        // ドロップダウンを非表示にする
        const historyArea = document.getElementById('searchHistoryArea');
        if (historyArea) historyArea.style.display = 'none';
        
        // 入力欄からフォーカスを外し、ユーザーが検索ボタンを押しやすくする
        searchInput.blur();
    }
}

function saveSearchHistory(query) {
    if (!query) return;
    let history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
    history = history.filter(item => item !== query);
    history.unshift(query);
    if (history.length > 10) history.pop();
    localStorage.setItem('padSearchHistory', JSON.stringify(history));
    updateSearchHistoryUI();
}