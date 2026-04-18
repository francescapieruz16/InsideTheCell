// Configurazione dinamica dei bottoni dei livelli (da 1 a 6)
for (let i = 1; i <= 6; i++) {
  const levelBtn = document.getElementById(`Level${i}`) as HTMLButtonElement | null;
  
  if (levelBtn) {
    levelBtn.addEventListener('click', () => {
      console.log(`Avvio del Livello ${i}...`);
      
      window.location.href = `level${i}.html`;
    });
  } else {
    console.warn(`Errore: Bottone per il Livello ${i} non trovato nel DOM.`);
  }
}

// Configurazione dei bottoni UI (Tutorial, Options, Back)
const btnTutorial = document.getElementById('Tutorial') as HTMLButtonElement | null;
const btnOptions = document.getElementById('Options') as HTMLButtonElement | null;
const btnBack = document.getElementById('Back') as HTMLButtonElement | null;

btnTutorial?.addEventListener('click', () => {
  console.log('Apertura schermata Tutorial...');
  window.location.href = '/pages/tutorial.html';
});

btnOptions?.addEventListener('click', () => {
  console.log('Apertura schermata Opzioni...');
   window.location.href = '/pages/options.html';
});

btnBack?.addEventListener('click', () => {
  console.log('Ritorno al menu principale...');
   window.history.back();
});