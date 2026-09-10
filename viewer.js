/* Angiosperm 3D anatomy explorer
   Orbit / zoom / click-to-descend. Cut faces carry textbook plates. */
function makeOrbit(camera, el) {
  const t = new THREE.Vector3();
  let dragging = false, lx = 0, ly = 0, sx = 0.6, sy = 0.4, dist = 5;
  const spherical = () => {
    camera.position.set(
      t.x + dist * Math.sin(sx) * Math.cos(sy),
      t.y + dist * Math.sin(sy),
      t.z + dist * Math.cos(sx) * Math.cos(sy)
    );
    camera.lookAt(t);
  };
  el.addEventListener("pointerdown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointerup", () => { dragging = false; });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    sx -= (e.clientX - lx) * 0.005;
    sy = Math.max(-1.2, Math.min(1.2, sy + (e.clientY - ly) * 0.005));
    lx = e.clientX; ly = e.clientY;
  });
  el.addEventListener("wheel", (e) => { e.preventDefault(); dist = Math.max(0.35, Math.min(18, dist + e.deltaY * 0.004)); }, { passive: false });
  return {
    target: t,
    update() { spherical(); },
    getDistance() { return dist; },
    syncFromCamera() {
      const p = camera.position;
      dist = p.distanceTo(t);
      sx = Math.atan2(p.x - t.x, p.z - t.z);
      sy = Math.asin(Math.max(-0.99, Math.min(0.99, (p.y - t.y) / Math.max(dist, 0.01))));
    }
  };
}

(function () {
  const canvas = document.getElementById("c");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x07090d);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
  const controls = makeOrbit(camera, canvas);

  scene.add(new THREE.AmbientLight(0xc8d4e4, 0.7));
  const key = new THREE.DirectionalLight(0xfff4e5, 1.15);
  key.position.set(4, 8, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88a0c8, 0.35);
  fill.position.set(-6, 2, -4);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);

  const loader = new THREE.TextureLoader();
  const TEX = {};
  [
    "leaf", "vein", "transport", "stoma", "stem", "stemPrimary", "trunk",
    "cambium", "xylemLS", "root", "roottip", "sam", "flower"
  ].forEach((k) => {
    const t = loader.load("plates/" + k + ".jpg");
    t.colorSpace = THREE.SRGBColorSpace;
    TEX[k] = t;
  });

  const pickables = [];
  let current = "tree";
  let cutaway = true;

  const INFO = {
    tree: {
      badge: "器官 · 米",
      title: "木本雙子葉樹",
      html: `<p>撳樹冠入葉、撳樹幹入次生生長、撳根入根解剖。放大樹幹會見到皮層同木材層。</p>
      <p class="cite">三組織系統：表皮、基本、維管。Esau；Raven。</p>`
    },
    leaf: {
      badge: "組織 · 200–400 µm",
      title: "葉肉立體塊",
      html: `<p>旋轉呢一塊。正面係教科書切片；轉側同放大見到柵欄柱、海綿氣室、葉脈管。再撳葉脈入細胞層。</p>
      <ul><li>上表皮＋角質層</li><li>柵欄（主光合）</li><li>海綿＋氣室</li><li>葉脈：木質部在上、韌皮部在下</li></ul>
      <p class="cite">NCERT 背腹葉；葉脈極性跟莖管束入葉。</p>`
    },
    vein: {
      badge: "細胞 · 10–80 µm",
      title: "葉脈：篩管同導管",
      html: `<p>青色活韌皮部（篩板＋伴胞核）。洋紅死導管（空腔、紋孔、端壁穿孔）。深紅纖維。</p>
      <p class="cite">Esau；Raven vessel vs tracheid；篩板專文。</p>`
    },
    stoma: {
      badge: "細胞 · 20–50 µm",
      title: "保衛細胞",
      html: `<p>雙子葉腎形保衛細胞，有葉綠體同核。膨壓升高時氣孔打開。普通表皮通常無葉綠體。</p>`
    },
    transport: {
      badge: "功能",
      title: "木質部向上、韌皮部由源到庫",
      html: `<p>藍管：蒸騰拉力抽水向上。粉管：Münch 集流運蔗糖，庫可以在上（芽）或下（根）。</p>`
    },
    stemPrimary: {
      badge: "初生莖",
      title: "草本雙子葉莖橫切",
      html: `<p>管束成環，外韌內木，內始式。中間大髓。拖轉切片睇厚度。</p>`
    },
    stem: {
      badge: "次生莖",
      title: "木本莖染色橫切",
      html: `<p>髓 → 木材年輪同射線 → 形成層細線 → 韌皮部 → 木栓。呢張係切片風格，可以當 3D 碟嚟轉。</p>`
    },
    trunk: {
      badge: "厘米",
      title: "樹幹剖開",
      html: `<p>外木栓、內韌皮部、形成層細線、邊材運水、心材支持。撳「剖開」睇層。</p>`
    },
    cambium: {
      badge: "形成層帶",
      title: "雙面維管形成層",
      html: `<p>向內次生木質部，向外次生韌皮部。長細胞＝紡錘原始細胞；橫條＝射線。</p>`
    },
    xylemLS: {
      badge: "木材細胞",
      title: "導管、管胞、纖維、射線",
      html: `<p>導管端壁係穿孔（一個大口），側壁係紋孔。中間無濾網。射線細胞仍然活、有核。</p>`
    },
    root: {
      badge: "幼根 · 已修正",
      title: "四原型、外始式",
      html: `<p>教學預設四條木質部臂。原生木質部（細）在星尖靠中柱鞘；後生木質部（大）向中心。韌皮部在臂同臂之間。</p>
      <p class="cite">Esau；Ranunculus／向日葵幼根通例。</p>`
    },
    roottip: {
      badge: "根尖",
      title: "根冠 → 分生區 → 伸長 → 成熟",
      html: `<p>根毛應在成熟區。圖仍偏示意，放大切片睇細胞排列。</p>`
    },
    sam: {
      badge: "分生組織",
      title: "莖端",
      html: `<p>頂端圓拱持續分裂，兩側葉原基，下面原形成層將嚟成維管束。</p>`
    },
    flower: {
      badge: "生殖",
      title: "花剖開",
      html: `<p>花藥有花粉；子房包住胚珠——被子植物定義。</p>`
    }
  };

  function setInfo(id, extra) {
    const i = INFO[id] || INFO.tree;
    document.getElementById("badge").textContent = extra?.badge || i.badge;
    document.getElementById("title").textContent = extra?.title || i.title;
    document.getElementById("body").innerHTML = extra?.html || i.html;
  }

  function std(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color, roughness: 0.55, metalness: 0.04,
      transparent: !!opts.opacity && opts.opacity < 1,
      ...opts
    });
  }

  function addPick(mesh, data) {
    mesh.userData = data;
    pickables.push(mesh);
    return mesh;
  }

  function clearRoot() {
    pickables.length = 0;
    while (root.children.length) {
      const o = root.children[0];
      root.remove(o);
      o.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
      });
    }
  }

  function plateSlab(tex, w, h, d) {
    const g = new THREE.Group();
    const mats = [
      std(0x1a1f27), std(0x1a1f27),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }),
      std(0x151a22), std(0x151a22)
    ];
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), mats);
    g.add(box);
    addPick(box, { kind: "plate" });
    return g;
  }

  /* ---------- views ---------- */
  function viewTree() {
    const bark = std(0x5a3a24);
    const wood = std(0xc4a574);
    const leaf = std(0x3d7a3a);
    const soil = std(0x4a3428);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.2, 20), bark);
    trunk.position.y = 0.4;
    addPick(trunk, { go: "trunk", title: "樹幹", html: "<p>次生生長。撳入剖開。</p>" });
    root.add(trunk);

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 2.21, 20), wood);
    inner.position.y = 0.4;
    inner.visible = cutaway;
    inner.name = "cutInner";
    root.add(inner);
    if (cutaway) {
      trunk.geometry = new THREE.CylinderGeometry(0.28, 0.38, 2.2, 20, 1, false, 0, Math.PI * 1.35);
    }

    for (let i = 0; i < 18; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.45 + Math.random() * 0.25, 16, 12), leaf);
      const a = (i / 18) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.7, 1.85 + (i % 3) * 0.25, Math.sin(a) * 0.7);
      addPick(s, { go: "leaf", title: "樹冠／葉", html: "<p>撳入葉肉立體塊。</p>" });
      root.add(s);
    }

    for (let i = 0; i < 8; i++) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 1.3, 8), soil);
      const a = (i / 8) * Math.PI * 2;
      r.position.set(Math.cos(a) * 0.45, -1.15, Math.sin(a) * 0.45);
      r.rotation.z = Math.cos(a) * 0.7;
      r.rotation.x = Math.sin(a) * 0.7;
      addPick(r, { go: "root", title: "根", html: "<p>撳入幼根橫切。</p>" });
      root.add(r);
    }

    camera.position.set(3.2, 1.6, 4.2);
    controls.target.set(0, 0.4, 0);
  }

  function viewLeaf() {
    const slab = plateSlab(TEX.leaf, 2.6, 1.75, 0.08);
    slab.position.set(0, 0, 1.05);
    root.add(slab);

    const palMat = std(0x4ea64a, { roughness: 0.35 });
    const cutMat = std(0x8fd18a, { roughness: 0.3 });
    const spongy = std(0x3d8a40, { roughness: 0.5 });
    const xyl = std(0xb56a32);
    const phl = std(0xc8c2d8);

    for (let x = 0; x < 10; x++) {
      for (let z = 0; z < 3; z++) {
        const cut = x === 7 && z === 1;
        const m = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.09, 0.42, 6, 10),
          cut ? cutMat : palMat
        );
        m.position.set(-1.05 + x * 0.21, 0.28, 0.15 - z * 0.2);
        addPick(m, { title: "柵欄葉肉", html: "<p>柱狀光合細胞。切開可見大液泡同周邊葉綠體。</p>" });
        root.add(m);
        if (cut) {
          const vac = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), std(0xdff0c8, { transparent: true, opacity: 0.5 }));
          vac.position.copy(m.position);
          root.add(vac);
          const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), std(0xc46aa0));
          nuc.position.set(m.position.x + 0.03, m.position.y - 0.08, m.position.z + 0.04);
          root.add(nuc);
        }
      }
    }

    for (let i = 0; i < 28; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.04, 10, 8), spongy);
      s.position.set(-1.1 + (i % 7) * 0.32 + Math.random() * 0.05, -0.22, 0.35 - Math.floor(i / 7) * 0.22);
      addPick(s, { title: "海綿葉肉", html: "<p>不規則細胞同氣室，方便 CO₂ 擴散。</p>" });
      root.add(s);
    }

    const vx = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 16), xyl);
    vx.rotation.x = Math.PI / 2;
    vx.position.set(0.35, 0.02, 0);
    addPick(vx, { go: "vein", title: "木質部（近軸）", html: "<p>運水入葉。撳入細胞層。</p>" });
    root.add(vx);
    const vp = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.4, 16), phl);
    vp.rotation.x = Math.PI / 2;
    vp.position.set(0.35, -0.12, 0);
    addPick(vp, { go: "vein", title: "韌皮部（遠軸）", html: "<p>運走蔗糖。撳入細胞層。</p>" });
    root.add(vp);

    const epi = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.5), std(0xb7d99a));
    epi.position.set(0, 0.62, 0);
    addPick(epi, { title: "上表皮", html: "<p>鋪路石狀活細胞，外有角質層。</p>" });
    root.add(epi);

    const g1 = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.035, 8, 16, Math.PI), std(0x3a6e38));
    g1.position.set(-0.2, -0.48, 0.55);
    g1.rotation.x = Math.PI / 2;
    addPick(g1, { go: "stoma", title: "氣孔", html: "<p>撳入保衛細胞特寫。</p>" });
    root.add(g1);

    camera.position.set(2.4, 1.5, 3.2);
    controls.target.set(0, 0, 0);
  }

  function viewVein() {
    const slab = plateSlab(TEX.vein, 2.8, 1.85, 0.07);
    slab.position.set(0, 1.35, 0);
    root.add(slab);

    for (let i = 0; i < 4; i++) {
      const ste = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 20), std(0x3db8c7, { roughness: 0.3 }));
      ste.position.set(-1.05, -0.55 + i * 0.44, 0);
      addPick(ste, { title: "篩管分子", html: "<p>活、成熟時無核。端壁係篩板。</p>" });
      root.add(ste);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.03, 20), std(0xc5d0d4));
      plate.position.set(-1.05, -0.34 + i * 0.44, 0);
      root.add(plate);
      const cc = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), std(0x2a9aa8));
      cc.position.set(-1.05, -0.55 + i * 0.44, 0.22);
      addPick(cc, { title: "伴胞", html: "<p>有核。同篩管由同一個母細胞分裂而來，負責裝載蔗糖。</p>" });
      root.add(cc);
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), std(0x7a3d8c));
      n.position.copy(cc.position);
      root.add(n);
    }

    const vesselWall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 1.7, 24, 1, true),
      std(0xc45a86, { side: THREE.DoubleSide, roughness: 0.4 })
    );
    vesselWall.position.set(0.15, 0, 0);
    addPick(vesselWall, { title: "導管分子", html: "<p>死細胞。厚次生壁、空腔運水。端壁有穿孔，側壁有紋孔。</p>" });
    root.add(vesselWall);
    const lumen = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 1.68, 20), std(0x4a1830));
    lumen.position.set(0.15, 0, 0);
    root.add(lumen);
    const perf = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20), std(0xe08aaa));
    perf.rotation.x = Math.PI / 2;
    perf.position.set(0.15, 0.86, 0);
    addPick(perf, { title: "穿孔板", html: "<p>端壁開口，水由一個導管分子直通下一個。闊葉樹多數係單穿孔。</p>" });
    root.add(perf);

    for (let i = 0; i < 6; i++) {
      const pit = new THREE.Mesh(new THREE.CircleGeometry(0.035, 10), std(0x2a1018));
      pit.position.set(0.15 + 0.281, -0.6 + i * 0.22, 0.12);
      pit.rotation.y = Math.PI / 2;
      root.add(pit);
    }

    for (let i = 0; i < 3; i++) {
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.7, 12), std(0xa84d74));
      tr.position.set(0.62 + i * 0.16, 0, -0.05);
      addPick(tr, { title: "管胞", html: "<p>死、無穿孔，靠紋孔過水。</p>" });
      root.add(tr);
    }
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 10), std(0x7a2038));
      f.position.set(1.12 + i * 0.11, 0, 0.08);
      addPick(f, { title: "纖維", html: "<p>次生壁極厚，機械支持。</p>" });
      root.add(f);
    }

    camera.position.set(2.8, 0.6, 3.4);
    controls.target.set(0, 0.2, 0);
  }

  function viewTransport() {
    const slab = plateSlab(TEX.transport, 2.6, 1.7, 0.07);
    slab.position.set(0, 1.5, 0);
    root.add(slab);
    const wall = std(0x3a7a3a);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.2, 24, 1, true), wall);
    root.add(body);
    for (let i = 0; i < 3; i++) {
      const x = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.0, 16), std(0x3b7dc4));
      x.position.set(-0.28 + i * 0.12, 0, 0.12);
      addPick(x, { title: "木質部導管", html: "<p>水同礦質向上。動力主要係葉面蒸騰。</p>" });
      root.add(x);
    }
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.0, 16), std(0xd4a07a));
      p.position.set(0.22 + i * 0.16, 0, 0.12);
      addPick(p, { title: "韌皮部篩管", html: "<p>蔗糖由源到庫，可以上亦可以下。</p>" });
      root.add(p);
    }
    camera.position.set(2.6, 0.8, 3.2);
    controls.target.set(0, 0, 0);
  }

  function viewStoma() {
    const slab = plateSlab(TEX.stoma, 2.4, 1.6, 0.07);
    slab.position.set(0, 1.15, 0);
    root.add(slab);
    const epi = std(0x7eaa70);
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) + Math.abs(z) < 1.2) continue;
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.38), epi);
        c.position.set(x * 0.4, 0, z * 0.4);
        root.add(c);
      }
    }
    const gmat = std(0x4d8f3e);
    const left = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.14, 10, 20, Math.PI), gmat);
    left.rotation.x = Math.PI / 2; left.rotation.z = Math.PI / 2;
    left.position.x = -0.08;
    addPick(left, { title: "保衛細胞", html: "<p>有葉綠體同核。內側壁較厚，膨壓令氣孔打開。</p>" });
    root.add(left);
    const right = left.clone();
    right.rotation.z = -Math.PI / 2;
    right.position.x = 0.08;
    addPick(right, { title: "保衛細胞", html: "<p>成對包圍氣孔。</p>" });
    root.add(right);
    camera.position.set(1.6, 1.4, 2.2);
    controls.target.set(0, 0, 0);
  }

  function viewSlice(key, color) {
    const slab = plateSlab(TEX[key], 2.5, 2.5, 0.12);
    root.add(slab);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.04, 8, 48), std(color || 0x5a3a24));
    rim.rotation.x = Math.PI / 2;
    root.add(rim);
    camera.position.set(0.2, 2.4, 2.8);
    controls.target.set(0, 0, 0);
  }

  function viewTrunk() {
    const bark = std(0x4a2f1c);
    const phloem = std(0x9a4d4d);
    const cambium = std(0x6e8f4a);
    const sap = std(0xd7c09a);
    const heart = std(0x8a5a32);
    const theta = cutaway ? Math.PI * 1.45 : Math.PI * 2;
    const segs = [
      [0.95, 0.88, bark, "樹皮（木栓）", "<p>死細胞保護層。</p>"],
      [0.87, 0.78, phloem, "次生韌皮部", "<p>篩管運蔗糖。</p>"],
      [0.77, 0.74, cambium, "維管形成層", "<p>向內造木材，向外造韌皮部。撳入特寫。</p>", "cambium"],
      [0.73, 0.38, sap, "邊材", "<p>仍在運水嘅次生木質部。</p>"],
      [0.37, 0.02, heart, "心材", "<p>死、常有填充物，主要支持。</p>"]
    ];
    segs.forEach(([o, i, m, title, html, go]) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(o, o, 1.8, 40, 1, false, -0.4, theta), m);
      addPick(mesh, { title, html, go });
      root.add(mesh);
    });
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 40),
      new THREE.MeshStandardMaterial({ map: TEX.stem, roughness: 0.5 })
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.91;
    root.add(top);
    camera.position.set(2.8, 1.6, 2.8);
    controls.target.set(0, 0, 0);
  }

  function viewCambium() {
    const slab = plateSlab(TEX.cambium, 2.8, 1.8, 0.07);
    slab.position.set(0, 1.4, 0);
    root.add(slab);
    const xyl = std(0xc56b7a);
    const cam = std(0xe8d7b8);
    const phl = std(0x5aaeb8);
    for (let i = 0; i < 6; i++) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.7), xyl);
      v.position.set(-1.15, -0.7 + i * 0.28, 0);
      addPick(v, { title: "次生木質部", html: "<p>形成層向內產生。</p>" });
      root.add(v);
    }
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.7), cam);
      c.position.set(-0.15, -0.7 + i * 0.2, 0);
      addPick(c, { title: "形成層帶", html: "<p>真正原始細胞通常一層；帶包含衍生細胞。</p>" });
      root.add(c);
    }
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.7), phl);
      p.position.set(0.85, -0.7 + i * 0.28, 0);
      addPick(p, { title: "次生韌皮部", html: "<p>形成層向外產生。</p>" });
      root.add(p);
    }
    camera.position.set(2.4, 0.4, 3.0);
    controls.target.set(0, 0, 0);
  }

  function viewXylemLS() {
    const slab = plateSlab(TEX.xylemLS, 2.8, 1.7, 0.07);
    slab.position.set(0, 1.25, 0);
    root.add(slab);
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 2.2, 24, 1, true),
      std(0xb08960, { side: THREE.DoubleSide })
    );
    wall.rotation.z = Math.PI / 2;
    wall.position.set(-0.4, 0, 0);
    addPick(wall, { title: "導管分子", html: "<p>側壁紋孔；端壁單穿孔。腔中無格子濾網。</p>" });
    root.add(wall);
    const perf = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 20), std(0xd4b896));
    perf.rotation.y = Math.PI / 2;
    perf.position.set(0.7, 0, 0);
    addPick(perf, { title: "單穿孔", html: "<p>端壁一個大口，水直通。</p>" });
    root.add(perf);
    for (let i = 0; i < 8; i++) {
      const ray = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), std(0xd8cbb3));
      ray.position.set(-0.9 + i * 0.22, -0.55, 0.28);
      addPick(ray, { title: "木射線", html: "<p>活薄壁細胞，橫向運輸同儲存。</p>" });
      root.add(ray);
    }
    camera.position.set(1.6, 1.0, 2.8);
    controls.target.set(0, 0, 0);
  }

  function viewFlower() {
    const slab = plateSlab(TEX.flower, 1.7, 2.4, 0.07);
    slab.rotation.x = 0.15;
    root.add(slab);
    camera.position.set(0.4, 0.6, 3.2);
    controls.target.set(0, 0, 0);
  }

  const BUILD = {
    tree: viewTree,
    leaf: viewLeaf,
    vein: viewVein,
    stoma: viewStoma,
    transport: viewTransport,
    stemPrimary: () => viewSlice("stemPrimary", 0x6aa36a),
    stem: () => viewSlice("stem", 0x5a3a24),
    trunk: viewTrunk,
    cambium: viewCambium,
    xylemLS: viewXylemLS,
    root: () => viewSlice("root", 0x8a4a4a),
    roottip: () => viewSlice("roottip", 0x7a5a8a),
    sam: () => viewSlice("sam", 0x3d7a3a),
    flower: viewFlower
  };

  function load(id) {
    current = id;
    document.querySelectorAll("button.nav").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
    clearRoot();
    (BUILD[id] || viewTree)();
    controls.syncFromCamera();
    setInfo(id);
  }

  function resize() {
    const stage = document.getElementById("stage");
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let downX = 0, downY = 0;
  canvas.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; });
  canvas.addEventListener("pointerup", (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(pickables, false);
    if (!hits.length) return;
    const d = hits[0].object.userData;
    if (d.go) load(d.go);
    else if (d.title) setInfo(current, { badge: "選中", title: d.title, html: d.html });
  });

  document.querySelectorAll("button.nav").forEach((b) => b.addEventListener("click", () => load(b.dataset.id)));
  document.getElementById("btnReset").onclick = () => load(current);
  document.getElementById("btnCut").onclick = () => { cutaway = !cutaway; load(current); };

  load("tree");

  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();
})();
