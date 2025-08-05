const themeSelector = document.getElementById('theme-selector');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const body = document.body;

// Carrega o tema e modo escuro salvos no localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const savedDarkMode = localStorage.getItem('darkMode');

    if (savedTheme) {
        if (savedTheme === 'padrao') {
            body.className = '';
        } else {
            body.className = savedTheme;
        }
        themeSelector.value = savedTheme.replace('-theme', '');
    }

    if (savedDarkMode === 'true') {
        body.classList.add('dark-mode');
        darkModeToggle.textContent = 'Modo Claro';
    }
});

// Muda o tema de cores
if (themeSelector) {
    themeSelector.addEventListener('change', (event) => {
        const theme = event.target.value;
        const themeClass = theme === 'padrao' ? '' : `${theme}-theme`;
        
        // Remove todos os temas de cor e adiciona o novo
        // Mas mantém a classe dark-mode se ela estiver presente
        const isDarkMode = body.classList.contains('dark-mode');
        body.className = '';
        if (themeClass) {
            body.classList.add(themeClass);
        }
        if (isDarkMode) {
            body.classList.add('dark-mode');
        }

        localStorage.setItem('theme', themeClass);
    });
}

// Alterna entre o modo claro e escuro
if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        darkModeToggle.textContent = isDarkMode ? 'Modo Claro' : 'Modo Escuro';
        localStorage.setItem('darkMode', isDarkMode);
    });
}
