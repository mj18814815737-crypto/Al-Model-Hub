const container = document.getElementById('modelContainer');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');

let allModels = [];
let currentFilter = 'all';
let currentSearch = '';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function logRendererError(error, source = 'renderer') {
  try {
    window.electronAPI?.logError?.({
      message: error?.message || String(error),
      stack: error?.stack || '',
      source
    });
  } catch {}
}

window.addEventListener('error', event => {
  logRendererError(event.error || event.message, 'window:error');
});

window.addEventListener('unhandledrejection', event => {
  logRendererError(event.reason || 'Unhandled rejection', 'window:unhandledrejection');
});

window.openLink = function(url) {
  if (!url) {
    alert('暂无链接');
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    alert('链接不合法');
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};

function renderModels(list) {
  console.log('[renderer] renderModels count:', Array.isArray(list) ? list.length : 'not array');

  container.innerHTML = '';

  if (!Array.isArray(list) || !list.length) {
    container.innerHTML = '<div class="empty-tip">没有找到模型，请稍后重试</div>';
    return;
  }

  for (const item of list) {
    const card = document.createElement('div');
    card.className = 'card';

    let tagClass = 'tag-text';
    let tagText = '文本';

    if (item.category === 'image') {
      tagClass = 'tag-image';
      tagText = '图像';
    } else if (item.category === 'video') {
      tagClass = 'tag-video';
      tagText = '视频';
    } else if (item.category === 'audio') {
      tagClass = 'tag-audio';
      tagText = '音频';
    }

    const linkDisabled = !item.link ? 'disabled' : '';
    const downDisabled = !item.downloadUrl ? 'disabled' : '';
    const matesHtml = item.mates && item.mates.length
      ? `<div class="mates"><span>搭子模型：</span> ${item.mates.map(m => `<a href="${escapeHtml(m.link)}" target="_blank" class="mate-link">${escapeHtml(m.name)}</a>`).join(' ')}</div>`
      : '<div class="mates">暂无搭子推荐</div>';

    card.innerHTML = `
      <div class="card-title">${escapeHtml(item.name)}</div>
      <span class="tag ${tagClass}">${tagText}</span>
      <div class="card-desc">${escapeHtml(item.description || '暂无简介')}</div>
      ${matesHtml}
      <div class="card-buttons">
        <button class="card-btn ${linkDisabled}" ${linkDisabled} onclick="openLink('${escapeHtml(item.link || '')}')">详情链接</button>
        <button class="card-btn download ${downDisabled}" ${downDisabled} onclick="openLink('${escapeHtml(item.downloadUrl || '')}')">下载/访问</button>
      </div>
    `;

    container.appendChild(card);
  }
}

function filterAndSearch() {
  let filtered = [...allModels];

  if (currentFilter !== 'all') {
    filtered = filtered.filter(m => m.category === currentFilter);
  }

  if (currentSearch.trim() !== '') {
    const searchLower = currentSearch.toLowerCase();
    filtered = filtered.filter(m =>
      String(m.name || '').toLowerCase().includes(searchLower) ||
      String(m.description || '').toLowerCase().includes(searchLower)
    );
  }

  console.log('[renderer] filter:', currentFilter, 'search:', currentSearch, 'count:', filtered.length);
  renderModels(filtered);
}

function filterModels(type) {
  filterBtns.forEach(btn => btn.classList.remove('active'));

  const active = document.querySelector(`.filter-btn[data-type="${type}"]`);
  if (active) active.classList.add('active');

  currentFilter = type;
  filterAndSearch();
}

if (searchInput) {
  searchInput.addEventListener('input', event => {
    currentSearch = event.target.value;
    filterAndSearch();
  });
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => filterModels(btn.dataset.type));
});

async function init() {
  container.innerHTML = '<div class="loading-tip">数据加载中...</div>';

  try {
    console.log('[renderer] calling electronAPI.getModels');
    const res = await window.electronAPI.getModels();

    console.log('[renderer] getModels response:', res);

    if (res && res.code === 0 && res.data && Array.isArray(res.data.list)) {
      allModels = res.data.list;
      console.log('[renderer] loaded models count:', allModels.length);
      filterAndSearch();
    } else {
      console.warn('[renderer] invalid getModels response:', res);
      container.innerHTML = '<div class="empty-tip">请先运行数据抓取任务</div>';
    }
  } catch (err) {
    console.error('[renderer] init failed:', err);
    container.innerHTML = `<div class="empty-tip">加载失败：${escapeHtml(err.message)}</div>`;
    logRendererError(err, 'init');
  }
}

init();
