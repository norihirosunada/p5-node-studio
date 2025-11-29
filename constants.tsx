import { 
  Circle, Square, Move, ArrowRightCircle, Zap, Layers, Blend, Monitor 
} from 'lucide-react';
import { IOType, NodeCategory, NodeDefinition } from './types';

export const NODE_WIDTH = 200;
export const PREVIEW_HEIGHT = 100;
export const HEADER_HEIGHT = 40;

const CODE_TEMPLATES = {
  GEO_CIRCLE: `// @param radius 50 1 500 1
// @param r 255 0 255 1
// @param g 100 0 255 1
// @param b 100 0 255 1

return (pg) => {
    pg.noStroke();
    pg.fill(params.r, params.g, params.b);
    pg.circle(0, 0, params.radius);
};`,

  GEO_RECT: `// @param width 80 1 500 1
// @param height 60 1 500 1
// @param r 100 0 255 1
// @param g 100 0 255 1
// @param b 255 0 255 1

return (pg) => {
    pg.noStroke();
    pg.fill(params.r, params.g, params.b);
    pg.rectMode(p.CENTER);
    pg.rect(0, 0, params.width, params.height);
};`,

  GEO_TRANSFORM: `// @param tx 0 -200 200 1
// @param ty 0 -200 200 1
// @param rotate 0 -180 180 1
// @param scale 1 0.1 5 0.1

if (!input) return null;
return (pg) => {
    pg.push();
    pg.translate(params.tx, params.ty);
    pg.rotate(p.radians(params.rotate));
    pg.scale(params.scale);
    input(pg);
    pg.pop();
};`,

  GEO_RENDER: `// @param bg_r 0 0 255 1
// @param bg_g 0 0 255 1
// @param bg_b 0 0 255 1
// @param bg_a 0 0 255 1

pg.clear();
pg.background(params.bg_r, params.bg_g, params.bg_b, params.bg_a);
pg.push();
pg.translate(pg.width/2, pg.height/2);
if (typeof input === 'function') {
    input(pg); 
}
pg.pop();`,

  TEX_NOISE: `// @param scale 0.02 0.001 0.2 0.001
// @param timeSpeed 0.01 0 0.1 0.001

pg.loadPixels();
const scale = params.scale;
const ts = params.timeSpeed * p.millis();
for (let x = 0; x < pg.width; x += 4) {
    for (let y = 0; y < pg.height; y += 4) {
        let n = p.noise(x * scale, y * scale, ts);
        pg.fill(n * 255);
        pg.noStroke();
        pg.rect(x, y, 4, 4);
    }
}`,

  TEX_TRANSFORM: `// @param rotate 0 -180 180 1
// @param scale 1 0.1 5 0.1

pg.background(0);
pg.push();
pg.translate(pg.width / 2, pg.height / 2);
pg.rotate(p.radians(params.rotate));
pg.scale(params.scale);
pg.translate(-pg.width / 2, -pg.height / 2);
if (input) pg.image(input, 0, 0, pg.width, pg.height);
pg.pop();`,

  TEX_PIXELATE: `// @param resolution 10 4 50 1

const res = Math.max(4, params.resolution);
pg.noStroke();
if (input) {
    for (let x = 0; x < pg.width; x += res) {
        for (let y = 0; y < pg.height; y += res) {
            let c = input.get(x, y);
            pg.fill(c);
            pg.rect(x, y, res, res);
        }
    }
} else {
    pg.background(0);
}`,

  TEX_COMPOSITE: `// @param mode 0 0 5 1

const modes = ['BLEND', 'ADD', 'MULTIPLY', 'SCREEN', 'OVERLAY', 'DIFFERENCE'];
const modeIdx = Math.floor(params.mode) % modes.length;
const modeName = modes[modeIdx];

pg.clear();
if (inputs[0]) pg.image(inputs[0], 0, 0, pg.width, pg.height);

if (inputs[1]) {
    pg.push();
    pg.blendMode(p[modeName]);
    pg.image(inputs[1], 0, 0, pg.width, pg.height);
    pg.pop();
}

pg.push();
pg.fill(255);
pg.stroke(0);
pg.strokeWeight(2);
pg.textSize(12);
pg.text(modeName, 10, pg.height - 10);
pg.pop();`,

  FINAL_OUTPUT: `if (input) {
    pg.image(input, 0, 0, pg.width, pg.height);
} else {
    pg.background(20);
    pg.fill(100);
    pg.textAlign(p.CENTER, p.CENTER);
    pg.text("No Input", pg.width / 2, pg.height / 2);
}`
};

export const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  GEO_CIRCLE: { 
    label: 'Geo Circle', 
    type: IOType.GEO,
    category: NodeCategory.GEOMETRY,
    outputType: IOType.GEO,
    icon: Circle, 
    defaultCode: CODE_TEMPLATES.GEO_CIRCLE,
    color: 'border-yellow-500 bg-yellow-900/60 shadow-yellow-900/20'
  },
  GEO_RECT: { 
    label: 'Geo Rect', 
    type: IOType.GEO,
    category: NodeCategory.GEOMETRY,
    outputType: IOType.GEO,
    icon: Square, 
    defaultCode: CODE_TEMPLATES.GEO_RECT,
    color: 'border-yellow-500 bg-yellow-900/60 shadow-yellow-900/20'
  },
  GEO_TRANSFORM: { 
    label: 'Geo Transform', 
    type: IOType.GEO,
    category: NodeCategory.GEOMETRY,
    inputType: IOType.GEO,
    outputType: IOType.GEO,
    icon: Move, 
    defaultCode: CODE_TEMPLATES.GEO_TRANSFORM,
    color: 'border-yellow-500 bg-yellow-900/60 shadow-yellow-900/20'
  },
  GEO_RENDER: {
    label: 'Geo Render',
    type: IOType.TEX,
    category: NodeCategory.UTILITY,
    inputType: IOType.GEO,
    outputType: IOType.TEX,
    icon: ArrowRightCircle,
    defaultCode: CODE_TEMPLATES.GEO_RENDER,
    color: 'border-green-500 bg-green-900/60 shadow-green-900/20'
  },
  TEX_NOISE: { 
    label: 'Tex Noise', 
    type: IOType.TEX,
    category: NodeCategory.TEXTURE,
    outputType: IOType.TEX,
    icon: Zap, 
    defaultCode: CODE_TEMPLATES.TEX_NOISE,
    color: 'border-blue-500 bg-blue-900/60 shadow-blue-900/20'
  },
  TEX_TRANSFORM: { 
    label: 'Tex Transform', 
    type: IOType.TEX,
    category: NodeCategory.TEXTURE,
    inputType: IOType.TEX,
    outputType: IOType.TEX,
    icon: Move, 
    defaultCode: CODE_TEMPLATES.TEX_TRANSFORM,
    color: 'border-blue-500 bg-blue-900/60 shadow-blue-900/20'
  },
  TEX_PIXELATE: { 
    label: 'Pixelate', 
    type: IOType.TEX,
    category: NodeCategory.TEXTURE,
    inputType: IOType.TEX,
    outputType: IOType.TEX,
    icon: Layers, 
    defaultCode: CODE_TEMPLATES.TEX_PIXELATE,
    color: 'border-blue-500 bg-blue-900/60 shadow-blue-900/20'
  },
  TEX_COMPOSITE: {
    label: 'Composite',
    type: IOType.TEX,
    category: NodeCategory.TEXTURE,
    inputType: IOType.TEX,
    outputType: IOType.TEX,
    inputCount: 2, 
    icon: Blend,
    defaultCode: CODE_TEMPLATES.TEX_COMPOSITE,
    color: 'border-purple-500 bg-purple-900/60 shadow-purple-900/20'
  },
  FINAL_OUTPUT: { 
    label: 'Final Output', 
    type: IOType.TEX,
    category: NodeCategory.UTILITY,
    inputType: IOType.TEX,
    icon: Monitor, 
    defaultCode: CODE_TEMPLATES.FINAL_OUTPUT,
    color: 'border-white bg-neutral-800 shadow-white/20'
  },
};