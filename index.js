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
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  // Detect desktop or mobile mode.
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

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Create scenes.
  var scenes = data.scenes.map(function(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(data.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    return {
      data: data,
      scene: scene,
      view: view
    };
  });

  // Autorotate: 1回転/分 = 2π/60 ≈ 0.1047 rad/s
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.1047,
    targetPitch: 0,
    targetFov: Math.PI/2
  });

  // Set up fullscreen mode, if supported.
  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle();
    });
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // Set handler for scene list toggle.
  sceneListToggleElement.addEventListener('click', toggleSceneList);

  // Start with the scene list open on desktop.
  if (!document.body.classList.contains('mobile')) {
    showSceneList();
  }

  // Set handler for scene switch.
  scenes.forEach(function(scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    el.addEventListener('click', function() {
      switchScene(scene);
      if (document.body.classList.contains('mobile')) {
        hideSceneList();
      }
    });
  });

  // DOM elements for view controls.
  var viewUpElement    = document.querySelector('#viewUp');
  var viewDownElement  = document.querySelector('#viewDown');
  var viewLeftElement  = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement    = document.querySelector('#viewIn');
  var viewOutElement   = document.querySelector('#viewOut');

  var velocity = 0.7;
  var friction = 3;

  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  function switchScene(scene) {
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    updateSceneName(scene);
    updateSceneList(scene);
  }

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  function startAutorotate() {
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  // Display the initial scene.
  switchScene(scenes[0]);

  // ============================================================
  // タイトルを変更
  // ============================================================
  sceneNameElement.innerHTML = 'レーベン青葉区花京院　周辺の案内（最上階眺望ではありません）';

  // ============================================================
  // オーバーレイUI
  // ============================================================
  var overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed',
    'top:0','left:0','right:0','bottom:0',
    'pointer-events:none',
    'z-index:8000',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center'
  ].join(';');

  var overlayText = document.createElement('div');
  overlayText.style.cssText = [
    'color:#fff',
    'font-size:28px',
    'font-weight:bold',
    'text-shadow:0 2px 8px rgba(0,0,0,0.85)',
    'margin-bottom:18px',
    'opacity:0',
    'transition:opacity 0.5s ease',
    'letter-spacing:0.05em',
    'background:rgba(0,0,0,0.5)',
    'padding:10px 28px',
    'border-radius:8px'
  ].join(';');

  var overlayImage = document.createElement('img');
  overlayImage.style.cssText = [
    'width:33vw',
    'max-width:33vw',
    'height:auto',
    'border-radius:10px',
    'box-shadow:0 4px 24px rgba(0,0,0,0.6)',
    'opacity:0',
    'transition:opacity 0.5s ease'
  ].join(';');

  overlay.appendChild(overlayText);
  overlay.appendChild(overlayImage);
  document.body.appendChild(overlay);

  // ============================================================
  // リスタートボタン
  // ============================================================
  autorotateToggleElement.title = 'リスタート';
  autorotateToggleElement.innerHTML = '<img class="icon" src="img/play.png">';
  autorotateToggleElement.onclick = function() {
    restartTour();
  };

  // ============================================================
  // ウェイポイント
  // ============================================================
  var FOV_DEFAULT = 1.3263317910021355;
  var FOV_ZOOM    = 0.8727;

  var waypoints = [
    { yaw: -2.758886, pitch: 0.001808, fov: FOV_DEFAULT, label: null,                                          image: null,        moveDuration: 0    },
    { yaw: -1.974667, pitch: 0.194818, fov: FOV_ZOOM,    label: '仙台駅（400m）',                              image: 'img/2.png', moveDuration: 3000 },
    { yaw: -1.674247, pitch: 0.179604, fov: FOV_ZOOM,    label: 'AER（300m）',                                 image: 'img/3.png', moveDuration: 3000 },
    { yaw: -0.082279, pitch: 0.733301, fov: FOV_ZOOM,    label: '花京院緑地（200m）',                          image: 'img/4.png', moveDuration: 3500 },
    { yaw:  2.141772, pitch: 0.586593, fov: FOV_ZOOM,    label: '仙台市立東六番丁小学校（160m）',              image: 'img/5.png', moveDuration: 3500 },
    { yaw:  1.794341, pitch: 0.368924, fov: FOV_ZOOM,    label: '青葉こども園（450m）',                        image: 'img/6.png', moveDuration: 3000 },
    { yaw:  2.938131, pitch: 0.295459, fov: FOV_ZOOM,    label: '仙台アンパンマンこどもミュージアム（650m）',  image: 'img/7.png', moveDuration: 3000 }
  ];

  // ============================================================
  // 制御変数
  // ============================================================
  var currentStep      = 0;
  var tourActive       = false;
  var animFrameId      = null;
  var stepTimerId      = null;
  var userIdleTimer    = null;
  var userInterrupted  = false;
  var resumeFromStep   = 1;
  var FADE_MS          = 500;

  // ============================================================
  // オーバーレイ操作
  // ============================================================
  function showText(label) {
    overlayText.textContent = label;
    overlayText.style.opacity = '1';
  }

  function showImage(src) {
    overlayImage.src = src;
    overlayImage.style.opacity = '1';
  }

  function hideOverlay(callback) {
    overlayText.style.opacity  = '0';
    overlayImage.style.opacity = '0';
    if (callback) {
      setTimeout(callback, FADE_MS);
    }
  }

  // ============================================================
  // カメラアニメーション
  // ============================================================
  function easeInOut(t) {
    return t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
  }

  function cancelAnimation() {
    if (animFrameId)  { cancelAnimationFrame(animFrameId); animFrameId = null; }
    if (stepTimerId)  { clearTimeout(stepTimerId);          stepTimerId = null; }
    if (userIdleTimer){ clearTimeout(userIdleTimer);        userIdleTimer = null; }
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
      if (t < 1) {
        animFrameId = requestAnimationFrame(step);
      } else {
        animFrameId = null;
        if (onComplete) onComplete();
      }
    }
    animFrameId = requestAnimationFrame(step);
  }

  // ============================================================
  // ツアーステップ
  // ============================================================
  function runStep(idx) {
    if (!tourActive) return;
    if (idx >= waypoints.length) {
      finishTour();
      return;
    }

    currentStep = idx;
    var wp = waypoints[idx];

    if (idx === 0) {
      stepTimerId = setTimeout(function() { runStep(1); }, 500);
      return;
    }

    // カメラ移動
    animateTo(wp, wp.moveDuration, function() {
      if (!tourActive) return;

      // 1秒静止
      stepTimerId = setTimeout(function() {
        if (!tourActive) return;

        // テキスト表示
        showText(wp.label);

        // 0.5秒後に画像表示
        stepTimerId = setTimeout(function() {
          if (!tourActive) return;
          if (wp.image) showImage(wp.image);

          // 5秒後に消して次へ
          stepTimerId = setTimeout(function() {
            if (!tourActive) return;
            hideOverlay(function() {
              if (!tourActive) return;
              runStep(idx + 1);
            });
          }, 5000);
        }, 500);

      }, 1000);
    });
  }

  // ============================================================
  // ツアー終了 → 水平に戻して自動回転
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
      if (t < 1) {
        animFrameId = requestAnimationFrame(returnStep);
      } else {
        startAutorotate();
      }
    }
    animFrameId = requestAnimationFrame(returnStep);
  }

  // ============================================================
  // 開始・リスタート
  // ============================================================
  function startTour() {
    cancelAnimation();
    hideOverlay();
    stopAutorotate();
    tourActive      = true;
    userInterrupted = false;
    currentStep     = 0;

    var view = scenes[0].view;
    view.setParameters({
      yaw:   waypoints[0].yaw,
      pitch: waypoints[0].pitch,
      fov:   waypoints[0].fov
    });

    stepTimerId = setTimeout(function() { runStep(1); }, 800);
  }

  function restartTour() {
    cancelAnimation();
    hideOverlay();
    stopAutorotate();
    userInterrupted = false;
    startTour();
  }

  // ============================================================
  // ユーザー操作の割り込み
  // ============================================================
  var lastInteractTime = 0;

  function onUserInteract() {
    var now = Date.now();
    if (now - lastInteractTime < 150) return;
    lastInteractTime = now;

    if (tourActive) {
      // ツアー中に割り込み
      tourActive      = false;
      userInterrupted = true;
      resumeFromStep  = currentStep + 1;
      if (resumeFromStep >= waypoints.length) resumeFromStep = 0;

      cancelAnimation();
      hideOverlay();

      setIdleResumeTimer();

    } else if (userInterrupted) {
      // 割り込み後さらに操作 → タイマーリセット
      clearTimeout(userIdleTimer);
      setIdleResumeTimer();
    }
  }

  function setIdleResumeTimer() {
    clearTimeout(userIdleTimer);
    userIdleTimer = setTimeout(function() {
      if (!userInterrupted) return;
      userInterrupted = false;
      tourActive      = true;
      if (resumeFromStep === 0) {
        startTour();
      } else {
        runStep(resumeFromStep);
      }
    }, 10000);
  }

  var interruptEvents = ['mousedown', 'mousemove', 'wheel', 'mousewheel',
                         'touchstart', 'touchmove', 'keydown'];
  interruptEvents.forEach(function(ev) {
    panoElement.addEventListener(ev, onUserInteract, { passive: true });
  });

  // ============================================================
  // 起動
  // ============================================================
  setTimeout(function() {
    startTour();
  }, 1000);

  // ============================================================
  // ユーティリティ
  // ============================================================
  function stopTouchAndScrollEventPropagation(element) {
    var eventList = ['touchstart','touchmove','touchend','touchcancel','wheel','mousewheel'];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) return scenes[i];
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) return data.scenes[i];
    }
    return null;
  }

})();
