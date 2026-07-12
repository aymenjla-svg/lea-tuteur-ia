// Léa — AIDE AUX DEVOIRS : l'élève colle/photographie un exercice de SES devoirs,
// Léa le guide pas à pas SANS donner la réponse (contexte.devoir → Edge).
// 100 % ADDITIF ; dégrade proprement hors-ligne. Chargé par index.html.

import { ouvrirChat, carteLea } from './chat-lea.js';

function ouvrir() {
  ouvrirChat({
    titre: '📓 Aide aux devoirs',
    couleur: '#4db6ff',
    fig: '◦ Colle ton exo — je te guide (je ne donne pas la réponse)',
    contexte: { devoir: true },
    intro: 'Colle ou tape ton exercice de physique — ou prends-le en photo 📷. Je te guide étape par étape, mais c’est toi qui trouves la réponse 💪',
    placeholder: 'Colle ou tape l’énoncé de ton exercice…',
    photo: true,
  });
}

function init() {
  carteLea({
    id: 'devoirs-card', couleur: '#4db6ff', icone: '📓',
    titre: 'Aide aux devoirs',
    sous: 'Colle ton exo (ou une photo) : Léa te guide pas à pas, sans donner la réponse.',
    cta: '📸 Colle ton exo', ouvrir,
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
