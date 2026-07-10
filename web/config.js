// =============================================================================
// Config PARTAGÉE du tuteur — vaut pour TOUS les visiteurs du lien.
//
// Objectif : brancher le tuteur une seule fois pour tout le monde (tes
// testeurs), sans que chacun ait à coller quoi que ce soit dans son navigateur.
// Ces valeurs sont chargées à chaque ouverture → la connexion ne s'efface plus.
//
// ⚠️ Ne mets JAMAIS ici la clé « service_role » (elle est privée). L'URL de la
//    fonction et la clé « anon »/« publishable » sont publiques par nature.
//
// Un réglage fait DANS l'appli (♿ → Tuteur IA) sur un navigateur donné a la
// priorité sur cette valeur, juste pour ce navigateur.
// =============================================================================

window.LEA_TUTEUR_URL = 'https://wncsqdxtqfhwjkmeqpgt.supabase.co/functions/v1/tuteur';
window.LEA_TUTEUR_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduY3NxZHh0cWZod2prbWVxcGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Nzc5MDcsImV4cCI6MjA5ODI1MzkwN30.z3y0u2FuAlbOEj5eErHs_-WoRyL8tgpuFoQgHcW38Vk'; // clé anon (publique)
