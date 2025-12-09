import { NodeData, EdgeData, IOType } from '../types';
import { NODE_DEFINITIONS, NODE_WIDTH, PREVIEW_HEIGHT, HEADER_HEIGHT } from '../constants';

interface CompiledFunction {
  code: string;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  fn: Function;
}

export class NodeEngine {
  private p5Instance: any = null;
  private graphicsBuffers: Map<string, any> = new Map();
  private compiledFunctions: Map<string, CompiledFunction> = new Map();
  private nodeDataCache: Map<string, any> = new Map();
  private nodes: NodeData[] = [];
  private edges: EdgeData[] = [];
  private logCallback: ((msg: string, type: 'info' | 'error' | 'success') => void) | null = null;
  private pressedKeys: Set<string> = new Set();
  private justPressedKeys: Set<string> = new Set();
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((e: KeyboardEvent) => void) | null = null;

  // Interactive State
  public connectingSource: string | null = null;
  public mouseX: number = 0;
  public mouseY: number = 0;
  public showBackgroundOutput: boolean = false;

  constructor(container: HTMLElement, logCallback: (msg: string, type: any) => void) {
    this.logCallback = logCallback;
    this.initP5(container);
  }

  public updateState(nodes: NodeData[], edges: EdgeData[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  public destroy() {
    if (this.p5Instance) {
      this.p5Instance.remove();
    }
    this.graphicsBuffers.clear();
    this.compiledFunctions.clear();
    this.nodeDataCache.clear();

    if (this.keydownHandler) window.removeEventListener('keydown', this.keydownHandler);
    if (this.keyupHandler) window.removeEventListener('keyup', this.keyupHandler);
  }

  private initP5(container: HTMLElement) {
    const p5Class = (window as any).p5;
    if (!p5Class) {
      console.error("p5.js not loaded");
      return;
    }

    const sketch = (p: any) => {
      p.setup = () => {
        const c = p.createCanvas(window.innerWidth, window.innerHeight);
        c.parent(container);
        p.frameRate(60);
        p.pixelDensity(1);
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };

      p.draw = () => {
        // Background Logic
        let bgDrawn = false;
        if (this.showBackgroundOutput) {
          const finalNode = this.nodes.find(n => n.defId === 'FINAL_OUTPUT');
          if (finalNode) {
            const output = this.nodeDataCache.get(finalNode.id);
            // Check if output is a p5.Graphics or p5.Image (has width/height/elt)
            if (output && output.elt) {
              p.image(output, 0, 0, p.width, p.height);
              // Add a dark overlay to make nodes readable
              p.fill(0, 150);
              p.rect(0, 0, p.width, p.height);
              bgDrawn = true;
            }
          }
        }

        if (!bgDrawn) {
          p.background(10, 10, 12); // Deep dark background
        }

        this.drawGrid(p);
        this.drawConnections(p);
        this.processNodes(p);
      };
    };

    this.p5Instance = new p5Class(sketch);

    this.bindKeyboard();
  }

  private drawGrid(p: any) {
    p.push();
    p.stroke(255, 10);
    p.strokeWeight(1);
    for (let x = 0; x < p.width; x += 50) p.line(x, 0, x, p.height);
    for (let y = 0; y < p.height; y += 50) p.line(0, y, p.width, y);
    p.pop();
  }

  private drawConnections(p: any) {
    p.push();
    p.noFill();
    p.strokeWeight(3);
    p.smooth();

    // Draw existing edges
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);

      if (sourceNode && targetNode) {
        const sDef = NODE_DEFINITIONS[sourceNode.defId];
        // Dynamic coloring based on type
        if (sDef.outputType === IOType.GEO) p.stroke(234, 179, 8); // Yellow-500
        else if (sDef.outputType === IOType.VALUE) p.stroke(236, 72, 153); // Pink-500
        else p.stroke(59, 130, 246); // Blue-500

        if (edge.paramKey) {
          this.drawParamCurve(p, sourceNode, targetNode, edge.paramKey);
        } else {
          this.drawCurve(p, sourceNode, targetNode, false, edge.inputIndex || 0);
        }
      }
    });

    // Draw active dragging connection
    if (this.connectingSource) {
      const sourceNode = this.nodes.find(n => n.id === this.connectingSource);
      if (sourceNode) {
        const sDef = NODE_DEFINITIONS[sourceNode.defId];
        if (sDef.outputType === IOType.GEO) p.stroke(234, 179, 8, 200);
        else if (sDef.outputType === IOType.VALUE) p.stroke(236, 72, 153, 200);
        else p.stroke(59, 130, 246, 200);

        this.drawCurve(p, sourceNode, null, true, 0);
      }
    }
    p.pop();
  }

  private drawCurve(p: any, n1: NodeData, n2: NodeData | null, active: boolean, inputIndex: number) {
    // Output port: Right side of preview (+ NODE_WIDTH)
    const startX = n1.x + NODE_WIDTH;
    const startY = n1.y + HEADER_HEIGHT + PREVIEW_HEIGHT / 2;

    let endX, endY;

    if (active) {
      endX = this.mouseX;
      endY = this.mouseY;
    } else if (n2) {
      // Calculate target port Y position based on input index
      const tDef = NODE_DEFINITIONS[n2.defId];
      const inputCount = tDef.inputCount !== undefined ? tDef.inputCount : (tDef.inputType ? 1 : 0);
      const topPercent = ((inputIndex + 1) / (inputCount + 1));

      endX = n2.x; // Left side of node
      endY = n2.y + HEADER_HEIGHT + (PREVIEW_HEIGHT * topPercent);
    } else {
      return;
    }

    const dist = Math.abs(endX - startX);
    const cp1x = startX + dist * 0.5;
    const cp2x = endX - dist * 0.5;

    p.bezier(startX, startY, cp1x, startY, cp2x, endY, endX, endY);
  }

  private drawParamCurve(p: any, n1: NodeData, n2: NodeData, paramKey: string) {
    const startX = n1.x + NODE_WIDTH;
    const startY = n1.y + HEADER_HEIGHT + PREVIEW_HEIGHT / 2;

    // Approximate param position
    // Header (40) + Preview (100) + Padding (8)
    // Each param block is approx 38px height (label + input + gaps)
    const paramIndex = Object.keys(n2.params).indexOf(paramKey);
    const endX = n2.x;
    const endY = n2.y + HEADER_HEIGHT + PREVIEW_HEIGHT + 16 + (paramIndex * 38);

    const dist = Math.abs(endX - startX);
    const cp1x = startX + dist * 0.5;
    const cp2x = endX - dist * 0.5;

    p.bezier(startX, startY, cp1x, startY, cp2x, endY, endX, endY);
  }

  private bindKeyboard() {
    this.keydownHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (!this.pressedKeys.has(e.key)) {
        this.justPressedKeys.add(e.key);
      }
      this.pressedKeys.add(e.key);
    };

    this.keyupHandler = (e: KeyboardEvent) => {
      this.pressedKeys.delete(e.key);
    };

    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
  }

  private processNodes(p: any) {
    // 1. Cleanup unused buffers
    const activeIds = new Set(this.nodes.map(n => n.id));
    for (const [id, buffer] of this.graphicsBuffers) {
      if (!activeIds.has(id)) {
        buffer.remove();
        this.graphicsBuffers.delete(id);
        this.nodeDataCache.delete(id);
        this.compiledFunctions.delete(id);
      }
    }

    // 2. Ensure buffers exist
    this.nodes.forEach(node => {
      if (!this.graphicsBuffers.has(node.id)) {
        const pg = p.createGraphics(200, 100);
        pg.pixelDensity(1);
        this.graphicsBuffers.set(node.id, pg);
      }
    });

    // 3. Execution Graph
    this.nodes.forEach(node => {
      const pg = this.graphicsBuffers.get(node.id)!;
      const inputEdges = this.edges.filter(e => e.target === node.id);

      // Resolve inputs from cache and map them to their specific indices
      // inputs[0] corresponds to inputIndex 0, inputs[1] to index 1, etc.
      const inputs: any[] = [];
      inputEdges.forEach(edge => {
        const val = this.nodeDataCache.get(edge.source);
        if (val) {
          inputs[edge.inputIndex || 0] = val;
        }
      });

      // Resolve Param Modulation
      const paramEdges = this.edges.filter(e => e.target === node.id && e.paramKey);
      const modulatedParams = { ...node.params };

      paramEdges.forEach(edge => {
        const val = this.nodeDataCache.get(edge.source);
        if (typeof val === 'number') {
          modulatedParams[edge.paramKey!] = val;

          // Direct DOM update for performance (Visual Feedback)
          const slider = document.getElementById(`slider-${node.id}-${edge.paramKey}`);
          const label = document.getElementById(`val-${node.id}-${edge.paramKey}`);

          if (slider && slider instanceof HTMLInputElement) {
            slider.value = String(val);
          }
          if (label) {
            label.innerText = val.toFixed(2);
          }
        }
      });

      const output = this.executeNode(p, pg, node, inputs, modulatedParams);
      this.nodeDataCache.set(node.id, output);

      // 4. Blit to DOM
      const domCanvas = document.getElementById(`preview-${node.id}`) as HTMLCanvasElement;
      if (domCanvas) {
        const ctx = domCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, domCanvas.width, domCanvas.height);
          ctx.drawImage(pg.elt, 0, 0);
        }
      }
    });

    // Clear one-shot key presses after processing
    this.justPressedKeys.clear();
  }

  private executeNode(p: any, pg: any, node: NodeData, inputs: any[], params: any) {
    let compiled = this.compiledFunctions.get(node.id);

    // Recompile if code changed
    if (!compiled || compiled.code !== node.code) {
      try {
        // Creating a safe-ish execution context
        const fn = new Function('p', 'pg', 't', 'input', 'inputs', 'params', 'log', 'keys', node.code);
        compiled = { code: node.code, fn };
        this.compiledFunctions.set(node.id, compiled);
      } catch (e: any) {
        if (this.logCallback) this.logCallback(`Compile Error ${node.id}: ${e.message}`, 'error');
        return null;
      }
    }

    const nodeDef = NODE_DEFINITIONS[node.defId];

    try {
      pg.clear();
      pg.reset();
      pg.push();
      // Default styling for preview
      pg.fill(255);
      pg.stroke(255);
      pg.strokeWeight(1);
      pg.imageMode(p.CORNER);
      pg.textAlign(p.LEFT, p.BASELINE);

      const keys = {
        pressed: new Set(this.pressedKeys),
        justPressed: new Set(this.justPressedKeys),
        isDown: (k: string) => this.pressedKeys.has(k),
        wasPressed: (k: string) => this.justPressedKeys.has(k)
      };

      // Execute
      const result = compiled.fn(
        p,
        pg,
        p.millis() * 0.001,
        inputs[0], // Convenience for single input
        inputs,
        params,
        (m: string) => this.logCallback && this.logCallback(m, 'info'),
        keys
      );
      pg.pop();

      // Handle GEO type special case (Functions)
      if (nodeDef.outputType === IOType.GEO) {
        if (typeof result === 'function') {
          // For the preview canvas of a GEO node, we execute the function to visualize it 
          pg.push();
          pg.translate(pg.width / 2, pg.height / 2);
          pg.noFill();
          pg.stroke(234, 179, 8); // Yellow representation
          result(pg);
          pg.pop();
          return result; // Pass function downstream
        }
      } else if (nodeDef.outputType === IOType.VALUE) {
        return result;
      } else {
        // TEX type passes the Graphics object (canvas)
        return pg;
      }

      return result;

    } catch (e: any) {
      // Runtime Error visual indicator
      pg.background(50, 0, 0);
      pg.fill(255);
      pg.textSize(10);
      pg.text(e.message, 5, 15);
      return null;
    }
  }
}