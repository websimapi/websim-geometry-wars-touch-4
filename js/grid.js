import { canvas, ctx } from './canvas.js';
import { state } from './state.js';

class GridCell {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.distortion = 0;
        this.brightness = 0.1;
        // Base hue gradient across screen for rainbow effect
        this.baseHue = (x / Math.max(canvas.width, 1)) * 360; 
    }

    disturb(strength, color) {
        this.distortion = Math.min(this.distortion + strength, 1);
        this.brightness = Math.min(this.brightness + strength, 0.8);
    }

    update(dt, audioData) {
        const speedMultiplier = {
            'HD': 1,
            'LD': 2,
            'VLD': 3
        }[state.graphicsQuality] || 1;

        if (this.distortion > 0) {
            this.distortion -= 0.05 * speedMultiplier;
            this.brightness = Math.max(0.1, this.brightness - (0.02 * speedMultiplier));
        } else {
             // Pulse base brightness with music bass
             this.brightness = 0.1 + (audioData.bass * 0.3);
        }
    }

    draw(ctx, time, audioData) {
        // Optimization: Cull effectively invisible cells
        if (this.brightness < 0.05 && this.distortion <= 0.01) return;

        // Dynamic Rainbow: Base hue + time shift + music influence
        const hue = (this.baseHue + time * 0.02 + (audioData.mid * 50)) % 360;
        const sat = 60 + (audioData.treble * 40);
        const lit = Math.floor(Math.min(this.brightness * 100, 100));
        
        ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, 0.3)`;
        
        // Line width pulses with bass
        const bassPulse = audioData.bass * 2;
        ctx.lineWidth = (this.distortion > 0 ? 1 + this.distortion * 2 : 1) + bassPulse;

        let x = this.x;
        let y = this.y;

        // Fluid motion: slight wave movement based on time and audio
        const waveX = Math.sin(time * 0.001 + this.y * 0.01) * (audioData.bass * 10);
        const waveY = Math.cos(time * 0.001 + this.x * 0.01) * (audioData.bass * 10);

        if (this.distortion > 0.01) {
             // Simple jitter
             const jitter = this.distortion * 15;
             x += (Math.random() - 0.5) * jitter;
             y += (Math.random() - 0.5) * jitter;
        }

        ctx.beginPath();
        ctx.rect(x + waveX, y + waveY, this.size, this.size);
        ctx.stroke();
    }
}

export const grid = {
    cells: [],
    cellSize: 40,
    rows: 0,
    cols: 0,
    time: 0,
    lastAudioData: { bass: 0, mid: 0, treble: 0 },

    init() {
        this.cells = [];
        this.cols = Math.ceil(canvas.width / this.cellSize);
        this.rows = Math.ceil(canvas.height / this.cellSize);

        for (let x = 0; x < canvas.width; x += this.cellSize) {
            for (let y = 0; y < canvas.height; y += this.cellSize) {
                this.cells.push(new GridCell(x, y, this.cellSize));
            }
        }
    },

    update(dt = 16, audioData = { bass: 0, mid: 0, treble: 0 }) {
        this.time += dt;
        this.lastAudioData = audioData;
        
        this.cells.forEach(cell => cell.update(dt, audioData));
    },

    draw() {
        ctx.shadowBlur = 0; 
        
        const skipFactor = state.graphicsQuality === 'VLD' ? 2 : 1;
        
        for (let i = 0; i < this.cells.length; i += skipFactor) {
            this.cells[i].draw(ctx, this.time, this.lastAudioData);
        }
    },

    disturb(x, y, radius, strength, color) {
        // Optimization: Spatial Hashing / Direct Indexing
        const startCol = Math.floor((x - radius) / this.cellSize);
        const endCol = Math.ceil((x + radius) / this.cellSize);
        const startRow = Math.floor((y - radius) / this.cellSize);
        const endRow = Math.ceil((y + radius) / this.cellSize);

        for (let c = startCol; c < endCol; c++) {
            for (let r = startRow; r < endRow; r++) {
                if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
                    const index = c * this.rows + r;
                    const cell = this.cells[index];
                    if (cell) {
                        const dist = Math.sqrt((cell.x - x) ** 2 + (cell.y - y) ** 2);
                        if (dist < radius) {
                             const falloff = 1 - (dist / radius);
                             cell.disturb(strength * falloff, color || 'rgba(255,255,255,0.3)');
                        }
                    }
                }
            }
        }
    }
};