const themeSelector = document.getElementById('theme-selector');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const body = document.body;

// Carrega o tema e o modo escuro salvos no localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const savedDarkMode = localStorage.getItem('darkMode');

    if (savedTheme) {
        // Aplica o tema salvo (ex: 'theme-red')
        body.classList.add(savedTheme);
        // Atualiza o seletor de tema para o valor salvo
        themeSelector.value = savedTheme.replace('theme-', '');
    }

    if (savedDarkMode === 'true') {
        body.classList.add('dark-mode');
        darkModeToggle.textContent = 'Modo Claro';
    }
});

// Lógica para mudar o tema de cores
if (themeSelector) {
    themeSelector.addEventListener('change', (event) => {
        const selectedTheme = event.target.value;
        
        // Remove qualquer classe de tema de cor existente
        const themeClasses = ['theme-red', 'theme-blue', 'theme-green', 'theme-yellow', 'theme-pink', 'theme-purple', 'theme-black', 'theme-white'];
        body.classList.remove(...themeClasses);

        let newThemeClass = '';
        if (selectedTheme !== 'padrao') {
            newThemeClass = `theme-${selectedTheme}`;
            body.classList.add(newThemeClass);
        }

        localStorage.setItem('theme', newThemeClass);
    });
}

// Lógica para alternar entre o modo claro e escuro
if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        darkModeToggle.textContent = isDarkMode ? 'Modo Claro' : 'Modo Escuro';
        localStorage.setItem('darkMode', isDarkMode);
    });
}
