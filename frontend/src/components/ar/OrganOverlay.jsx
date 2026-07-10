import { getOrganCoordinates, organColors } from './OrganProjection';

export class OrganOverlay {
  constructor() {
    this.assets = {
      brain: '/organs/brain.png',
      heart: '/organs/heart.png',
      liver: '/organs/liver.png',
      lungs: '/organs/lungs.png',
      stomach: '/organs/stomach.png'
    };
    this.images = {};
    this.loaded = false;
    this.fadeStartTime = null;
    this.isFading = false;
  }

  async preload() {
    const promises = Object.entries(this.assets).map(([key, src]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        img.onload = () => {
          this.images[key] = img;
          resolve();
        };
        img.onerror = (err) => {
          console.error(`Failed to load organ asset: ${src}`, err);
          resolve(); // Resolve anyway to not block
        };
      });
    });
    await Promise.all(promises);
    this.loaded = true;
  }

  startFade() {
    this.fadeStartTime = Date.now();
    this.isFading = true;
  }

  getFadeOpacity() {
    if (!this.isFading) return 0.6; // default opacity
    const elapsed = Date.now() - this.fadeStartTime;
    const duration = 500; // 500ms fade duration
    if (elapsed >= duration) {
      this.isFading = false;
      return 0.6;
    }
    return (elapsed / duration) * 0.6;
  }

  renderCanvas(ctx, coordinates, canvasWidth, canvasHeight, selectedOrganId) {
    if (!this.loaded) return;

    const organsList = ['left_lung', 'right_lung', 'liver', 'stomach', 'heart', 'brain'];
    const organCoords = getOrganCoordinates(coordinates);
    const opacity = this.getFadeOpacity();

    organsList.forEach(organId => {
      const bbox = organCoords[organId];
      if (!bbox) return;

      const [x1, y1, x2, y2] = bbox;
      const w = x2 - x1;
      const h = y2 - y1;
      if (w <= 0 || h <= 0) return;

      const isSelected = organId === selectedOrganId;
      ctx.save();

      // Set drawing opacity (selected gets 0.95, others get animated/default opacity)
      ctx.globalAlpha = isSelected ? 0.95 : opacity;

      // Enable high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Apply selected glow style on Canvas
      if (isSelected) {
        ctx.shadowColor = organColors[organId] || '#00f2fe';
        ctx.shadowBlur = 20;
      }

      if (organId === 'left_lung' || organId === 'right_lung') {
        const img = this.images.lungs;
        if (img) {
          if (organId === 'right_lung') {
            // Left half of image (viewer's left)
            ctx.drawImage(img, 0, 0, img.width / 2, img.height, x1, y1, w, h);
          } else {
            // Right half of image (viewer's right)
            ctx.drawImage(img, img.width / 2, 0, img.width / 2, img.height, x1, y1, w, h);
          }
        }
      } else {
        const img = this.images[organId];
        if (img) {
          ctx.drawImage(img, x1, y1, w, h);
        }
      }

      ctx.restore();
    });
  }
}
