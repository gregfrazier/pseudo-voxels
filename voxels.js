import { terrain, heightMap, bg } from './images.js';

const screenDims = {
    w: 640,
    h: 480
};

const container = document.getElementById('cSurface');
const screen = document.createElement('canvas');
const mapCvs = document.createElement('canvas');
const heightMapCvs = document.createElement('canvas');
const skyCvs = document.createElement('canvas');

screen.width = screenDims.w;
screen.height = screenDims.h;
screen.className = "fullscreen";
container.appendChild(screen);

let camera = {
    x: 445,
    y: 400,
    height: 250,
    angle: 0,
    horizon: 10, //90,
    distance: 1800,
    detail: 800,
    fidelity: 2,
    fov: 0,
    attachTerrain: false
};

// Image loading tracking array (wait for images to load before executing code using them)
const fire = [0, 0, 0];        

const terrainTexture = new Image();
const heightMapTexture = new Image();
const bgTexture = new Image();
terrainTexture.src = terrain;
heightMapTexture.src = heightMap;
bgTexture.src = bg;

var keyboard = {
    up: false,
    down: false,
    right: false,
    left: false,
    rays: false,
    fishEye: false,
    fovMod: false,
    floor: true,
    sky: true,
    Mouse: {
        x: 0,
        y: 0,
        button: false
    }
};

class Render {
    constructor(surface) {
        this.renderStack = [];
        this.fps = 0;
        this.times = [];
        this.surface = surface;
    }
    add(context, func) {
        this.renderStack.push({ context: context, f: func });
        return this;
    }
    render() {
        let self = this;
        window.requestAnimationFrame(function () {
            // FPS counting adapted from: https://www.growingwiththeweb.com/2017/12/fast-simple-js-fps-counter.html
            const now = performance.now();
            while (self.times.length > 0 && self.times[0] <= now - 1000) {
                self.times.shift();
            }
            self.times.push(now);
            self.fps = self.times.length;

            for (const key in self.renderStack) {
                if (Object.hasOwnProperty.call(self.renderStack, key)) {
                    const element = self.renderStack[key];
                    element.f.call(element.context);
                }
            }
            self.surface.globalAlpha = 1;
            self.surface.fillStyle = 'white';
            self.surface.fillText(`fps: ${self.fps}`, screenDims.w - 40, 10);
            self.render();
        });
    }
}

// Base class
class Graphics {
    constructor(surface, srcWidth, srcHeight) {
        this.surface = surface;
        this.imageData = this.surface.getImageData(0, 0, srcWidth, srcHeight);
        this.width = srcWidth;
        this.height = srcHeight;
    }
    setPoint(imageData, x, y, color, blend) {
        if (blend == null)
            blend = 1;
        const idx = (x + this.width * y) * 4;
        const r = ((color.r * blend) | 0);
        const g = ((color.g * blend) | 0);
        const b = ((color.b * blend) | 0);
        imageData.data[idx] = r > 255 ? 255 : r;
        imageData.data[idx + 1] = g > 255 ? 255 : g;
        imageData.data[idx + 2] = b > 255 ? 255 : b;
        imageData.data[idx + 3] = 255;
    }
    getPoint = function (imageData, x, y) {
        const w = imageData.width, h = imageData.height;
        if (x < 0 || x > w || y < 0 || y > h) {
            x = (w + x) % w;
            y = (h + y) % h;
        }
        const idx = (x + w * y) * 4;
        var r = imageData.data[idx];
        var g = imageData.data[idx + 1];
        var b = imageData.data[idx + 2];
        return { r: r, g: g, b: b };
    }
    refresh() {
        this.imageData = this.surface.getImageData(0, 0, this.width, this.height);
    }
    draw() { }
    render() {
        this.draw();
        this.surface.putImageData(this.imageData, 0, 0);
    }
}

class Player {
    update() {
        if (keyboard.up) {
            camera.x -= Math.sin( camera.angle ) * 6.9;
            camera.y -= Math.cos( camera.angle ) * 6.9;
        }
        if (keyboard.down) {
            camera.x += Math.sin( camera.angle ) * 6.9;
            camera.y += Math.cos( camera.angle ) * 6.9;
        }
        if (keyboard.right) {
            camera.angle -= 0.05;
        }
        if (keyboard.left) {
            camera.angle += 0.05;
        }
    }
}

class SimpleGraphic extends Graphics {
    constructor(texture, tWidth, tHeight, surface, srcWidth, srcHeight) {
        super(surface, srcWidth, srcHeight);
        this.texture = texture;
        this.tWidth = tWidth;
        this.tHeight = tHeight;
        this.srcWidth = srcWidth;
        this.srcHeight = srcHeight;
        this.offset = { x: 0, y: 0 };
    }
    translate(x, y) {
        this.offset.x = x;
        this.offset.y = y;
        return this;
    }
    draw() {
        this.surface.drawImage(this.texture, this.offset.x, this.offset.y, this.tWidth, this.tHeight,
                                0, 0, this.srcWidth, this.srcHeight);
    }
}

class CameraStats {
    constructor(surface) { 
        this.surface = surface;
        this.startLine = 0;
    }
    reset() {
        this.startLine = 0;
    }
    next() {
        return this.startLine += 10;
    }
    draw() {
        this.reset();
        this.surface.globalAlpha = 0.3;
        this.surface.fillStyle = 'green';
        this.surface.fillRect(3, this.startLine, 160, 95);
        this.surface.globalAlpha = 1;
        this.surface.fillStyle = 'white';

        this.surface.fillText(`Location: ${~~camera.x}, ${~~camera.y}`, 5, this.next());
        this.surface.fillText(`Angle: ${camera.angle}`, 5, this.next());
        this.surface.fillText(`Detail (Vert): ${camera.detail}`, 5, this.next());
        this.surface.fillText(`Detail (Horiz): ${camera.fidelity}`, 5, this.next());
        this.surface.fillText(`View Distance: ${camera.distance}`, 5, this.next());
        this.surface.fillText(`FOV: ${camera.fov}`, 5, this.next());
        this.surface.fillText(`Camera Height: ${camera.height}`, 5, this.next());
        this.surface.fillText(`Horizon Height (Look up/down): ${camera.horizon}`, 5, this.next());
        this.surface.fillText(`Lock Height: ${camera.attachTerrain}`, 5, this.next());
    }
}

class KeysLegend {
    constructor(surface) {
        this.surface = surface;
        this.startLine = 100;
    }
    reset() {
        this.startLine = screenDims.h - 100;
    }
    next() {
        return this.startLine += 10;
    }
    draw() {
        this.reset();

        this.surface.globalAlpha = 0.3;
        this.surface.fillStyle = 'blue';
        this.surface.fillRect(3, this.startLine, 160, 90);

        this.surface.globalAlpha = 1;
        this.surface.fillStyle = 'white';
        this.surface.fillText(`Move with Arrows`, 5, this.next());
        this.surface.fillText(`Vertical Detail: -, =`, 5, this.next());
        this.surface.fillText(`Horizontal Detail: [, ]`, 5, this.next());
        this.surface.fillText(`Distance: <, >`, 5, this.next());
        this.surface.fillText(`FOV: Page Up, Page Down`, 5, this.next());
        this.surface.fillText(`Camera Height: Home, End`, 5, this.next());
        this.surface.fillText(`Look Up/Down: Insert, Delete`, 5, this.next());
        this.surface.fillText(`Lock height to terrain, Space key`, 5, this.next());
    }
}

class Fov {
    constructor(cam) {
        this.camera = cam;
    }
    r2d(angle) { return angle * 57.295779513082; }
    d2r(angle) { return angle * 0.017453292519; } // degrees to radians
    getFov() {
        return {
            sinangL: Math.sin(this.camera.angle + this.d2r(this.camera.fov)),
            cosangL: Math.cos(this.camera.angle + this.d2r(this.camera.fov)),
            sinangR: Math.sin(this.camera.angle - this.d2r(this.camera.fov)),
            cosangR: Math.cos(this.camera.angle - this.d2r(this.camera.fov))
        };
    }
    getSegment(z, fov) {
        return { 
            left: {
                x: (-fov.cosangL * z - fov.sinangL * z),
                y: (fov.sinangL * z - fov.cosangL * z)
            },
            right: {
                x: (fov.cosangR * z - fov.sinangR * z),
                y: (-fov.sinangR * z - fov.cosangR * z)
            }
        };
    }
}

class VoxelEngine extends Graphics {
    constructor(terrain, heightMap, surface, srcWidth, srcHeight, terrainWidth, terrainHeight) {
        super(surface, srcWidth, srcHeight);
        // Terrain texture
        this.terrain = terrain;
        this.terrain.drawImage(terrainTexture, 0, 0);
        this.terrainData = this.terrain.getImageData(0, 0, terrainWidth, terrainHeight);
        // Heightmap texture (assumed to be equal in size of terrain texture)
        this.heightMap = heightMap;
        this.heightMap.drawImage(heightMapTexture, 0, 0);
        this.heightData = this.heightMap.getImageData(0, 0, terrainWidth, terrainHeight);

        this.fov = new Fov(camera);
    }
    drawVertLine(x1, y1, y2, color) {
        // Draw double-wide vertical line of a single color
        for (let i = y1; i < y2; i++) {
            this.setPoint(this.imageData, x1, i, color);
            if (camera.fidelity === 2) {
                this.setPoint(this.imageData, x1 + 1, i, color);
            } else {
                for (let f = 1; f < camera.fidelity; f++)
                    this.setPoint(this.imageData, x1 + f, i, color);
            }
        }
    }
    draw() {
        // grab the latest buffer of the screen
        this.refresh();
        
        // Get angles based on camera and field of view
        const fovCalcs = this.fov.getFov();

        // Get the camera height by checking the location of the camera against the height map
        const hScale = screenDims.h / 128; //255;
        const vScale = 0.2;
        
        // Camera is either fixed above the landscape, or dynamically attached to the high point under the camera
        const cameraHeight = (!camera.attachTerrain) ? ~~(camera.height * hScale) : 
            ~~(this.getPoint(this.heightData, ~~(camera.x * vScale), ~~(camera.y * vScale)).r * hScale) + ~~(camera.height * hScale);
        
        // optimize drawing by accounting for already drawn lines in a column
        const hBuffer = [...Array(screenDims.w)].map(x => screenDims.h);
        const widthDims = screenDims.w;

        for (let z1 = 0; z1 < 1; z1 += (1 / camera.detail)) {
            const z = Math.pow(2, 10 * z1 - 10) * camera.distance;
            const segment = this.fov.getSegment(z, fovCalcs);

            // split segment by width of screen
            const dx = ((segment.right.x - segment.left.x) / widthDims) * camera.fidelity;
            const dy = ((segment.right.y - segment.left.y) / widthDims) * camera.fidelity;

            // translate to point on map
            segment.left.x += camera.x;
            segment.left.y += camera.y;
            
            const scale = 1.0 / z * 100.0;
            for (let i = 0; i < screenDims.w; i += camera.fidelity) {
                let hMap = ~~(this.getPoint(this.heightData, ~~(segment.left.x * vScale), ~~(segment.left.y * vScale)).r * hScale);
                let hgt = (cameraHeight - hMap) * scale + camera.horizon;
                // draw the line from (i, hgt) to (i, screen height)
                let p = this.getPoint(this.terrainData, ~~(segment.left.x * vScale), ~~(segment.left.y * vScale));
                let lineBuffer = hBuffer[i];
                if (hBuffer[i] > hgt) {
                    hBuffer[i] = hgt;
                }
                this.drawVertLine(i, ~~hgt, lineBuffer, p);
                // advance
                segment.left.x += dx;
                segment.left.y += dy;
            }
        }
        this.surface.putImageData(this.imageData, 0, 0);
    }
}

function popAndGo() {
    fire.pop();
    if (fire.length == 0) {
        go();
    }
}

terrainTexture.onload = function () {
    popAndGo();
};

heightMapTexture.onload = function () {
    popAndGo();
};

bgTexture.onload = function () {
    popAndGo();
};

var captureKeys = function (e) {
    "undefined" == typeof e && (e = window.event);
    switch ([36, 35, 32, 38, 37, 40, 39, 49, 50, 33, 34, 45, 46, 188, 190, 219, 221, 189, 187].indexOf(e.which || e.keyCode)) {
        /* HOME  */ case 0: camera.height += 5; break;
        /* END   */ case 1: camera.height -= 5; break;
        /* SPACE */ case 2: camera.attachTerrain = !camera.attachTerrain; break;
        /* UP    */ case 3: keyboard.up = true; break;
        /* LEFT  */ case 4: keyboard.left = true; break;
        /* DOWN  */ case 5: keyboard.down = true; break;
        /* RIGHT */ case 6: keyboard.right = true; break;
        /* PG UP */ case 9: camera.fov++; break;
        /* PG DN */ case 10: camera.fov--; break;
        /* INSRT */ case 11: camera.horizon += 5; break;
        /* DELET */ case 12: camera.horizon -= 5; break;
        /* <     */ case 13: camera.distance += 50; break;
        /* >     */ case 14: camera.distance -= 50; break;
        /* [     */ case 15: camera.fidelity += 1; break;
        /* ]     */ case 16: if (camera.fidelity > 1) { camera.fidelity -= 1; } break;
        /* -     */ case 17: if (camera.detail > 25) { camera.detail -= 24; } break;
        /* +     */ case 18: camera.detail += 24; break;
        default: console.log(e.which || e.keyCode); return;
    }
    e.returnValue = !1, e.preventDefault && e.preventDefault();
};

var uncaptureKeys = function (e) {
    "undefined" == typeof e && (e = window.event);

    switch ([69, 38, 37, 40, 39].indexOf(e.which || e.keyCode)) {
        case 1: keyboard.up = false; break;
        case 2: keyboard.left = false; break;
        case 3: keyboard.down = false; break;
        case 4: keyboard.right = false; break;
        default: return;
    }
    e.returnValue = !1, e.preventDefault && e.preventDefault();
};

// Bootstrap
let go = function () {
    
    const initTexture = function(width, height, surface, texture) {
        surface.width = width;
        surface.height = height;
        const bgSurface = surface.getContext('2d');
        bgSurface.drawImage(texture, 0, 0);
        return bgSurface;
    };

    const screenSurface = screen.getContext('2d');

    let hm = initTexture(1024, 1024, heightMapCvs, heightMapTexture);
    let tm = initTexture(1024, 1024, mapCvs, terrainTexture);

    const voxel = new VoxelEngine(tm, hm, screenSurface, screenDims.w, screenDims.h, 1024, 1024);
    const skyBg = new SimpleGraphic(bgTexture, 422, 237, screenSurface, screenDims.w, screenDims.h);
    const p = new Player();

    document.addEventListener("keydown", function (t) { captureKeys(t); }, true);
    document.addEventListener("keyup", function (t) { uncaptureKeys(t); }, true);
    const stats = new CameraStats(screenSurface);
    const keys = new KeysLegend(screenSurface);

    const renderer = new Render(screenSurface);
    renderer.add(skyBg, skyBg.draw);
    renderer.add(voxel, voxel.draw);
    renderer.add(p, p.update);
    renderer.add(stats, stats.draw);
    renderer.add(keys, keys.draw);
    renderer.render();
};