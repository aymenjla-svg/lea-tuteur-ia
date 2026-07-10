// =============================================================================
// Config PARTAGÉE du tuteur — vaut pour TOUS les visiteurs du lien.
//
// Objectif : brancher le tuteur une seule fois pour tout le monde (tes 6
// testeurs), sans que chacun ait à coller quoi que ce soit dans son navigateur.
//
// À FAIRE : colle ci-dessous l'URL de ta fonction Edge (et la clé anon si tu
// gardes « Verify JWT » activé), puis enregistre — ça se déploie tout seul.
//
// ⚠️ Ne mets JAMAIS ici la clé « service_role » (elle est privée). L'URL de la
//    fonction et la clé « anon »/« publishable » sont publiques par nature.
//
// Un réglage fait DANS l'appli (♿ → Tuteur IA) sur un navigateur donné a la
// priorité sur cette valeur, juste pour ce navigateur.
// =============================================================================

window.LEA_TUTEUR_URL = ''; // ex. 'https://xxxx.supabase.co/functions/v1/tuteur'
window.LEA_TUTEUR_KEY = ''; // clé anon si « Verify JWT » est activé ; sinon laisse vide
