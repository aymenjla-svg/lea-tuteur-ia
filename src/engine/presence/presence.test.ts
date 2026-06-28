import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { FrameAvatar, PersonaId } from '../../contracts/index.js';
import { id } from '../core.js';
import { avatarPourPalier, SvgAvatar, TextAvatar } from './avatars.js';
import { AttentionDesactivee, VoixTexte } from './voix-texte.js';

const frame: FrameAvatar = {
  t_ms: 0,
  visemes: [{ code: 'AA', intensite: 1 }],
  regard: { x: 0.5, y: -0.2 },
};

test('avatarPourPalier mappe le palier vers l’implémentation', () => {
  assert.ok(avatarPourPalier('2d_svg') instanceof SvgAvatar);
  assert.ok(avatarPourPalier('texte') instanceof TextAvatar);
});

test('SvgAvatar rend un SVG synthétique (jamais de pixels caméra — §1.4)', async () => {
  const a = new SvgAvatar();
  await a.monterPersona(id<PersonaId>('persona-lea'));
  a.rendre(frame);
  assert.match(a.dernierSvg, /^<svg/);
  // Bouche plus ouverte avec visème actif qu'au repos.
  const repos = a.dessiner({ ...frame, visemes: [] });
  assert.ok(a.dernierSvg.length > 0 && repos.length > 0);
  assert.notEqual(a.dernierSvg, repos);
});

test('VoixTexte : mode texte sans audio', async () => {
  const v = new VoixTexte();
  let n = 0;
  for await (const _ of v.tts.synthetiser({ texte: 'bonjour', voix_id: 'x' })) n++;
  assert.equal(n, 0);
  v.tts.interrompre(); // barge-in no-op
});

test('AttentionDesactivee : inactive, aucun signal (désactivable §8)', async () => {
  const a = new AttentionDesactivee();
  assert.equal(a.estActive(), false);
  let n = 0;
  for await (const _ of a.signaux()) n++;
  assert.equal(n, 0);
});
