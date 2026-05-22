function getItems() {
    return JSON.parse(localStorage.getItem('neosystem_items') || '[]');
}
function saveItems(items) {
    localStorage.setItem('neosystem_items', JSON.stringify(items));
}

const ICONS = {
    Tarefa: 'bi-check2-square',
    Prova: 'bi-journal-text',
    Trabalho: 'bi-folder2-open'
};

function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayStr() { return toDateStr(new Date()); }
function getTomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return toDateStr(d); }

function formatDate(s) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
}

function renderDashboard() {
    const items = getItems();

    document.getElementById('countTarefas').textContent = items.filter(i => i.tipo === 'Tarefa').length;
    document.getElementById('countProvas').textContent = items.filter(i => i.tipo === 'Prova').length;
    document.getElementById('countTrabalhos').textContent = items.filter(i => i.tipo === 'Trabalho').length;

    const tomorrow = getTomorrowStr();
    const dueTomorrow = items.filter(i => i.data === tomorrow && !i.concluido);
    const alertEl = document.getElementById('tomorrowAlert');

    if (dueTomorrow.length > 0) {
        alertEl.innerHTML = `
        <div class="alert-tomorrow" id="alertTomorrowBox">
            <div class="alert-tomorrow__icon"><i class="bi bi-bell-fill"></i></div>
            <div class="alert-tomorrow__body">
                <strong>Atenção! Você tem ${dueTomorrow.length} entrega${dueTomorrow.length > 1 ? 's' : ''} amanhã (${formatDate(tomorrow)})</strong>
                <ul class="alert-tomorrow__list">
                    ${dueTomorrow.map(i => `
                    <li style="display:flex;align-items:baseline;gap:6px">
                        <span style="color:#fff;font-weight:600">${i.tipo}</span>
                        <span>:</span>
                        <strong>${i.materia}</strong>${i.descricao ? `<span style="opacity:.85"> — ${i.descricao}</span>` : ''}
                    </li>`).join('')}
                </ul>
            </div>
        </div>`;

        clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => {
            const box = document.getElementById('alertTomorrowBox');
            if (box) {
                box.classList.add('alert-tomorrow--hiding');
                setTimeout(() => { alertEl.innerHTML = ''; }, 600);
            }
        }, 5000);
    } else {
        alertEl.innerHTML = '';
    }

    const dow = new Date().getDay();
    const monday = new Date();
    monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayStr = toDateStr(monday);
    const sundayStr = toDateStr(sunday);

    document.getElementById('weekDoneCount').textContent =
        items.filter(i => i.concluido && i.data >= mondayStr && i.data <= sundayStr).length;
    document.getElementById('totalPendingCount').textContent =
        items.filter(i => !i.concluido).length;

    const recent = [...items].sort((a, b) => b.id - a.id).slice(0, 3);
    const recentEl = document.getElementById('recentItems');

    if (recent.length === 0) {
        recentEl.innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i><p>Nenhum item cadastrado ainda.</p></div>`;
        return;
    }

    recentEl.innerHTML = recent.map(item => `
    <div class="recent-row ${item.concluido ? 'recent-row--done' : ''}">
        <div class="recent-row__icon item-icon--${item.tipo}"><i class="bi ${ICONS[item.tipo]}"></i></div>
        <div class="recent-row__info">
            <div class="recent-row__title">${item.materia}</div>
            <div class="recent-row__sub">${item.descricao || '—'}</div>
        </div>
        <div class="recent-row__right">
            <span class="badge-tipo badge-tipo--${item.tipo}">${item.tipo}</span>
            <div class="recent-row__date">${formatDate(item.data)}</div>
        </div>
    </div>`).join('');
}

let currentFilter = 'Todos';
let weeklyChartInstance = null;
let typeChartInstance = null;

function renderReports(filter) {
    if (filter) currentFilter = filter;
    const items = getItems();

    const concluded = items.filter(i => i.concluido &&
        (currentFilter === 'Todos' || i.tipo === currentFilter));

    document.querySelectorAll('.btn-filter').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.filter === currentFilter)
    );
    document.getElementById('reportCount').textContent = concluded.length;

    const listEl = document.getElementById('reportsList');
    if (concluded.length === 0) {
        listEl.innerHTML = `<div class="empty-state"><i class="bi bi-clipboard-check"></i><p>Nenhuma atividade concluída.</p></div>`;
    } else {
        listEl.innerHTML = [...concluded]
            .sort((a, b) => a.data.localeCompare(b.data))
            .map(item => `
            <div class="item-card item-card--done" id="item-${item.id}">
                <div class="item-card__main">
                    <div class="item-icon item-icon--${item.tipo}"><i class="bi ${ICONS[item.tipo]}"></i></div>
                    <div class="item-body">
                        <div class="item-title text-decoration-line-through text-muted">${item.materia}</div>
                        <div class="item-meta">
                            <span class="badge-tipo badge-tipo--${item.tipo}">${item.tipo}</span>
                            <span><i class="bi bi-calendar3 me-1"></i>${formatDate(item.data)}</span>
                            <span class="text-success fw-semibold" style="font-size:.78rem">
                                <i class="bi bi-check-circle-fill me-1"></i>Concluído
                            </span>
                        </div>
                        ${item.descricao ? `<div class="item-desc">${item.descricao}</div>` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="btn-done" onclick="toggleDone(${item.id})" title="Reverter para pendente">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteItem(${item.id})" title="Excluir">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>
            </div>`).join('');
    }

    const pending = items.filter(i => !i.concluido).sort((a, b) => a.data.localeCompare(b.data));
    const pendingEl = document.getElementById('pendingList');
    document.getElementById('pendingCount').textContent = pending.length;

    if (pending.length === 0) {
        pendingEl.innerHTML = `
        <div class="empty-state" style="padding:28px 24px">
            <i class="bi bi-check-all"></i>
            <p>Tudo concluído! Parabéns.</p>
        </div>`;
    } else {
        pendingEl.innerHTML = pending.map(item => `
        <div class="pending-row" id="pending-row-${item.id}">
            <div class="pending-row__main">
                <div class="recent-row__icon item-icon--${item.tipo}"><i class="bi ${ICONS[item.tipo]}"></i></div>
                <div class="recent-row__info">
                    <div class="recent-row__title">${item.materia}</div>
                    <div class="recent-row__sub">${item.tipo}${item.descricao ? ` — ${item.descricao}` : ''}</div>
                </div>
                <div class="recent-row__right">
                    <div class="recent-row__date">${formatDate(item.data)}</div>
                    <div class="pending-row__actions">
                        <button class="btn-edit-pending" onclick="togglePendingEdit(${item.id})" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-done btn-done--sm" onclick="toggleDone(${item.id})" title="Marcar como concluído">
                            <i class="bi bi-check-lg"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="pending-edit-panel" id="pending-edit-${item.id}">
                <div class="pending-edit-form">
                    <div class="pending-edit-field">
                        <label><i class="bi bi-book me-1"></i>Matéria</label>
                        <input type="text" class="form-control form-control-sm" id="edit-materia-${item.id}" value="${item.materia}">
                    </div>
                    <div class="pending-edit-field">
                        <label><i class="bi bi-tag me-1"></i>Tipo</label>
                        <select class="form-select form-select-sm" id="edit-tipo-${item.id}">
                            <option value="Tarefa" ${item.tipo === 'Tarefa' ? 'selected' : ''}>Tarefa</option>
                            <option value="Prova"  ${item.tipo === 'Prova' ? 'selected' : ''}>Prova</option>
                            <option value="Trabalho" ${item.tipo === 'Trabalho' ? 'selected' : ''}>Trabalho</option>
                        </select>
                    </div>
                    <div class="pending-edit-field">
                        <label><i class="bi bi-calendar3 me-1"></i>Data</label>
                        <input type="date" class="form-control form-control-sm" id="edit-data-${item.id}" value="${item.data}">
                    </div>
                    <div class="pending-edit-field pending-edit-field--full">
                        <label><i class="bi bi-text-left me-1"></i>Descrição</label>
                        <input type="text" class="form-control form-control-sm" id="edit-desc-${item.id}" value="${item.descricao || ''}" placeholder="Detalhes...">
                    </div>
                    <div class="pending-edit-actions">
                        <button class="btn-save-date" onclick="savePendingEdit(${item.id})">
                            <i class="bi bi-check-lg me-1"></i>Salvar
                        </button>
                        <button class="btn-cancel-edit" onclick="togglePendingEdit(${item.id})">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>`).join('');
    }

    renderCharts(items);
}

function getChartTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        tickColor: dark ? '#94a3b8' : '#718096',
        gridColor: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
        legendColor: dark ? '#94a3b8' : '#718096'
    };
}

function renderCharts(items) {
    const theme = getChartTheme();

    const dayMap = {};
    items.forEach(item => {
        if (!dayMap[item.data]) dayMap[item.data] = { done: 0, pending: 0 };
        if (item.concluido) dayMap[item.data].done++;
        else dayMap[item.data].pending++;
    });

    const sortedDays = Object.keys(dayMap).sort();
    const dayLabels = sortedDays.length
        ? sortedDays.map(k => { const [, m, d] = k.split('-'); return `${d}/${m}`; })
        : ['(sem dados)'];
    const dayDone = sortedDays.map(k => dayMap[k].done);
    const dayPending = sortedDays.map(k => dayMap[k].pending);

    const weekCtx = document.getElementById('weeklyChart').getContext('2d');
    if (weeklyChartInstance) weeklyChartInstance.destroy();
    weeklyChartInstance = new Chart(weekCtx, {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets: [
                {
                    label: 'Concluídos',
                    data: dayDone,
                    backgroundColor: 'rgba(41, 128, 185, 0.75)',
                    borderWidth: 0,
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 14
                },
                {
                    label: 'Pendentes',
                    data: dayPending,
                    backgroundColor: 'rgba(225, 29, 72, 0.70)',
                    borderWidth: 0,
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 14
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, font: { size: 12 }, color: theme.legendColor }
                },
                tooltip: {
                    callbacks: {
                        title: (ctx) => {
                            const idx = ctx[0].dataIndex;
                            const [y, m, d] = sortedDays[idx].split('-');
                            return `${d}/${m}/${y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { font: { size: 11 }, maxRotation: 45, minRotation: 0, color: theme.tickColor },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { size: 11 }, color: theme.tickColor },
                    grid: { color: theme.gridColor }
                }
            }
        }
    });

    const counts = ['Tarefa', 'Prova', 'Trabalho'].map(t => items.filter(i => i.tipo === t).length);
    const typeCtx = document.getElementById('typeChart').getContext('2d');
    if (typeChartInstance) typeChartInstance.destroy();
    typeChartInstance = new Chart(typeCtx, {
        type: 'doughnut',
        data: {
            labels: ['Tarefas', 'Provas', 'Trabalhos'],
            datasets: [{
                data: counts,
                backgroundColor: [
                    'rgba(41, 128, 185, 0.75)',
                    'rgba(225, 29, 72, 0.75)',
                    'rgba(39, 174, 96, 0.75)'
                ],
                borderColor: ['#2980b9', '#e11d48', '#27ae60'],
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            cutout: '62%'
        }
    });

    const legendEl = document.getElementById('typeChartLegend');
    if (legendEl) {
        const colors = ['#2980b9', '#e11d48', '#27ae60'];
        const labels = ['Tarefas', 'Provas', 'Trabalhos'];
        legendEl.innerHTML = labels.map((label, i) => `
            <span class="type-legend-item">
                <span class="type-legend-box" style="background:${colors[i]}"></span>
                ${label}
            </span>`).join('');
    }
}

let calYear, calMonth;

function renderCalendar() {
    const today = new Date();
    if (calYear === undefined) { calYear = today.getFullYear(); calMonth = today.getMonth(); }

    const items = getItems();
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    document.getElementById('calMonthYear').textContent = `${monthNames[calMonth]} ${calYear}`;

    const grid = document.getElementById('calGrid');
    const todayStr = getTodayStr();

    let start = new Date(firstDay);
    start.setDate(start.getDate() - start.getDay());

    const numCells = Math.ceil((firstDay.getDay() + lastDay.getDate()) / 7) * 7;
    let cells = '';

    for (let i = 0; i < numCells; i++) {
        const dateStr = toDateStr(start);
        const inMonth = start.getMonth() === calMonth;
        const isToday = dateStr === todayStr;
        const dayItems = items.filter(it => it.data === dateStr);
        const hasItems = dayItems.length > 0 && inMonth;

        const cls = [
            'cal-cell',
            !inMonth ? 'cal-cell--other' : '',
            isToday ? 'cal-cell--today' : '',
            hasItems ? 'cal-cell--clickable' : ''
        ].filter(Boolean).join(' ');

        let dots = '';
        if (hasItems) {
            const shown = dayItems.slice(0, 4);
            dots = `<div class="cal-dots">
                ${shown.map(it => `<span class="cal-dot cal-dot--${it.tipo}"></span>`).join('')}
                ${dayItems.length > 4 ? `<span class="cal-dot-more">+${dayItems.length - 4}</span>` : ''}
            </div>`;
        }

        cells += `<div class="${cls}" data-date="${dateStr}">
            <span class="cal-day-num">${start.getDate()}</span>${dots}
        </div>`;

        start.setDate(start.getDate() + 1);
    }

    grid.innerHTML = cells;

    grid.querySelectorAll('.cal-cell--clickable').forEach(cell => {
        cell.addEventListener('click', () => {
            grid.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            showDayPanel(cell.dataset.date);
        });
    });
}

function showDayPanel(dateStr) {
    const items = getItems().filter(i => i.data === dateStr);
    const formatted = new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long'
    });

    document.getElementById('calDayPanel').innerHTML = `
    <div class="cal-day-panel">
        <div class="cal-day-panel__header">
            <span>${formatted}</span>
            <button class="cal-day-panel__close"
                onclick="document.getElementById('calDayPanel').innerHTML='';
                         document.querySelectorAll('.cal-cell').forEach(c=>c.classList.remove('selected'))">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="cal-day-panel__items">
            ${items.map(item => `
            <div class="item-card ${item.concluido ? 'item-card--done' : ''}">
                <div class="item-icon item-icon--${item.tipo}"><i class="bi ${ICONS[item.tipo]}"></i></div>
                <div class="item-body">
                    <div class="item-title">${item.materia}</div>
                    <div class="item-meta">
                        <span class="badge-tipo badge-tipo--${item.tipo}">${item.tipo}</span>
                        ${item.concluido ? '<span class="text-success fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>Concluído</span>' : ''}
                    </div>
                    ${item.descricao ? `<div class="item-desc">${item.descricao}</div>` : ''}
                </div>
            </div>`).join('')}
        </div>
    </div>`;

    document.getElementById('calDayPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollTo(el, delay = 200) {
    if (!el) return;
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), delay);
}

function toggleExpand(id) {
    const card = document.getElementById('item-' + id);
    const details = card.querySelector('.item-card__details');
    const isOpen = details.classList.toggle('open');
    card.querySelector('.btn-expand').classList.toggle('open');
    if (isOpen) scrollTo(details);
}

function togglePendingEdit(id) {
    const panel = document.getElementById('pending-edit-' + id);
    const btn = document.querySelector('#pending-row-' + id + ' .btn-edit-pending');
    if (!panel) return;
    const isOpen = panel.classList.toggle('open');
    if (btn) btn.classList.toggle('active', isOpen);
    if (isOpen) scrollTo(panel);
}

function savePendingEdit(id) {
    const materia = document.getElementById('edit-materia-' + id)?.value.trim();
    const tipo = document.getElementById('edit-tipo-' + id)?.value;
    const data = document.getElementById('edit-data-' + id)?.value;
    const descricao = document.getElementById('edit-desc-' + id)?.value.trim();
    if (!materia || !tipo || !data) return;

    const items = getItems();
    const item = items.find(i => String(i.id) === String(id));
    if (item) { item.materia = materia; item.tipo = tipo; item.data = data; item.descricao = descricao; }
    saveItems(items);
    renderAll();
}

function saveDate(id) {
    const input = document.getElementById('date-input-' + id);
    if (!input || !input.value) return;
    const items = getItems();
    const item = items.find(i => i.id === id);
    if (item) item.data = input.value;
    saveItems(items);
    renderAll();
}

const _deleteTimers = {};

function showToast(msg) {
    const existing = document.getElementById('toastMsg');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'toastMsg';
    el.className = 'toast-msg';
    el.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>${msg}`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('toast-msg--show'), 10);
    setTimeout(() => {
        el.classList.remove('toast-msg--show');
        setTimeout(() => el.remove(), 400);
    }, 2500);
}

function deleteItem(id) {
    const card = document.getElementById('item-' + id);
    if (!card) return;

    if (document.getElementById('confirm-' + id)) {
        clearTimeout(_deleteTimers[id]);
        delete _deleteTimers[id];
        saveItems(getItems().filter(i => String(i.id) !== String(id)));
        renderAll();
        showToast('Item excluído com sucesso!');
        return;
    }

    const panel = document.createElement('div');
    panel.id = 'confirm-' + id;
    panel.className = 'delete-confirm';
    panel.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>Excluir este item?</span>
        <button class="delete-confirm__yes" onclick="deleteItem(${id})">
            <i class="bi bi-trash3-fill me-1"></i>Excluir
        </button>
        <button class="delete-confirm__no" onclick="cancelDelete(${id})">Cancelar</button>
    `;
    card.appendChild(panel);
    scrollTo(panel, 50);

    _deleteTimers[id] = setTimeout(() => cancelDelete(id), 5000);
}

function cancelDelete(id) {
    clearTimeout(_deleteTimers[id]);
    delete _deleteTimers[id];
    const p = document.getElementById('confirm-' + id);
    if (p) p.remove();
}

let _clearAllTimer = null;

function clearAll() {
    const box = document.getElementById('clearAllConfirm');
    if (!box) return;
    if (box.innerHTML) { cancelClearAll(); return; }

    box.innerHTML = `
        <div class="delete-confirm mb-3" style="border-radius:10px; border:1.5px solid rgba(225,29,72,.25);">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>Apagar <strong>todas</strong> as atividades? Essa ação não pode ser desfeita.</span>
            <button class="delete-confirm__yes" onclick="confirmClearAll()">
                <i class="bi bi-trash3-fill me-1"></i>Apagar tudo
            </button>
            <button class="delete-confirm__no" onclick="cancelClearAll()">Cancelar</button>
        </div>`;

    _clearAllTimer = setTimeout(cancelClearAll, 6000);
    scrollTo(box, 50);
}

function confirmClearAll() {
    clearTimeout(_clearAllTimer);
    saveItems(getItems().filter(i => !i.concluido));
    renderAll();
    cancelClearAll();
    showToast('Atividades concluídas apagadas!');
}

function cancelClearAll() {
    clearTimeout(_clearAllTimer);
    const box = document.getElementById('clearAllConfirm');
    if (box) box.innerHTML = '';
}

function toggleConcluded() {
    const section = document.getElementById('concludedSection');
    const chevron = document.getElementById('concludedChevron');
    if (!section) return;
    const isOpen = section.classList.toggle('open');
    chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
    if (isOpen) scrollTo(section);
}

function togglePending() {
    const section = document.getElementById('pendingSection');
    const chevron = document.getElementById('pendingChevron');
    if (!section) return;
    const isOpen = section.classList.toggle('open');
    chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
    if (isOpen) scrollTo(section);
}

function toggleDone(id) {
    const items = getItems();
    const item = items.find(i => i.id === id);
    if (item) item.concluido = !item.concluido;
    saveItems(items);
    renderAll();
    if (item && item.concluido && items.length > 0 && items.every(i => i.concluido)) {
        showToast('Parabéns! Todas as atividades concluídas!');
    }
}

function renderAll() {
    renderDashboard();
    const active = document.querySelector('.page.active');
    if (active?.id === 'page-reports') renderReports();
    if (active?.id === 'page-calendar') renderCalendar();
}

document.getElementById('addItemForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const materia = document.getElementById('fieldMateria').value.trim();
    const tipo = document.getElementById('fieldTipo').value;
    const data = document.getElementById('fieldData').value;
    const descricao = document.getElementById('fieldDescricao').value.trim();

    if (!materia || !tipo || !data) {
        document.getElementById('errorAlert').classList.remove('d-none');
        document.getElementById('successAlert').classList.add('d-none');
        return;
    }

    const items = getItems();
    items.push({ id: Date.now(), materia, tipo, data, descricao, concluido: false });
    saveItems(items);

    this.reset();
    document.getElementById('successAlert').classList.remove('d-none');
    document.getElementById('errorAlert').classList.add('d-none');
    setTimeout(() => document.getElementById('successAlert').classList.add('d-none'), 3000);

    renderDashboard();
});

document.querySelectorAll('.btn-filter').forEach(btn =>
    btn.addEventListener('click', () => renderReports(btn.dataset.filter))
);

document.getElementById('calPrev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
    document.getElementById('calDayPanel').innerHTML = '';
});
document.getElementById('calNext').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
    document.getElementById('calDayPanel').innerHTML = '';
});
document.getElementById('calToday').addEventListener('click', () => {
    const t = new Date();
    calYear = t.getFullYear();
    calMonth = t.getMonth();
    renderCalendar();
    document.getElementById('calDayPanel').innerHTML = '';
});

const pageTitles = {
    dashboard: 'Dashboard',
    add: 'Adicionar Item',
    reports: 'Relatórios',
    calendar: 'Calendário'
};

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');

    const link = document.querySelector(`.sidebar-link[data-page="${pageId}"]`);
    if (link) link.classList.add('active');

    document.getElementById('pageTitle').textContent = pageTitles[pageId] || pageId;
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebarOverlay').classList.remove('active');

    if (pageId !== 'calendar') {
        document.getElementById('calDayPanel').innerHTML = '';
        document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
    }

    if (pageId === 'dashboard') renderDashboard();
    if (pageId === 'reports') renderReports();
    if (pageId === 'calendar') renderCalendar();
}

document.querySelectorAll('.sidebar-link').forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.dataset.page); })
);

document.querySelectorAll('[data-page]').forEach(el => {
    if (!el.classList.contains('sidebar-link')) {
        el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.page); });
    }
});

document.getElementById('sidebarToggle').addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('mobile-open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    } else {
        document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('mainContent').classList.toggle('expanded');
    }
});

document.getElementById('mobileSidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
});

document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebarOverlay').classList.remove('active');
});

renderDashboard();

// Dark mode
function setTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const icon = document.getElementById('darkmodeIcon');
    if (icon) icon.className = dark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    localStorage.setItem('neosystem_theme', dark ? 'dark' : 'light');
    const active = document.querySelector('.page.active');
    if (active?.id === 'page-reports') renderReports();
}

(function () {
    const saved = localStorage.getItem('neosystem_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved ? saved === 'dark' : prefersDark);
})();

document.getElementById('darkmodeToggle').addEventListener('click', () => {
    setTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
});