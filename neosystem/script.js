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

    // Fecha sidebar no mobile ao navegar
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// Navegação pelos links da sidebar
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(link.dataset.page);
    });
});

// Botão Adicionar no dashboard
document.querySelectorAll('[data-page]').forEach(el => {
    if (!el.classList.contains('sidebar-link')) {
        el.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(el.dataset.page);
        });
    }
});

// Toggle sidebar desktop
document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
});

// Toggle sidebar mobile
document.getElementById('mobileSidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
});

// Fecha sidebar ao clicar no overlay
document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebarOverlay').classList.remove('active');
});
