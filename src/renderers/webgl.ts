import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  ShadowMaterial,
  PlaneGeometry,
  BoxGeometry,
  CanvasTexture,
  SRGBColorSpace,
  FrontSide,
  BackSide,
  PCFShadowMap,
} from 'three';
import { createSheetGeometry, deformSheet } from './geometry';
import type { BookRenderer, View } from './renderer';
import type { PageSurface } from '../types';

export class WebGLBookRenderer implements BookRenderer {
  readonly element: HTMLCanvasElement;
  private readonly gl: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 30);
  private readonly textures = new Map<HTMLCanvasElement, CanvasTexture>();
  private readonly textureListeners = new Map<HTMLCanvasElement, () => void>();
  private readonly left = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshStandardMaterial({ roughness: 0.92 }),
  );
  private readonly right = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshStandardMaterial({ roughness: 0.92 }),
  );
  private readonly front = new Mesh(
    createSheetGeometry(),
    new MeshStandardMaterial({ roughness: 0.92, side: FrontSide }),
  );
  private readonly back = new Mesh(
    createSheetGeometry(),
    new MeshStandardMaterial({ roughness: 0.92, side: BackSide }),
  );
  private readonly stacks = [-1, 1].map(
    () =>
      new Mesh(
        new BoxGeometry(1, 1, 0.024),
        new MeshStandardMaterial({ color: 0xd7d2c6, roughness: 1 }),
      ),
  );
  private readonly ground = new Mesh(
    new PlaneGeometry(6, 6),
    new ShadowMaterial({ opacity: 0.19 }),
  );
  private width = 1;
  private height = 1;
  private ratio = 4 / 3;
  private single = false;
  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private shift = 0;

  constructor(onContextLost: () => void) {
    this.gl = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    this.element = this.gl.domElement;
    this.element.className = 'folio3d-canvas';
    this.element.setAttribute('aria-hidden', 'true');
    this.element.addEventListener('webglcontextlost', this.lost);
    this.onLost = onContextLost;
    this.gl.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = PCFShadowMap;
    this.camera.position.set(0, 0, 6);
    this.scene.add(new AmbientLight(0xffffff, 2.1));
    const light = new DirectionalLight(0xffffff, 2.5);
    light.position.set(-2, 3, 6);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -3;
    light.shadow.camera.right = 3;
    light.shadow.camera.top = 3;
    light.shadow.camera.bottom = -3;
    light.shadow.bias = -0.0003;
    this.scene.add(light);
    this.ground.position.z = -0.065;
    this.ground.receiveShadow = true;
    for (const page of [this.left, this.right]) {
      page.position.z = 0.006;
      page.receiveShadow = true;
    }
    this.front.castShadow = true;
    this.back.castShadow = true;
    this.scene.add(this.ground, this.left, this.right, this.front, this.back, ...this.stacks);
  }
  private onLost: () => void;
  private lost = (event: Event) => {
    event.preventDefault();
    this.onLost();
  };
  private texture(surface: PageSurface): CanvasTexture {
    const canvas = surface.canvas;
    let texture = this.textures.get(canvas);
    if (!texture) {
      texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.generateMipmaps = false;
      this.textures.set(canvas, texture);
      const remove = surface.onDispose?.(() => {
        this.textures.get(canvas)?.dispose();
        this.textures.delete(canvas);
        this.textureListeners.delete(canvas);
      });
      if (remove) this.textureListeners.set(canvas, remove);
    }
    return texture;
  }
  private page(
    mesh: Mesh<PlaneGeometry, MeshStandardMaterial>,
    page: number | null | undefined,
    view: View,
    x: number,
  ): void {
    const surface = page ? view.surfaces.get(page) : undefined;
    mesh.visible = page !== null && page !== undefined;
    mesh.position.x = x;
    mesh.scale.y = this.ratio;
    mesh.material.map = surface ? this.texture(surface) : null;
    mesh.material.color.set(surface ? 0xffffff : 0xf5f1e8);
    mesh.material.needsUpdate = true;
  }
  private retain(views: View[]): void {
    const keep = new Set(views.flatMap((v) => Array.from(v.surfaces.values(), (s) => s.canvas)));
    for (const [canvas, texture] of this.textures)
      if (!keep.has(canvas)) {
        texture.dispose();
        this.textures.delete(canvas);
        this.textureListeners.get(canvas)?.();
        this.textureListeners.delete(canvas);
      }
  }
  private framing(): void {
    const aspect = this.width / this.height;
    const h = Math.max(this.ratio * 1.16, (this.single ? 1.18 : 2.24) / aspect) / this.zoom;
    this.camera.left = (-h * aspect) / 2;
    this.camera.right = (h * aspect) / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.position.x = this.shift - (this.panX / this.width) * h * aspect;
    this.camera.position.y = (this.panY / this.height) * h;
    this.camera.updateProjectionMatrix();
  }
  private draw(): void {
    this.framing();
    this.gl.render(this.scene, this.camera);
  }
  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.gl.setSize(this.width, this.height, false);
    this.draw();
  }
  show(view: View): void {
    this.retain([view]);
    this.ratio = view.size.height / view.size.width;
    this.single = view.pages.length === 1;
    this.shift = 0;
    this.front.visible = this.back.visible = false;
    this.page(this.left, this.single ? null : view.pages[0], view, -0.5);
    this.page(this.right, this.single ? view.pages[0] : view.pages[1], view, this.single ? 0 : 0.5);
    this.stacks.forEach((stack, i) => {
      stack.visible = this.single ? i === 1 : i === 0 ? !!view.pages[0] : !!view.pages[1];
      stack.position.set(this.single ? 0 : i === 0 ? -0.5 : 0.5, 0, -0.025);
      stack.scale.y = this.ratio;
    });
    this.draw();
  }
  turn(from: View, to: View, direction: 1 | -1, progress: number): void {
    this.retain([from, to]);
    this.ratio = from.size.height / from.size.width;
    this.single = from.pages.length === 1;
    const source = from.pages[this.single ? 0 : direction === 1 ? 1 : 0];
    const target = to.pages[this.single ? 0 : direction === 1 ? 0 : 1];
    this.page(
      this.left,
      this.single ? null : direction === 1 ? from.pages[0] : to.pages[0],
      direction === 1 ? from : to,
      -0.5,
    );
    this.page(
      this.right,
      this.single ? null : direction === 1 ? to.pages[1] : from.pages[1],
      direction === 1 ? to : from,
      0.5,
    );
    const frontSurface = source ? from.surfaces.get(source) : undefined,
      backSurface = target ? to.surfaces.get(target) : undefined;
    this.front.material.map = frontSurface ? this.texture(frontSurface) : null;
    this.back.material.map = backSurface ? this.texture(backSurface) : null;
    // For mirrored backward geometry, face orientation swaps.
    this.front.material.side = direction === 1 ? FrontSide : BackSide;
    this.back.material.side = direction === 1 ? BackSide : FrontSide;
    this.front.material.needsUpdate = this.back.material.needsUpdate = true;
    for (const [mesh, isBack] of [
      [this.front, false],
      [this.back, true],
    ] as const) {
      deformSheet(mesh.geometry, progress, this.ratio, direction);
      const uv = mesh.geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++)
        uv.setX(
          i,
          (isBack ? direction === 1 : direction === -1) ? 1 - (i % 41) / 40 : (i % 41) / 40,
        );
      uv.needsUpdate = true;
      mesh.visible = true;
      mesh.position.x = this.single ? -direction * 0.5 : 0;
    }
    this.shift = this.single ? -direction * progress : 0;
    this.stacks.forEach((stack, i) => {
      stack.visible = !this.single;
      stack.position.set(i === 0 ? -0.5 : 0.5, 0, -0.025);
      stack.scale.y = this.ratio;
    });
    this.draw();
  }
  setTransform(zoom: number, x: number, y: number): void {
    this.zoom = zoom;
    this.panX = x;
    this.panY = y;
    this.draw();
  }
  dispose(): void {
    this.element.removeEventListener('webglcontextlost', this.lost);
    for (const texture of this.textures.values()) texture.dispose();
    this.textures.clear();
    for (const remove of this.textureListeners.values()) remove();
    this.textureListeners.clear();
    for (const mesh of [
      this.left,
      this.right,
      this.front,
      this.back,
      this.ground,
      ...this.stacks,
    ]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.gl.dispose();
    this.gl.forceContextLoss();
    this.element.remove();
  }
}
