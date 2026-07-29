// Léa — palier 3D : avatar Three.js + overlay, branché sur l'API du moteur.

import './styles.css';
import { Avatar3D } from './avatar3d.js';
import { demarrerSession, type EtatLecon, repondre } from './api.js';

const COUPS: Record<string, string> = {
  proposer: 'nouvel exercice',
  reformuler: 'reformulation',
  simplifier: 'on simplifie',
  changer_de_modalite: 'autre approche',
  encourager: 'encouragement',
  reviser: 'révision',
  clore: 'séance terminée',
};

const $ = <T extends Element>(s: string): T => {
  const el = document.querySelector<T>(s);
  if (!el) throw new Error(`élément manquant : ${s}`);
  return el;
};

const canvas = $<HTMLCanvasElement>('#scene');
const avatar = new Avatar3D(canvas);

function ajusterTaille(): void {
  avatar.redimensionner(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', ajusterTaille);
ajusterTaille();

function boucle(t: number): void {
  avatar.rendre(t);
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);

let sessionId: string | null = null;

function ajouterTour(qui: 'tuteur' | 'eleve', texte: string): void {
  const li = document.createElement('li');
  li.className = qui;
  li.textContent = texte;
  const tr = $<HTMLOListElement>('#transcript');
  tr.append(li);
  tr.scrollTop = tr.scrollHeight;
}

function rendre(etat: EtatLecon): void {
  $('#parole').textContent = etat.texte_tuteur;
  ajouterTour('tuteur', etat.texte_tuteur);
  avatar.parler(Math.min(4000, 400 + etat.texte_tuteur.length * 35));

  const p = Math.round((etat.maitrise_cible?.probabilite_effective ?? 0) * 100);
  ($('#barre') as HTMLElement).style.width = p + '%';
  $('#pct').innerHTML = p + '&nbsp;%';
  $('#coup').textContent = COUPS[etat.dernier_coup?.type ?? ''] ?? '';

  const fini = etat.termine;
  ($('#reponse') as HTMLInputElement).disabled = fini;
  ($('#envoyer') as HTMLButtonElement).disabled = fini;
  ($('#perdu') as HTMLButtonElement).disabled = fini;
  ($('#rejouer') as HTMLButtonElement).hidden = !fini;
  if (!fini) ($('#reponse') as HTMLInputElement).focus();
}

async function demarrer(): Promise<void> {
  $<HTMLOListElement>('#transcript').replaceChildren();
  try {
    const d = await demarrerSession();
    sessionId = d.session_id;
    rendre(d.etat);
  } catch (e) {
    $('#parole').textContent = 'Connexion au tuteur impossible : ' + (e as Error).message;
  }
}

async function envoyer(texte: string): Promise<void> {
  if (!sessionId || texte.trim() === '') return;
  ajouterTour('eleve', texte);
  try {
    const d = await repondre(sessionId, texte);
    rendre(d.etat);
  } catch (e) {
    $('#parole').textContent = 'Oups : ' + (e as Error).message;
  }
}

$<HTMLFormElement>('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>('#reponse');
  const v = input.value;
  input.value = '';
  void envoyer(v);
});
$('#perdu').addEventListener('click', () => void envoyer('je suis perdu'));
$('#rejouer').addEventListener('click', () => void demarrer());

void demarrer();
