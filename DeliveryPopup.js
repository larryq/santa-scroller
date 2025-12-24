import * as THREE from "three";

function getVisibleHeightAtZ(z, camera) {
  const distance = Math.abs(z - camera.position.z);
  const vFOV = (camera.fov * Math.PI) / 180; // convert to radians
  return 2 * Math.tan(vFOV / 2) * distance;
}

// export class DeliveryPopup {
//   constructor(x, y, z, camera, text = "Delivered!") {
//     const canvas = document.createElement("canvas");
//     const ctx = canvas.getContext("2d");
//     canvas.width = 256;
//     canvas.height = 128;

//     ctx.font = "48px Arial";
//     ctx.fillStyle = "#ffffff";
//     ctx.textAlign = "center";
//     ctx.textBaseline = "middle";
//     ctx.fillText(text, canvas.width / 2, canvas.height / 2);

//     const texture = new THREE.CanvasTexture(canvas);
//     const material = new THREE.SpriteMaterial({
//       map: texture,
//       transparent: true,
//       opacity: 1.0,
//     });

//     this.sprite = new THREE.Sprite(material);
//     this.sprite.position.set(x, y, z);

//     const visibleHeight = getVisibleHeightAtZ(z, camera);
//     const scaleFactor = visibleHeight * 0.08; // tweak this number

//     this.sprite.scale.set(scaleFactor * 2, scaleFactor, 1);

//     this.life = 1.0;
//     this.fadeSpeed = 1.0;

//     scene.add(this.sprite);
//   }

//   update(delta) {
//     this.life -= delta;

//     // rise upward
//     this.sprite.position.y += 0.03;

//     // fade out
//     this.sprite.material.opacity -= this.fadeSpeed * delta;

//     if (this.life <= 0) {
//       scene.remove(this.sprite);
//       this.sprite.material.map.dispose();
//       this.sprite.material.dispose();
//       return false;
//     }

//     return true;
//   }
// }

export class DeliveryPopup {
  constructor(x, y, z, camera, text = "Delivered!", scene) {
    // -------------------------
    // 1. MAIN TEXT CANVAS
    // -------------------------
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 256;

    ctx.font = "96px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const textTexture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.SpriteMaterial({
      map: textTexture,
      transparent: true,
      opacity: 1.0,
    });

    this.textSprite = new THREE.Sprite(textMaterial);
    this.textSprite.position.set(x, y, z);

    // -------------------------
    // 2. GLOW CANVAS
    // -------------------------
    const glowCanvas = document.createElement("canvas");
    const glowCtx = glowCanvas.getContext("2d");
    glowCanvas.width = 512;
    glowCanvas.height = 256;

    glowCtx.font = "96px Arial";
    glowCtx.textAlign = "center";
    glowCtx.textBaseline = "middle";

    // ✅ Christmas glow: red + green
    glowCtx.shadowColor = "rgba(255, 0, 0, 0.9)";
    glowCtx.shadowBlur = 40;
    glowCtx.fillStyle = "rgba(0, 255, 0, 0.9)";
    glowCtx.fillText(text, glowCanvas.width / 2, glowCanvas.height / 2);

    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    this.glowSprite = new THREE.Sprite(glowMaterial);
    this.glowSprite.position.set(x, y, z);

    // -------------------------
    // 3. DYNAMIC SCALING
    // -------------------------
    const visibleHeight = getVisibleHeightAtZ(z, camera);
    const aspect = canvas.width / canvas.height;
    const popupHeight = visibleHeight * 0.08;

    // glow slightly larger
    this.glowSprite.scale.set(popupHeight * aspect * 1.4, popupHeight * 1.4, 1);
    this.textSprite.scale.set(popupHeight * aspect, popupHeight, 1);

    this.life = 1.0;
    this.fadeSpeed = 1.0;
    this.scene = scene;
    this.scene.add(this.glowSprite);
    // scene.add(this.textSprite);
  }

  update(delta) {
    this.life -= delta;

    // rise upward
    this.textSprite.position.y += 0.03;
    this.glowSprite.position.y += 0.03;

    // fade out
    this.textSprite.material.opacity -= this.fadeSpeed * delta;
    this.glowSprite.material.opacity -= this.fadeSpeed * delta;

    if (this.life <= 0) {
      this.scene.remove(this.textSprite);
      this.scene.remove(this.glowSprite);

      this.textSprite.material.map.dispose();
      this.textSprite.material.dispose();

      this.glowSprite.material.map.dispose();
      this.glowSprite.material.dispose();

      return false;
    }

    return true;
  }
}
