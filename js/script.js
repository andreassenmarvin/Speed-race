var Dom = {

    get: function (id) {
        return ((id instanceof HTMLElement) || (id === document)) ? id : document.getElementById(id);
    },
    set: function (id, html) {
        Dom.get(id).innerHTML = html;
    },
    on: function (ele, type, fn, capture) {
        Dom.get(ele).addEventListener(type, fn, capture);
    },
    un: function (ele, type, fn, capture) {
        Dom.get(ele).removeEventListener(type, fn, capture);
    },
    show: function (ele, type) {
        Dom.get(ele).style.display = (type || 'block');
    },
    blur: function (ev) {
        ev.target.blur();
    },

    addClassName: function (ele, name) {
        Dom.toggleClassName(ele, name, true);
    },
    removeClassName: function (ele, name) {
        Dom.toggleClassName(ele, name, false);
    },
    toggleClassName: function (ele, name, on) {
        ele = Dom.get(ele);
        var classes = ele.className.split(' ');
        var n = classes.indexOf(name);
        on = (typeof on == 'undefined') ? (n < 0) : on;
        if (on && (n < 0))
            classes.push(name);
        else if (!on && (n >= 0))
            classes.splice(n, 1);
        ele.className = classes.join(' ');
    },

    storage: window.localStorage || {}

}


// general purpose helpers (mostly math)

var Util = {

    timestamp: function () {
        return new Date().getTime();
    },
    toInt: function (obj, def) {
        if (obj !== null) {
            var x = parseInt(obj, 10);
            if (!isNaN(x)) return x;
        }
        return Util.toInt(def, 0);
    },
    toFloat: function (obj, def) {
        if (obj !== null) {
            var x = parseFloat(obj);
            if (!isNaN(x)) return x;
        }
        return Util.toFloat(def, 0.0);
    },
    limit: function (value, min, max) {
        return Math.max(min, Math.min(value, max));
    },
    randomInt: function (min, max) {
        return Math.round(Util.interpolate(min, max, Math.random()));
    },
    randomChoice: function (options) {
        return options[Util.randomInt(0, options.length - 1)];
    },
    percentRemaining: function (n, total) {
        return (n % total) / total;
    },
    accelerate: function (v, accel, dt) {
        return v + (accel * dt);
    },
    interpolate: function (a, b, percent) {
        return a + (b - a) * percent
    },
    easeIn: function (a, b, percent) {
        return a + (b - a) * Math.pow(percent, 2);
    },
    easeOut: function (a, b, percent) {
        return a + (b - a) * (1 - Math.pow(1 - percent, 2));
    },
    easeInOut: function (a, b, percent) {
        return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
    },
    exponentialFog: function (distance, density) {
        return 1 / (Math.pow(Math.E, (distance * distance * density)));
    },

    increase: function (start, increment, max) { // with looping
        var result = start + increment;
        while (result >= max)
            result -= max;
        while (result < 0)
            result += max;
        return result;
    },

    project: function (p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
        p.camera.x = (p.world.x || 0) - cameraX;
        p.camera.y = (p.world.y || 0) - cameraY;
        p.camera.z = (p.world.z || 0) - cameraZ;
        p.screen.scale = cameraDepth / p.camera.z;
        p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
        p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
        p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
    },

    overlap: function (x1, w1, x2, w2, percent) {
        var half = (percent || 1) / 2;
        var min1 = x1 - (w1 * half);
        var max1 = x1 + (w1 * half);
        var min2 = x2 - (w2 * half);
        var max2 = x2 + (w2 * half);
        return !((max1 < min2) || (min1 > max2));
    }

}


// POLYFILL for requestAnimationFrame

if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback, element) {
            window.setTimeout(callback, 1000 / 60);
        }
}


// GAME LOOP helpers

var Game = { // a modified version of the game loop from my previous boulderdash game - see http://codeincomplete.com/posts/2011/10/25/javascript_boulderdash/#gameloop

    run: function (options) {

        Game.loadImages(options.images, function (images) {

            options.ready(images); // tell caller to initialize itself because images are loaded and we're ready to rumble

            Game.setKeyListener(options.keys);

            var canvas = options.canvas, // canvas render target is provided by caller
                update = options.update, // method to update game logic is provided by caller
                render = options.render, // method to render the game is provided by caller
                step = options.step, // fixed frame step (1/fps) is specified by caller
                stats = options.stats, // stats instance is provided by caller
                now = null,
                last = Util.timestamp(),
                dt = 0,
                gdt = 0;

            function frame() {
                now = Util.timestamp();
                dt = Math.min(1, (now - last) / 1000); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
                gdt = gdt + dt;
                while (gdt > step) {
                    gdt = gdt - step;
                    update(step);
                }
                render();
                stats.update();
                last = now;
                requestAnimationFrame(frame, canvas);
            }
            frame(); // lets get this party started
            Game.playMusic();
        });
    },


    loadImages: function (names, callback) { // load multiple images and callback when ALL images have loaded
        var result = [];
        var count = names.length;

        var onload = function () {
            if (--count == 0)
                callback(result);
        };

        for (var n = 0; n < names.length; n++) {
            var name = names[n];
            result[n] = document.createElement('img');
            Dom.on(result[n], 'load', onload);
            result[n].src = "images/" + name + ".png";
        }
    },

    setKeyListener: function (keys) {
        var onkey = function (keyCode, mode) {
            var n, k;
            for (n = 0; n < keys.length; n++) {
                k = keys[n];
                k.mode = k.mode || 'up';
                if ((k.key == keyCode) || (k.keys && (k.keys.indexOf(keyCode) >= 0))) {
                    if (k.mode == mode) {
                        k.action.call();
                    }
                }
            }
        };
        Dom.on(document, 'keydown', function (ev) {
            onkey(ev.keyCode, 'down');
        });
        Dom.on(document, 'keyup', function (ev) {
            onkey(ev.keyCode, 'up');
        });
    },

    stats: function (parentId, id) { // construct mr.doobs FPS counter - along with friendly good/bad/ok message box

        var result = new Stats();
        result.domElement.id = id || 'stats';
        Dom.get(parentId).appendChild(result.domElement);

        var msg = document.createElement('div');
        msg.style.cssText = "border: 2px solid gray; padding: 5px; margin-top: 5px; text-align: left; font-size: 1.15em; text-align: right;";
        msg.innerHTML = "Your canvas performance is ";
        Dom.get(parentId).appendChild(msg);

        var value = document.createElement('span');
        value.innerHTML = "...";
        msg.appendChild(value);

        setInterval(function () {
            var fps = result.current();
            var ok = (fps > 50) ? 'good' : (fps < 30) ? 'bad' : 'ok';
            var color = (fps > 50) ? 'green' : (fps < 30) ? 'red' : 'gray';
            value.innerHTML = ok;
            value.style.color = color;
            msg.style.borderColor = color;
        }, 5000);
        return result;
    },


    playMusic: function () {
        var music = Dom.get('music');
        music.loop = true;
        music.volume = 0.05; // shhhh! annoying music!
        music.muted = (Dom.storage.muted === "true");
        music.play();
        Dom.toggleClassName('mute', 'on', music.muted);
        Dom.on('mute', 'click', function () {
            Dom.storage.muted = music.muted = !music.muted;
            Dom.toggleClassName('mute', 'on', music.muted);
        });
    }

}


// canvas rendering helpers

var Render = {

    polygon: function (ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fill();
    },


    segment: function (ctx, width, lanes, x1, y1, w1, x2, y2, w2, fog, color) {

        var r1 = Render.rumbleWidth(w1, lanes),
            r2 = Render.rumbleWidth(w2, lanes),
            l1 = Render.laneMarkerWidth(w1, lanes),
            l2 = Render.laneMarkerWidth(w2, lanes),
            lanew1, lanew2, lanex1, lanex2, lane;

        ctx.fillStyle = color.grass;
        ctx.fillRect(0, y2, width, y1 - y2);

        Render.polygon(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble);
        Render.polygon(ctx, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble);
        Render.polygon(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);

        if (color.lane) {
            lanew1 = w1 * 2 / lanes;
            lanew2 = w2 * 2 / lanes;
            lanex1 = x1 - w1 + lanew1;
            lanex2 = x2 - w2 + lanew2;
            for (lane = 1; lane < lanes; lanex1 += lanew1, lanex2 += lanew2, lane++)
                Render.polygon(ctx, lanex1 - l1 / 2, y1, lanex1 + l1 / 2, y1, lanex2 + l2 / 2, y2, lanex2 - l2 / 2, y2, color.lane);
        }

        Render.fog(ctx, 0, y1, width, y2 - y1, fog);
    },


    background: function (ctx, background, width, height, layer, rotation, offset) {

        rotation = rotation || 0;
        offset = offset || 0;

        var imageW = layer.w / 2;
        var imageH = layer.h;

        var sourceX = layer.x + Math.floor(layer.w * rotation);
        var sourceY = layer.y
        var sourceW = Math.min(imageW, layer.x + layer.w - sourceX);
        var sourceH = imageH;

        var destX = 0;
        var destY = offset;
        var destW = Math.floor(width * (sourceW / imageW));
        var destH = height;

        ctx.drawImage(background, sourceX, sourceY, sourceW, sourceH, destX, destY, destW, destH);
        if (sourceW < imageW)
            ctx.drawImage(background, layer.x, sourceY, imageW - sourceW, sourceH, destW - 1, destY, width - destW, destH);
    },

    //---------------------------------------------------------------------------

    sprite: function (ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY, offsetX, offsetY, clipY) {

        //  scale for projection AND relative to roadWidth (for tweakUI)
        var destW = (sprite.w * scale * width / 2) * (SPRITES.SCALE * roadWidth);
        var destH = (sprite.h * scale * width / 2) * (SPRITES.SCALE * roadWidth);

        destX = destX + (destW * (offsetX || 0));
        destY = destY + (destH * (offsetY || 0));

        var clipH = clipY ? Math.max(0, destY + destH - clipY) : 0;
        if (clipH < destH)
            ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h - (sprite.h * clipH / destH), destX, destY, destW, destH - clipH);

    },


    player: function (ctx, width, height, resolution, roadWidth, sprites, speedPercent, scale, destX, destY, steer, updown) {

        var bounce = (1.5 * Math.random() * speedPercent * resolution) * Util.randomChoice([-1, 1]);
        var sprite;
        if (steer < 0)
            sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_LEFT : SPRITES.PLAYER_LEFT;
        else if (steer > 0)
            sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_RIGHT : SPRITES.PLAYER_RIGHT;
        else
            sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_STRAIGHT : SPRITES.PLAYER_STRAIGHT;

        Render.sprite(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY + bounce, -0.5, -1);
    },

    //---------------------------------------------------------------------------

    fog: function (ctx, x, y, width, height, fog) {
        if (fog < 1) {
            ctx.globalAlpha = (1 - fog)
            ctx.fillStyle = COLORS.FOG;
            ctx.fillRect(x, y, width, height);
            ctx.globalAlpha = 1;
        }
    },

    rumbleWidth: function (projectedRoadWidth, lanes) {
        return projectedRoadWidth / Math.max(6, 2 * lanes);
    },
    laneMarkerWidth: function (projectedRoadWidth, lanes) {
        return projectedRoadWidth / Math.max(32, 8 * lanes);
    }

}


// RACING GAME CONSTANTS

var KEY = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    A: 65,
    D: 68,
    S: 83,
    W: 87
};

var COLORS = {
    SKY: '#72D7EE',
    TREE: '#005108',
    FOG: '#005108',
    LIGHT: {
        road: '#6B6B6B',
        grass: '#10AA10',
        rumble: '#555555',
        lane: '#CCCCCC'
    },
    DARK: {
        road: '#696969',
        grass: '#009A00',
        rumble: '#BBBBBB'
    },
    START: {
        road: 'white',
        grass: 'white',
        rumble: 'white'
    },
    FINISH: {
        road: 'black',
        grass: 'black',
        rumble: 'black'
    }
};

var BACKGROUND = {
    HILLS: {
        x: 5,
        y: 5,
        w: 1280,
        h: 480
    },
    SKY: {
        x: 5,
        y: 495,
        w: 1280,
        h: 480
    },
    TREES: {
        x: 5,
        y: 985,
        w: 1280,
        h: 480
    }
};

var SPRITES = {
    PALM_TREE: {
        x: 5,
        y: 5,
        w: 215,
        h: 540
    },
    BILLBOARD08: {
        x: 230,
        y: 5,
        w: 385,
        h: 265
    },
    TREE1: {
        x: 625,
        y: 5,
        w: 360,
        h: 360
    },
    DEAD_TREE1: {
        x: 5,
        y: 555,
        w: 135,
        h: 332
    },
    BILLBOARD09: {
        x: 150,
        y: 555,
        w: 328,
        h: 282
    },
    BOULDER3: {
        x: 230,
        y: 280,
        w: 320,
        h: 220
    },
    COLUMN: {
        x: 995,
        y: 5,
        w: 200,
        h: 315
    },
    BILLBOARD01: {
        x: 625,
        y: 375,
        w: 300,
        h: 170
    },
    BILLBOARD06: {
        x: 488,
        y: 555,
        w: 298,
        h: 190
    },
    BILLBOARD05: {
        x: 5,
        y: 897,
        w: 298,
        h: 190
    },
    BILLBOARD07: {
        x: 313,
        y: 897,
        w: 298,
        h: 190
    },
    BOULDER2: {
        x: 621,
        y: 897,
        w: 298,
        h: 140
    },
    TREE2: {
        x: 1205,
        y: 5,
        w: 282,
        h: 295
    },
    BILLBOARD04: {
        x: 1205,
        y: 310,
        w: 268,
        h: 170
    },
    DEAD_TREE2: {
        x: 1205,
        y: 490,
        w: 150,
        h: 260
    },
    BOULDER1: {
        x: 1205,
        y: 760,
        w: 168,
        h: 248
    },
    BUSH1: {
        x: 5,
        y: 1097,
        w: 240,
        h: 155
    },
    CACTUS: {
        x: 929,
        y: 897,
        w: 235,
        h: 118
    },
    BUSH2: {
        x: 255,
        y: 1097,
        w: 232,
        h: 152
    },
    BILLBOARD03: {
        x: 5,
        y: 1262,
        w: 230,
        h: 220
    },
    BILLBOARD02: {
        x: 245,
        y: 1262,
        w: 215,
        h: 220
    },
    STUMP: {
        x: 995,
        y: 330,
        w: 195,
        h: 140
    },
    SEMI: {
        x: 1365,
        y: 490,
        w: 122,
        h: 144
    },
    TRUCK: {
        x: 1365,
        y: 644,
        w: 100,
        h: 78
    },
    CAR03: {
        x: 1383,
        y: 760,
        w: 88,
        h: 55
    },
    CAR02: {
        x: 1383,
        y: 825,
        w: 80,
        h: 59
    },
    CAR04: {
        x: 1383,
        y: 894,
        w: 80,
        h: 57
    },
    CAR01: {
        x: 1205,
        y: 1018,
        w: 80,
        h: 56
    },
    PLAYER_UPHILL_LEFT: {
        x: 1383,
        y: 961,
        w: 80,
        h: 45
    },
    PLAYER_UPHILL_STRAIGHT: {
        x: 1295,
        y: 1018,
        w: 80,
        h: 45
    },
    PLAYER_UPHILL_RIGHT: {
        x: 1385,
        y: 1018,
        w: 80,
        h: 45
    },
    PLAYER_LEFT: {
        x: 995,
        y: 480,
        w: 80,
        h: 41
    },
    PLAYER_STRAIGHT: {
        x: 1085,
        y: 480,
        w: 80,
        h: 41
    },
    PLAYER_RIGHT: {
        x: 995,
        y: 531,
        w: 80,
        h: 41
    }
};

SPRITES.SCALE = 0.3 * (1 / SPRITES.PLAYER_STRAIGHT.w) // the reference sprite width should be 1/3rd the (half-)roadWidth

SPRITES.BILLBOARDS = [SPRITES.BILLBOARD01, SPRITES.BILLBOARD02, SPRITES.BILLBOARD03, SPRITES.BILLBOARD04, SPRITES.BILLBOARD05, SPRITES.BILLBOARD06, SPRITES.BILLBOARD07, SPRITES.BILLBOARD08, SPRITES.BILLBOARD09];
SPRITES.PLANTS = [SPRITES.TREE1, SPRITES.TREE2, SPRITES.DEAD_TREE1, SPRITES.DEAD_TREE2, SPRITES.PALM_TREE, SPRITES.BUSH1, SPRITES.BUSH2, SPRITES.CACTUS, SPRITES.STUMP, SPRITES.BOULDER1, SPRITES.BOULDER2, SPRITES.BOULDER3];
SPRITES.CARS = [SPRITES.CAR01, SPRITES.CAR02, SPRITES.CAR03, SPRITES.CAR04, SPRITES.SEMI, SPRITES.TRUCK];




var fps = 60; // how many 'update' frames per second
var step = 1 / fps; // how long is each frame (in seconds)
var width = 1024; // logical canvas width
var height = 768; // logical canvas height
var segments = []; // array of road segments
var stats = Game.stats('fps'); // mr.doobs FPS counter
var canvas = Dom.get('canvas'); // our canvas...
var ctx = canvas.getContext('2d'); // ...and its drawing context
var background = null; // our background image (loaded below)
var sprites = null; // our spritesheet (loaded below)
var resolution = null; // scaling factor to provide resolution independence (computed)
var roadWidth = 2000; // actually half the roads width, easier math if the road spans from -roadWidth to +roadWidth
var segmentLength = 200; // length of a single segment
var rumbleLength = 3; // number of segments per red/white rumble strip
var trackLength = null; // z length of entire track (computed)
var lanes = 3; // number of lanes
var fieldOfView = 100; // angle (degrees) for field of view
var cameraHeight = 1000; // z height of camera
var cameraDepth = null; // z distance camera is from screen (computed)
var drawDistance = 300; // number of segments to draw
var playerX = 0; // player x offset from center of road (-1 to 1 to stay independent of roadWidth)
var playerZ = null; // player relative z distance from camera (computed)
var fogDensity = 5; // exponential fog density
var position = 0; // current camera Z position (add playerZ to get player's absolute Z position)
var speed = 0; // current speed
var maxSpeed = segmentLength / step; // top speed (ensure we can't move more than 1 segment in a single frame to make collision detection easier)
var accel = maxSpeed / 5; // acceleration rate - tuned until it 'felt' right
var breaking = -maxSpeed; // deceleration rate when braking
var decel = -maxSpeed / 5; // 'natural' deceleration rate when neither accelerating, nor braking
var offRoadDecel = -maxSpeed / 2; // off road deceleration is somewhere in between
var offRoadLimit = maxSpeed / 4; // limit when off road deceleration no longer applies (e.g. you can always go at least this speed even when off road)

var keyLeft = false;
var keyRight = false;
var keyFaster = false;
var keySlower = false;


// UPDATE THE GAME WORLD

function update(dt) {

    position = Util.increase(position, dt * speed, trackLength);

    var dx = dt * 2 * (speed / maxSpeed); // at top speed, should be able to cross from left to right (-1 to 1) in 1 second

    if (keyLeft)
        playerX = playerX - dx;
    else if (keyRight)
        playerX = playerX + dx;

    if (keyFaster)
        speed = Util.accelerate(speed, accel, dt);
    else if (keySlower)
        speed = Util.accelerate(speed, breaking, dt);
    else
        speed = Util.accelerate(speed, decel, dt);

    if (((playerX < -1) || (playerX > 1)) && (speed > offRoadLimit))
        speed = Util.accelerate(speed, offRoadDecel, dt);

    playerX = Util.limit(playerX, -2, 2); // dont ever let player go too far out of bounds
    speed = Util.limit(speed, 0, maxSpeed); // or exceed maxSpeed

}


// RENDER THE GAME WORLD

function render() {

    var baseSegment = findSegment(position);
    var maxy = height;

    ctx.clearRect(0, 0, width, height);

    Render.background(ctx, background, width, height, BACKGROUND.SKY);
    Render.background(ctx, background, width, height, BACKGROUND.HILLS);
    Render.background(ctx, background, width, height, BACKGROUND.TREES);

    var n, segment;

    for (n = 0; n < drawDistance; n++) {

        segment = segments[(baseSegment.index + n) % segments.length];
        segment.looped = segment.index < baseSegment.index;
        segment.fog = Util.exponentialFog(n / drawDistance, fogDensity);

        Util.project(segment.p1, (playerX * roadWidth), cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);
        Util.project(segment.p2, (playerX * roadWidth), cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);

        if ((segment.p1.camera.z <= cameraDepth) || // behind us
            (segment.p2.screen.y >= maxy)) // clip by (already rendered) segment
            continue;

        Render.segment(ctx, width, lanes,
            segment.p1.screen.x,
            segment.p1.screen.y,
            segment.p1.screen.w,
            segment.p2.screen.x,
            segment.p2.screen.y,
            segment.p2.screen.w,
            segment.fog,
            segment.color);

        maxy = segment.p2.screen.y;
    }

    Render.player(ctx, width, height, resolution, roadWidth, sprites, speed / maxSpeed,
        cameraDepth / playerZ,
        width / 2,
        height,
        speed * (keyLeft ? -1 : keyRight ? 1 : 0),
        0);
}


// BUILD ROAD GEOMETRY

function resetRoad() {
    segments = [];
    for (var n = 0; n < 500; n++) {
        segments.push({
            index: n,
            p1: {
                world: {
                    z: n * segmentLength
                },
                camera: {},
                screen: {}
            },
            p2: {
                world: {
                    z: (n + 1) * segmentLength
                },
                camera: {},
                screen: {}
            },
            color: Math.floor(n / rumbleLength) % 2 ? COLORS.DARK : COLORS.LIGHT
        });
    }

    segments[findSegment(playerZ).index + 2].color = COLORS.START;
    segments[findSegment(playerZ).index + 3].color = COLORS.START;
    for (var n = 0; n < rumbleLength; n++)
        segments[segments.length - 1 - n].color = COLORS.FINISH;

    trackLength = segments.length * segmentLength;
}

function findSegment(z) {
    return segments[Math.floor(z / segmentLength) % segments.length];
}


// THE GAME LOOP

Game.run({
    canvas: canvas,
    render: render,
    update: update,
    stats: stats,
    step: step,
    images: ["background", "sprites"],
    keys: [{
            keys: [KEY.LEFT, KEY.A],
            mode: 'down',
            action: function () {
                keyLeft = true;
            }
        },
        {
            keys: [KEY.RIGHT, KEY.D],
            mode: 'down',
            action: function () {
                keyRight = true;
            }
        },
        {
            keys: [KEY.UP, KEY.W],
            mode: 'down',
            action: function () {
                keyFaster = true;
            }
        },
        {
            keys: [KEY.DOWN, KEY.S],
            mode: 'down',
            action: function () {
                keySlower = true;
            }
        },
        {
            keys: [KEY.LEFT, KEY.A],
            mode: 'up',
            action: function () {
                keyLeft = false;
            }
        },
        {
            keys: [KEY.RIGHT, KEY.D],
            mode: 'up',
            action: function () {
                keyRight = false;
            }
        },
        {
            keys: [KEY.UP, KEY.W],
            mode: 'up',
            action: function () {
                keyFaster = false;
            }
        },
        {
            keys: [KEY.DOWN, KEY.S],
            mode: 'up',
            action: function () {
                keySlower = false;
            }
        }
    ],
    ready: function (images) {
        background = images[0];
        sprites = images[1];
        reset();
    }
});

function reset(options) {
    options = options || {};
    canvas.width = width = Util.toInt(options.width, width);
    canvas.height = height = Util.toInt(options.height, height);
    lanes = Util.toInt(options.lanes, lanes);
    roadWidth = Util.toInt(options.roadWidth, roadWidth);
    cameraHeight = Util.toInt(options.cameraHeight, cameraHeight);
    drawDistance = Util.toInt(options.drawDistance, drawDistance);
    fogDensity = Util.toInt(options.fogDensity, fogDensity);
    fieldOfView = Util.toInt(options.fieldOfView, fieldOfView);
    segmentLength = Util.toInt(options.segmentLength, segmentLength);
    rumbleLength = Util.toInt(options.rumbleLength, rumbleLength);
    cameraDepth = 1 / Math.tan((fieldOfView / 2) * Math.PI / 180);
    playerZ = (cameraHeight * cameraDepth);
    resolution = height / 480;
    refreshTweakUI();

    if ((segments.length == 0) || (options.segmentLength) || (options.rumbleLength))
        resetRoad(); // only rebuild road when necessary
}


// TWEAK UI HANDLERS

Dom.on('resolution', 'change', function (ev) {
    var w, h, ratio;
    switch (ev.target.options[ev.target.selectedIndex].value) {
        case 'fine':
            w = 1280;
            h = 960;
            ratio = w / width;
            break;
        case 'high':
            w = 1024;
            h = 768;
            ratio = w / width;
            break;
        case 'medium':
            w = 640;
            h = 480;
            ratio = w / width;
            break;
        case 'low':
            w = 480;
            h = 360;
            ratio = w / width;
            break;
    }
    reset({
        width: w,
        height: h
    })
    Dom.blur(ev);
});

Dom.on('lanes', 'change', function (ev) {
    Dom.blur(ev);
    reset({
        lanes: ev.target.options[ev.target.selectedIndex].value
    });
});
Dom.on('roadWidth', 'change', function (ev) {
    Dom.blur(ev);
    reset({
        roadWidth: Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max')))
    });
});
Dom.on('cameraHeight', 'change', function (ev) {
    Dom.blur(ev);
    reset({
        cameraHeight: Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max')))
    });
});
Dom.on('drawDistance', 'change', function (ev) {
    Dom.blur(ev);
    reset({
        drawDistance: Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max')))
    });
});
Dom.on('fieldOfView', 'change', function (ev) {
    Dom.blur(ev);
    reset({
        fieldOfView: Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max')))
    });
});
Dom.on('fogDensity', 'change', function (ev) {
    Dom.blur(ev);
    reset({
        fogDensity: Util.limit(Util.toInt(ev.target.value), Util.toInt(ev.target.getAttribute('min')), Util.toInt(ev.target.getAttribute('max')))
    });
});

function refreshTweakUI() {
    Dom.get('lanes').selectedIndex = lanes - 1;
    Dom.get('currentRoadWidth').innerHTML = Dom.get('roadWidth').value = roadWidth;
    Dom.get('currentCameraHeight').innerHTML = Dom.get('cameraHeight').value = cameraHeight;
    Dom.get('currentDrawDistance').innerHTML = Dom.get('drawDistance').value = drawDistance;
    Dom.get('currentFieldOfView').innerHTML = Dom.get('fieldOfView').value = fieldOfView;
    Dom.get('currentFogDensity').innerHTML = Dom.get('fogDensity').value = fogDensity;
}