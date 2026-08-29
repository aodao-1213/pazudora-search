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

function useHistory(word) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = word;
        if (typeof searchMaterial === 'function') searchMaterial();
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