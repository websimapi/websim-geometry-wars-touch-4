import { ctx, canvas } from './canvas.js';
import { player } from './player.js';
import { input } from './input.js';
import { state } from './state.js';

export const bullets = [];

export function shootBullet() {
    if (!input.touch.active || !input.mouse.leftDown) return;

    const dx = input.touch.x - player.x;
    const dy = input.touch.y - player.y;
    const angle = Math.atan2(dy, dx);

    const spread = (state.bulletAngles - 1) * state.bulletSpreadAngle;

    for (let i = 0; i < state.bulletAngles; i++) {
        const bulletAngle = angle - spread/2 + (i * spread/(state.bulletAngles-1 || 1));
        bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(bulletAngle) * state.bulletSpeed,
            vy: Math.sin(bulletAngle) * state.bulletSpeed
        });
    }
}

export function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }
}

export function drawBullets() {
    ctx.save();
    
    // Optimization: Use 'lighter' for cheap glow, avoid shadowBlur
    if (state.graphicsQuality === 'HD') {
        ctx.globalCompositeOperation = 'lighter';
        // Draw a larger faint circle for glow instead of using shadowBlur logic if really needed, 
        // or just rely on the brightness of lighter mode. 
        // Let's stick to simple drawing for performance.
    }
    
    ctx.fillStyle = '#fff';

    // Optimization: Batch path creation? 
    ctx.beginPath();
    bullets.forEach(b => {
        // Use rect for bullets too if things get really heavy, but circle is iconic. 
        // Keeping move to + arc in one path is faster than individual paths.
        ctx.moveTo(b.x + 4, b.y);
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    });
    ctx.fill();

    ctx.restore();
}