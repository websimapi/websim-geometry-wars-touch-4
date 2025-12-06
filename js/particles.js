import { ctx } from './canvas.js';
import { state } from './state.js';
import { grid } from './grid.js';
import { replay } from './replay.js';

export const particles = [];
const MAX_PARTICLES = 350; // Performance Hard Limit

export function createParticles(x, y, type) {
    if (state.gameActive && !state.isReplaying) {
        replay.addEvent('particles', { x, y, t: type });
    }

    if (particles.length > MAX_PARTICLES) {
        // Remove oldest particles to maintain performance
        particles.splice(0, particles.length - MAX_PARTICLES + 30);
    }

    const baseColors = {
        'snake': ["0,255,255", "0,200,255", "100,255,255"],
        'square': ["0,255,0", "100,255,100", "150,255,150"],
        'diamond': ["0,0,255", "100,100,255", "150,150,255"],
        'spiky': ["255,20,147", "255,100,180", "255,150,200"],
        'octagon': ["255,0,255", "255,100,255", "255,150,255"],
        'star': ["255,255,0", "255,255,100", "255,255,150"],
        'powerup': ["255,215,0", "255,200,0", "255,180,0"],
        'player': ["255,255,255", "200,200,255", "180,180,255"]
    };

    const colors = baseColors[type] || ["255,255,255"];
    
    // Optimized particle counts - lower quantity but maintained density via visual tricks
    const particleCount = {
        'HD': (type === 'powerup' ? 35 : 25),
        'LD': (type === 'powerup' ? 15 : 10),
        'VLD': (type === 'powerup' ? 8 : 5)
    }[state.graphicsQuality];

    const speed = type === 'powerup' ? 25 : 20;

    for (let i = 0; i < particleCount; i++) {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * speed,
            vy: (Math.random() - 0.5) * speed,
            size: Math.random() * 4 + 2,
            life: 1,
            decay: Math.random() * 0.02 + 0.015,
            color: randomColor,
            trail: state.graphicsQuality === 'HD' ? [] : null // Only store trail for HD
        });
    }

    // Grid disturbance - simplified
    const distRadius = state.graphicsQuality === 'VLD' ? 50 : 120;
    const distStrength = state.graphicsQuality === 'VLD' ? 0.2 : 0.8;
    const distColor = `rgba(${colors[0]},0.25)`;

    grid.disturb(x, y, distRadius, distStrength, distColor);
}

export function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94; // Friction
        p.vy *= 0.94;
        p.life -= p.decay;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        // Update trail only for HD
        if (p.trail) {
            p.trail.push({x: p.x, y: p.y});
            if (p.trail.length > 5) p.trail.shift();
        }
    }
}

export function drawParticles() {
    if (particles.length === 0) return;

    ctx.save();
    // Optimization: Use additive blending for glow effect instead of expensive shadowBlur
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 0; // Ensure shadow is OFF

    const isHD = state.graphicsQuality === 'HD';

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const alpha = p.life;
        
        ctx.fillStyle = `rgba(${p.color},${alpha})`;
        
        // Use fillRect instead of arc (much faster)
        // Draw head
        const s = p.size;
        ctx.fillRect(p.x - s/2, p.y - s/2, s, s);

        // Simple trail drawing for HD
        if (isHD && p.trail && p.trail.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${p.color},${alpha * 0.5})`;
            ctx.lineWidth = s * 0.6;
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            // Skip points for speed if needed, but 5 points is fine
            for (let j = 1; j < p.trail.length; j++) {
                ctx.lineTo(p.trail[j].x, p.trail[j].y);
            }
            ctx.stroke();
        }
    }
    ctx.restore();
}