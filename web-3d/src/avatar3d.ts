/**
 * Avatar3D — tête stylisée en Three.js (palier 3D, R6).
 *
 * Construite à partir de primitives (aucun asset distant) : tête, yeux,
 * pupilles, sourcils, bouche. Animée par des signaux SYNTHÉTIQUES — visèmes
 * (ouverture de bouche), regard, clignements — JAMAIS de caméra (§1.4).
 *
 * Seam RPM : pour brancher un vrai avatar Ready Player Me, remplacer la
 * construction de `groupe` par le chargement d'un GLB (GLTFLoader) et mapper
 * `parler()`/le regard sur ses morph targets — même interface, derrière le
 * contrat Avatar.
 */

import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';

export class Avatar3D {
  readonly #renderer: WebGLRenderer;
  readonly #scene = new Scene();
  readonly #camera: PerspectiveCamera;
  readonly #groupe = new Group();
  readonly #bouche: Mesh;
  readonly #pupilleG: Mesh;
  readonly #pupilleD: Mesh;
  readonly #oeilG: Mesh;
  readonly #oeilD: Mesh;

  #parleJusqua = 0;
  #prochainClignement = 1500;
  #debutClignement = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.#renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.#renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    this.#scene.background = null;
    this.#camera = new PerspectiveCamera(38, 1, 0.1, 100);
    this.#camera.position.set(0, 0, 7.2);
    // La tête est remontée pour dégager le visage au-dessus de l'overlay.
    this.#groupe.position.y = 1.15;

    this.#scene.add(new AmbientLight(0xffffff, 0.85));
    const dir = new DirectionalLight(0xffffff, 1.1);
    dir.position.set(2, 3, 4);
    this.#scene.add(dir);

    const peau = new MeshStandardMaterial({ color: new Color('#ffe0bd'), roughness: 0.7 });
    const tete = new Mesh(new SphereGeometry(1.4, 64, 64), peau);
    tete.scale.set(1, 1.1, 0.9);
    this.#groupe.add(tete);

    const blanc = new MeshStandardMaterial({ color: new Color('#ffffff'), roughness: 0.4 });
    const sombre = new MeshStandardMaterial({ color: new Color('#2f2f2f'), roughness: 0.3 });

    this.#oeilG = new Mesh(new SphereGeometry(0.28, 32, 32), blanc);
    this.#oeilG.position.set(-0.45, 0.2, 1.15);
    this.#oeilD = this.#oeilG.clone();
    this.#oeilD.position.x = 0.45;
    this.#groupe.add(this.#oeilG, this.#oeilD);

    this.#pupilleG = new Mesh(new SphereGeometry(0.12, 24, 24), sombre);
    this.#pupilleG.position.set(-0.45, 0.2, 1.38);
    this.#pupilleD = this.#pupilleG.clone();
    this.#pupilleD.position.x = 0.45;
    this.#groupe.add(this.#pupilleG, this.#pupilleD);

    const bouche = new MeshStandardMaterial({ color: new Color('#aa3333'), roughness: 0.5 });
    this.#bouche = new Mesh(new SphereGeometry(0.34, 32, 32), bouche);
    this.#bouche.position.set(0, -0.55, 1.1);
    this.#bouche.scale.set(1, 0.18, 0.5);
    this.#groupe.add(this.#bouche);

    this.#scene.add(this.#groupe);
  }

  /** Déclenche l'animation « parle » pour `dureeMs` millisecondes. */
  parler(dureeMs: number): void {
    this.#parleJusqua = performance.now() + dureeMs;
  }

  redimensionner(largeur: number, hauteur: number): void {
    this.#renderer.setSize(largeur, hauteur, false);
    this.#camera.aspect = largeur / Math.max(1, hauteur);
    this.#camera.updateProjectionMatrix();
  }

  /** Met à jour l'animation et rend une frame (à appeler dans la boucle RAF). */
  rendre(t: number): void {
    const parle = t < this.#parleJusqua;
    const ouverture = parle ? 0.18 + 0.5 * Math.abs(Math.sin(t / 90)) : 0.18;
    this.#bouche.scale.y = ouverture;

    // Regard : légère dérive synthétique.
    const dx = Math.sin(t / 1700) * 0.08;
    const dy = Math.cos(t / 2300) * 0.05;
    this.#pupilleG.position.x = -0.45 + dx;
    this.#pupilleD.position.x = 0.45 + dx;
    this.#pupilleG.position.y = 0.2 + dy;
    this.#pupilleD.position.y = 0.2 + dy;

    // Léger balancement de la tête (présence vivante).
    this.#groupe.rotation.y = Math.sin(t / 2600) * 0.12;
    this.#groupe.rotation.x = Math.sin(t / 3300) * 0.05;

    // Clignements.
    if (t > this.#prochainClignement && this.#debutClignement === 0) {
      this.#debutClignement = t;
    }
    let sy = 1;
    if (this.#debutClignement > 0) {
      const dt = t - this.#debutClignement;
      sy = dt < 70 ? 1 - dt / 70 : dt < 140 ? (dt - 70) / 70 : 1;
      if (dt >= 140) {
        this.#debutClignement = 0;
        this.#prochainClignement = t + 2200 + Math.abs(Math.sin(t)) * 1800;
      }
    }
    this.#oeilG.scale.y = sy;
    this.#oeilD.scale.y = sy;

    this.#renderer.render(this.#scene, this.#camera);
  }
}
