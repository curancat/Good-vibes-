const themeButtons = document.querySelectorAll('.theme-btn');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const body = document.body;

// Carrega o tema e o modo escuro salvos no localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const savedDarkMode = localStorage.getItem('darkMode');

    if (savedTheme) {
        body.classList.add(savedTheme);
    }
    if (savedDarkMode === 'true') {
        body.classList.add('dark-mode');
        darkModeToggle.textContent = 'Modo Claro';
    } else {
        darkModeToggle.textContent = 'Modo Escuro';
    }
});

// Lógica para mudar o tema de cores usando botões
if (themeButtons.length > 0) {
    themeButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const selectedTheme = event.target.dataset.theme;

            // Remove qualquer classe de tema de cor existente
            const themeClasses = ['theme-red', 'theme-blue', 'theme-green', 'theme-yellow', 'theme-pink', 'theme-purple', 'theme-black', 'theme-white'];
            body.classList.remove(...themeClasses);
            
            // Se o tema não for o padrão, adicione a nova classe
            if (selectedTheme !== 'padrao') {
                body.classList.add(`theme-${selectedTheme}`);
                localStorage.setItem('theme', `theme-${selectedTheme}`);
            } else {
                localStorage.setItem('theme', '');
            }
        });
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
