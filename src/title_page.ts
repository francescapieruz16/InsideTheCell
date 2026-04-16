const button = document.getElementById('pageChangerBtn') as HTMLButtonElement;

if (button) {
  button.addEventListener('click', () => {
    window.location.href = 'menu_page.html';
  });
}