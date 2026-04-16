const button = document.getElementById('playBtn') as HTMLButtonElement;

if (button) {
  button.addEventListener('click', () => {
    window.location.href = 'pages/menu_page.html';
  });
}