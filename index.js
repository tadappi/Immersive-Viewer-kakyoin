/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

(function() {
  var Marzipano = window.Marzipano;
  var bowser    = window.bowser;
  var screenfull = window.screenfull;
  var data      = window.APP_DATA;

  // DOM要素
  var panoElement            = document.querySelector('#pano');
  var sceneNameElement       = document.querySelector('#titleBar .sceneName');
  var sceneListElement       = document.querySelector('#sceneList');
  var sceneElements          = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement= document.querySelector('#autorotateToggle');
  var fullscreenToggleElement= document.querySelector('#fullscreenToggle');

  // デスクトップ/モバイル判定
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  var viewerOpts = { controls: { mouseViewMode: data.settings.mouseViewMode } };
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  var scenes = data.scenes.map(function(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(data.levels);
    var limiter  = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view     = new Marzipano.RectilinearView(data.initialViewParameters, limiter);
    var scene    = viewer.createScene({ source: source, geometry: geometry, view: view, pinFirstLevel: true });
    return { data: data, scene: scene, view: view };
  });

  // 自動回転：180度/分 = π/20 rad/s ≈ 0.1571
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.1571,
    targetPitch: 0,
    targetFov: Math.PI/2
  });

  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function() { screenfull.toggle(); });
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) fullscreenToggleElement.classList.add('enabled');
      else fullscreenToggleElement.classList.remove('enabled');
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  sceneListToggleElement.addEventListener('click', toggleSceneList);
  if (!document.body.classList.contains('mobile')) showSceneList();

  scenes.forEach(function(scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    el.addEventListener('click', function() {
      switchScene(scene);
      if (document.body.classList.contains('mobile')) hideSceneList();
    });
  });

  var viewUpElement    = document.querySelector('#viewUp');
  var viewDownElement  = document.querySelector('#viewDown');
  var viewLeftElement  = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement    = document.querySelector('#viewIn');
  var viewOutElement   = document.querySelector('#viewOut');

  var velocity = 0.7, friction = 3;
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  function sanitize(s) { return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;'); }

  function switchScene(scene) {
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    updateSceneName(scene);
    updateSceneList(scene);
  }
  function updateSceneName(scene) { sceneNameElement.innerHTML = sanitize(scene.data.name); }
  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) el.classList.add('current');
      else el.classList.remove('current');
    }
  }
  function showSceneList()   { sceneListElement.classList.add('enabled');    sceneListToggleElement.classList.add('enabled'); }
  function hideSceneList()   { sceneListElement.classList.remove('enabled'); sceneListToggleElement.classList.remove('enabled'); }
  function toggleSceneList() { sceneListElement.classList.toggle('enabled'); sceneListToggleElement.classList.toggle('enabled'); }
  function startAutorotate() { viewer.startMovement(autorotate); viewer.setIdleMovement(3000, autorotate); }
  function stopAutorotate()  { viewer.stopMovement(); viewer.setIdleMovement(Infinity); }

  switchScene(scenes[0]);

  // ============================================================
  // タイトル変更
  // ============================================================
  sceneNameElement.innerHTML = 'レーベン青葉区花京院　周辺の案内（最上階眺望ではありません）';

  // ============================================================
  // リスタートボタン
  // ============================================================
  autorotateToggleElement.title = 'リスタート';
  autorotateToggleElement.innerHTML = '<img class="icon" src="img/play.png">';
  autorotateToggleElement.onclick = function() { restartTour(); };

  // ============================================================
  // オーバーレイ：Canvas（引き出し線）＋ テキスト ＋ 画像
  // ============================================================

  // Canvas（引き出し線用・画面全体）
  var canvas = document.createElement('canvas');
  canvas.style.cssText = [
    'position:fixed','top:0','left:0',
    'pointer-events:none','z-index:7999',
    'opacity:0','transition:opacity 0.3s ease'
  ].join(';');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // テキストボックス（右上固定）
  var textBox = document.createElement('div');
  textBox.style.cssText = [
    'position:fixed',
    'top:12%',
    'right:8%',
    'background:rgba(20,20,20,0.75)',
    'color:#fff',
    'font-size:20px',
    'font-weight:bold',
    'padding:8px 18px',
    'border-radius:6px',
    'pointer-events:none',
    'z-index:8001',
    'opacity:0',
    'transform:translateX(30px)',
    'transition:opacity 0.4s ease, transform 0.4s ease',
    'white-space:nowrap'
  ].join(';');
  document.body.appendChild(textBox);

  // 画像（画面中央）
  var overlayImage = document.createElement('img');
  overlayImage.style.cssText = [
    'position:fixed',
    'top:50%','left:50%',
    'transform:translate(-50%,-50%)',
    'width:33vw','max-width:33vw','height:auto',
    'border-radius:10px',
    'box-shadow:0 4px 24px rgba(0,0,0,0.6)',
    'pointer-events:none',
    'z-index:8002',
    'opacity:0',
    'transition:opacity 0.5s ease'
  ].join(';');
  document.body.appendChild(overlayImage);

  // ============================================================
  // 引き出し線の描画
  // ============================================================
  // テキストボックスの左端・中央Y を取得
  function getTextBoxAnchor() {
    var rect = textBox.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top + rect.height / 2
    };
  }

  // 線アニメーション用
  var lineAnimId  = null;
  var lineVisible = false;

  // 起点：画面中央
  function drawLine(progress) {
    // progress: 0→1
    // 起点：画面中央
    var sx = window.innerWidth  / 2;
    var sy = window.innerHeight / 2;

    var anchor = getTextBoxAnchor();
    // 折れ点：テキストボックスの左端のX、起点Yから anchor.y へ
    var kx = anchor.x;
    var ky = anchor.y;
    // 終点：テキストボックスの右端
    var rect = textBox.getBoundingClientRect();
    var ex = rect.right;
    var ey = anchor.y;

    // 全体の線長を2セグメントで計算
    var seg1len = Math.sqrt((kx-sx)*(kx-sx) + (ky-sy)*(ky-sy));
    var seg2len = ex - kx;
    var total   = seg1len + seg2len;

    var drawn = total * progress;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);

    if (drawn <= seg1len) {
      // セグメント1の途中
      var t = drawn / seg1len;
      ctx.lineTo(sx + (kx-sx)*t, sy + (ky-sy)*t);
    } else {
      // セグメント1完了、セグメント2途中
      ctx.lineTo(kx, ky);
      var remaining = drawn - seg1len;
      var t2 = remaining / seg2len;
      ctx.lineTo(kx + (ex-kx)*t2, ey);
    }
    ctx.stroke();
  }

  function animateLine(onComplete) {
    var t0  = Date.now();
    var dur = 800; // 0.8秒
    lineVisible = true;
    canvas.style.opacity = '1';

    function step() {
      var progress = Math.min((Date.now() - t0) / dur, 1);
      drawLine(progress);
      if (progress < 1) {
        lineAnimId = requestAnimationFrame(step);
      } else {
        lineAnimId = null;
        if (onComplete) onComplete();
      }
    }
    lineAnimId = requestAnimationFrame(step);
  }

  function hideLine() {
    lineVisible = false;
    canvas.style.opacity = '0';
    if (lineAnimId) { cancelAnimationFrame(lineAnimId); lineAnimId = null; }
    setTimeout(function() { ctx.clearRect(0, 0, canvas.width, canvas.height); }, 300);
  }

  // ============================================================
  // テキスト・画像の表示制御
  // ============================================================
  function showText(label) {
    textBox.textContent   = label;
    textBox.style.opacity  = '1';
    textBox.style.transform = 'translateX(0)';
  }

  function hideText() {
    textBox.style.opacity   = '0';
    textBox.style.transform = 'translateX(30px)';
  }

  function showImage(src) {
    overlayImage.src     = src;
    overlayImage.style.opacity = '1';
  }

  function hideImage() {
    overlayImage.style.opacity = '0';
  }

  function hideAll() {
    hideLine();
    hideText();
    hideImage();
  }

  // ============================================================
  // ウェイポイント
  // ============================================================
  var FOV_DEFAULT = 1.3263317910021355;
  var FOV_ZOOM    = 0.8727; // 50度

  var waypoints = [
    // 0: スタート
    { yaw: -2.758886, pitch: 0.001808, fov: FOV_DEFAULT,
      label: null, image: null, moveDuration: 0, waitDuration: 0 },
    // 1: 仙台駅
    { yaw: -1.974667, pitch: 0.194818, fov: FOV_ZOOM,
      label: '仙台駅（400m）', image: 'img/2.png', moveDuration: 7000, waitDuration: 1000 },
    // 2: AER
    { yaw: -1.674247, pitch: 0.179604, fov: FOV_ZOOM,
      label: 'AER（300m）', image: 'img/3.png', moveDuration: 7000, waitDuration: 1000 },
    // 3: 花京院緑地
    { yaw: -0.082279, pitch: 0.733301, fov: FOV_ZOOM,
      label: '花京院緑地（200m）', image: 'img/4.png', moveDuration: 7000, waitDuration: 1000 },
    // 4: 東六番丁小学校
    { yaw:  2.141772, pitch: 0.586593, fov: FOV_ZOOM,
      label: '仙台市立東六番丁小学校（160m）', image: 'img/5.png', moveDuration: 7000, waitDuration: 1000 },
    // 5: 青葉こども園
    { yaw:  1.794341, pitch: 0.368924, fov: FOV_ZOOM,
      label: '青葉こども園（450m）', image: 'img/6.png', moveDuration: 7000, waitDuration: 1000 },
    // 6: アンパンマン
    { yaw:  2.938131, pitch: 0.295459, fov: FOV_ZOOM,
      label: '仙台アンパンマンこどもミュージアム（650m）', image: 'img/7.png', moveDuration: 7000, waitDuration: 1000 }
  ];

  // ============================================================
  // 制御変数
  // ============================================================
  var currentStep     = 0;
  var tourActive      = false;
  var animFrameId     = null;
  var stepTimerId     = null;
  var userIdleTimer   = null;
  var userInterrupted = false;
  var resumeFromStep  = 1;

  // ============================================================
  // カメラアニメーション
  // ============================================================
  function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  function cancelAllTimers() {
    if (animFrameId)   { cancelAnimationFrame(animFrameId); animFrameId = null; }
    if (stepTimerId)   { clearTimeout(stepTimerId);          stepTimerId = null; }
    if (userIdleTimer) { clearTimeout(userIdleTimer);        userIdleTimer = null; }
    if (lineAnimId)    { cancelAnimationFrame(lineAnimId);   lineAnimId = null; }
  }

  function animateTo(wp, duration, onComplete) {
    var view = scenes[0].view;
    var sp   = view.parameters();
    var t0   = Date.now();

    var yawDiff = wp.yaw - sp.yaw;
    while (yawDiff >  Math.PI) yawDiff -= 2*Math.PI;
    while (yawDiff < -Math.PI) yawDiff += 2*Math.PI;

    var sy = sp.yaw, sp2 = sp.pitch, sf = sp.fov;

    function step() {
      if (!tourActive) return;
      var t = Math.min((Date.now() - t0) / duration, 1);
      var e = easeInOut(t);
      view.setParameters({
        yaw:   sy  + yawDiff          * e,
        pitch: sp2 + (wp.pitch - sp2) * e,
        fov:   sf  + (wp.fov   - sf)  * e
      });
      if (t < 1) { animFrameId = requestAnimationFrame(step); }
      else { animFrameId = null; if (onComplete) onComplete(); }
    }
    animFrameId = requestAnimationFrame(step);
  }

  // ============================================================
  // ツアーステップ
  // 順序：移動→静止1秒→①線アニメ→②テキストスライド→③1秒後画像＋線消去→④5秒→⑤全消去→次へ
  // ============================================================
  function runStep(idx) {
    if (!tourActive) return;
    if (idx >= waypoints.length) { finishTour(); return; }

    currentStep = idx;
    var wp = waypoints[idx];

    if (idx === 0) {
      stepTimerId = setTimeout(function() { runStep(1); }, 500);
      return;
    }

    // カメラ移動
    animateTo(wp, wp.moveDuration, function() {
      if (!tourActive) return;

      // 静止 1秒
      stepTimerId = setTimeout(function() {
        if (!tourActive) return;

        // ① 引き出し線アニメ（0.8秒）
        animateLine(function() {
          if (!tourActive) return;

          // ② テキストスライドイン
          showText(wp.label);

          // ③ 1秒後：画像フェードイン＋引き出し線消去
          stepTimerId = setTimeout(function() {
            if (!tourActive) return;
            hideLine();
            if (wp.image) showImage(wp.image);

            // ④ 5秒表示
            stepTimerId = setTimeout(function() {
              if (!tourActive) return;

              // ⑤ 全消去して次へ
              hideAll();
              stepTimerId = setTimeout(function() {
                if (!tourActive) return;
                runStep(idx + 1);
              }, 500); // 消えるアニメ待ち

            }, 5000);
          }, 1000);
        });

      }, wp.waitDuration);
    });
  }

  // ============================================================
  // ツアー終了 → 水平・デフォルトFOVに戻して自動回転
  // ============================================================
  function finishTour() {
    tourActive = false;
    var view = scenes[0].view;
    var sp   = view.parameters();
    var t0   = Date.now();
    var dur  = 2000;

    function returnStep() {
      var t = Math.min((Date.now() - t0) / dur, 1);
      var e = easeInOut(t);
      view.setParameters({
        yaw:   sp.yaw,
        pitch: sp.pitch + (0           - sp.pitch) * e,
        fov:   sp.fov   + (FOV_DEFAULT - sp.fov)   * e
      });
      if (t < 1) { animFrameId = requestAnimationFrame(returnStep); }
      else { startAutorotate(); }
    }
    animFrameId = requestAnimationFrame(returnStep);
  }

  // ============================================================
  // 開始・リスタート
  // ============================================================
  function startTour() {
    cancelAllTimers();
    hideAll();
    stopAutorotate();
    tourActive      = true;
    userInterrupted = false;
    currentStep     = 0;

    var view = scenes[0].view;
    view.setParameters({ yaw: waypoints[0].yaw, pitch: waypoints[0].pitch, fov: waypoints[0].fov });

    stepTimerId = setTimeout(function() { runStep(1); }, 800);
  }

  function restartTour() {
    cancelAllTimers();
    hideAll();
    stopAutorotate();
    userInterrupted = false;
    startTour();
  }

  // ============================================================
  // ユーザー操作割り込み
  // ============================================================
  var lastInteractTime = 0;

  function onUserInteract() {
    var now = Date.now();
    if (now - lastInteractTime < 150) return;
    lastInteractTime = now;

    if (tourActive) {
      tourActive      = false;
      userInterrupted = true;
      resumeFromStep  = currentStep + 1;
      if (resumeFromStep >= waypoints.length) resumeFromStep = 0;

      cancelAllTimers();
      hideAll();
      setIdleResumeTimer();

    } else if (userInterrupted) {
      clearTimeout(userIdleTimer);
      setIdleResumeTimer();
    }
  }

  function setIdleResumeTimer() {
    userIdleTimer = setTimeout(function() {
      if (!userInterrupted) return;
      userInterrupted = false;
      tourActive      = true;
      if (resumeFromStep === 0) startTour();
      else runStep(resumeFromStep);
    }, 10000);
  }

  var interruptEvents = ['mousedown','mousemove','wheel','mousewheel','touchstart','touchmove','keydown'];
  interruptEvents.forEach(function(ev) {
    panoElement.addEventListener(ev, onUserInteract, { passive: true });
  });

  // ============================================================
  // 起動
  // ============================================================
  setTimeout(function() { startTour(); }, 1000);

  // ============================================================
  // ユーティリティ
  // ============================================================
  function stopTouchAndScrollEventPropagation(element) {
    var eventList = ['touchstart','touchmove','touchend','touchcancel','wheel','mousewheel'];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) { event.stopPropagation(); });
    }
  }
  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) { if (scenes[i].data.id === id) return scenes[i]; }
    return null;
  }
  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) { if (data.scenes[i].id === id) return data.scenes[i]; }
    return null;
  }

})();
