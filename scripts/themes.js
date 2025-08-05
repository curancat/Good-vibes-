const themeBtn = document.getElementById('theme-btn');

function setInitialTheme() {
    try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.className = savedTheme;
            if (savedTheme === 'dark') {
                themeBtn.checked = true;
            }
        }
    } catch (e) {
        console.error('Erro ao acessar localStorage:', e);
    }
}

setInitialTheme();

themeBtn.addEventListener('change', (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    document.body.className = theme;
    try {
        localStorage.setItem('theme', theme);
    } catch (e) {
        console.error('Erro ao salvar tema no localStorage:', e);
    }
});