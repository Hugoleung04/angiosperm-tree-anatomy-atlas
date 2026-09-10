function makeOrbit(camera, el) {
  const t = new THREE.Vector3();
  let dragging = false, lx = 0, ly = 0, sx = 0.55, sy = 0.28, dist = 3.2;
  const apply = () => {
    camera.position.set(
      t.x + dist * Math.sin(sx) * Math.cos(sy),
      t.y + dist * Math.sin(sy),
      t.z + dist * Math.cos(sx) * Math.cos(sy)
    );
    camera.lookAt(t);
  };
  el.addEventListener("pointerdown", (e) => {
    dragging = true; lx = e.clientX; ly = e.clientY;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointerup", () => { dragging = false; });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    sx -= (e.clientX - lx) * 0.005;
    sy = Math.max(-1.15, Math.min(1.15, sy + (e.clientY - ly) * 0.005));
    lx = e.clientX; ly = e.clientY;
  });
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    dist = Math.max(0.55, Math.min(12, dist * (e.deltaY > 0 ? 1.08 : 0.92)));
  }, { passive: false });
  let lastPinch = 0;
  el.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastPinch) dist = Math.max(0.55, Math.min(12, dist * (lastPinch / d)));
      lastPinch = d;
      e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener("touchend", () => { lastPinch = 0; });
  return {
    target: t,
    update: apply,
    setView(x, y, z, tx, ty, tz) {
      t.set(tx, ty, tz);
      const p = new THREE.Vector3(x, y, z);
      dist = p.distanceTo(t);
      sx = Math.atan2(p.x - t.x, p.z - t.z);
      sy = Math.asin(Math.max(-0.99, Math.min(0.99, (p.y - t.y) / Math.max(dist, 0.01))));
    }
  };
}

(function () {
  const canvas = document.getElementById("c");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x05070a);
  if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 80);
  const controls = makeOrbit(camera, canvas);
  scene.add(new THREE.AmbientLight(0xffffff, 1.05));

  const group = new THREE.Group();
  scene.add(group);

  const loader = new THREE.TextureLoader();
  function tex(name) {
    const t = loader.load("plates/" + name + ".jpg");
    if (t.colorSpace !== undefined) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  const T = {
    leaf: tex("leaf"),
    leafSide: tex("leaf-side"),
    leafTop: tex("leaf-top"),
    vein: tex("vein"),
    veinAngle: tex("vein-angle"),
    stoma: tex("stoma"),
    transport: tex("transport"),
    stem: tex("stem"),
    stemPrimary: tex("stemPrimary"),
    trunk: tex("trunk"),
    cambium: tex("cambium"),
    xylemLS: tex("xylemLS"),
    root: tex("root"),
    roottip: tex("roottip"),
    sam: tex("sam"),
    flower: tex("flower")
  };

  const INFO = {
    leaf: ["葉 · 組織塊", "葉肉立體塊", "<p>呢個就係插畫風格嘅 3D 模型。正面／側面／頂面都係同一塊葉嘅解剖圖。放大睇柵欄入面嘅液泡、葉綠體、核；葉脈木質部在上、韌皮部在下。</p>"],
    vein: ["葉脈 · 細胞", "篩管同導管", "<p>青：活篩管＋篩板＋伴胞核。洋紅：死導管，空腔、紋孔、端壁穿孔。紅：纖維。</p>"],
    stoma: ["氣孔", "保衛細胞", "<p>雙子葉腎形保衛細胞，有葉綠體同核。氣孔下面通向葉內氣室。</p>"],
    transport: ["功能", "源到庫", "<p>藍管水向上。黃蔗糖由葉源去庫，可以上亦可以下。</p>"],
    stemPrimary: ["初生莖", "管束成環", "<p>外韌內木，內始式，中間髓。</p>"],
    stem: ["木本莖", "染色橫切", "<p>髓、年輪、射線、形成層、韌皮部、木栓。</p>"],
    trunk: ["樹幹", "次生生長剖開", "<p>木栓 → 韌皮部 → 形成層 → 邊材 → 心材。</p>"],
    cambium: ["形成層", "雙面形成層", "<p>向內造木質部，向外造韌皮部。橫條係射線。</p>"],
    xylemLS: ["木材", "導管縱切", "<p>側壁紋孔，端壁單穿孔。射線細胞仍然活。</p>"],
    root: ["幼根", "四原型外始式", "<p>四條木質部臂。細嘅原生木質部應在星尖；韌皮部在臂與臂之間。</p>"],
    roottip: ["根尖", "分生到成熟", "<p>根冠保護分生區，向上伸長同成熟。</p>"],
    sam: ["莖端", "分生組織", "<p>頂端圓拱、葉原基、原形成層。</p>"],
    flower: ["花", "剖開", "<p>花藥花粉；子房包住胚珠。</p>"]
  };

  function setInfo(id) {
    const i = INFO[id];
    if (!i) return;
    document.getElementById("badge").textContent = i[0];
    document.getElementById("title").textContent = i[1];
    document.getElementById("body").innerHTML = i[2];
  }

  function mat(map) {
    return new THREE.MeshBasicMaterial({ map });
  }

  function card(map, w, h) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(map));
    group.add(mesh);
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: 0x11151c })
    );
    back.rotation.y = Math.PI;
    group.add(back);
    return mesh;
  }

  function illustratedBox(front, side, top, w, h, d) {
    const materials = [
      mat(side), mat(side),
      mat(top), mat(front),
      mat(front), mat(side)
    ];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials);
    group.add(mesh);
    return mesh;
  }

  function clear() {
    while (group.children.length) {
      const o = group.children[0];
      group.remove(o);
      if (o.geometry) o.geometry.dispose();
    }
  }

  const BUILD = {
    leaf: () => {
      illustratedBox(T.leaf, T.leafSide, T.leafTop, 2.4, 1.55, 1.55);
      controls.setView(2.2, 1.3, 2.6, 0, 0, 0);
    },
    vein: () => {
      illustratedBox(T.vein, T.veinAngle, T.vein, 2.4, 1.55, 1.4);
      controls.setView(2.1, 1.1, 2.4, 0, 0, 0);
    },
    stoma: () => { card(T.stoma, 2.6, 1.73); controls.setView(0, 0.2, 3.1, 0, 0, 0); },
    transport: () => { card(T.transport, 2.6, 1.73); controls.setView(0, 0.2, 3.1, 0, 0, 0); },
    stemPrimary: () => { card(T.stemPrimary, 2.4, 2.4); controls.setView(0, 0.2, 3.4, 0, 0, 0); },
    stem: () => { card(T.stem, 2.4, 2.4); controls.setView(0, 0.2, 3.4, 0, 0, 0); },
    trunk: () => { card(T.trunk, 2.6, 1.73); controls.setView(0, 0.3, 3.2, 0, 0, 0); },
    cambium: () => { card(T.cambium, 2.6, 1.73); controls.setView(0, 0.2, 3.1, 0, 0, 0); },
    xylemLS: () => { card(T.xylemLS, 2.6, 1.73); controls.setView(0, 0.2, 3.1, 0, 0, 0); },
    root: () => { card(T.root, 2.4, 2.4); controls.setView(0, 0.2, 3.4, 0, 0, 0); },
    roottip: () => { card(T.roottip, 1.7, 2.55); controls.setView(0, 0.2, 3.3, 0, 0, 0); },
    sam: () => { card(T.sam, 1.7, 2.55); controls.setView(0, 0.2, 3.3, 0, 0, 0); },
    flower: () => { card(T.flower, 1.7, 2.55); controls.setView(0, 0.2, 3.3, 0, 0, 0); }
  };

  let current = "leaf";
  function load(id) {
    current = id;
    document.querySelectorAll("button.nav").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
    clear();
    (BUILD[id] || BUILD.leaf)();
    setInfo(id);
    closeDrawer();
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  const drawer = document.getElementById("drawer");
  const scrim = document.getElementById("scrim");
  const cardEl = document.getElementById("card");
  function closeDrawer() { drawer.classList.remove("open"); scrim.classList.remove("on"); }
  document.getElementById("menuBtn").onclick = () => {
    const open = drawer.classList.toggle("open");
    scrim.classList.toggle("on", open);
  };
  document.getElementById("infoBtn").onclick = () => cardEl.classList.toggle("hidden");
  scrim.onclick = closeDrawer;
  document.querySelectorAll("button.nav").forEach((b) => b.onclick = () => load(b.dataset.id));

  load("leaf");
  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();
})();
