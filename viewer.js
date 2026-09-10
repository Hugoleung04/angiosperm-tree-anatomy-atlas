function makeOrbit(camera, el) {
  const t = new THREE.Vector3();
  let drag = false, lx = 0, ly = 0, sx = 0.7, sy = 0.35, dist = 4, pinch = 0;
  const apply = () => {
    camera.position.set(
      t.x + dist * Math.sin(sx) * Math.cos(sy),
      t.y + dist * Math.sin(sy),
      t.z + dist * Math.cos(sx) * Math.cos(sy)
    );
    camera.lookAt(t);
  };
  el.addEventListener("pointerdown", (e) => { drag = true; lx = e.clientX; ly = e.clientY; try { el.setPointerCapture(e.pointerId); } catch (err) {} });
  el.addEventListener("pointerup", () => { drag = false; });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    sx -= (e.clientX - lx) * 0.005;
    sy = Math.max(-1.2, Math.min(1.2, sy + (e.clientY - ly) * 0.005));
    lx = e.clientX; ly = e.clientY;
  });
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    dist = Math.max(0.6, Math.min(14, dist * (e.deltaY > 0 ? 1.08 : 0.92)));
  }, { passive: false });
  el.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 2) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (pinch) dist = Math.max(0.6, Math.min(14, dist * (pinch / d)));
    pinch = d; e.preventDefault();
  }, { passive: false });
  el.addEventListener("touchend", () => { pinch = 0; });
  return {
    target: t,
    update: apply,
    look(x, y, z, d, a, b) { t.set(x, y, z); dist = d; sx = a; sy = b; }
  };
}

(function () {
  if (!window.THREE) {
    const e = document.getElementById("err");
    e.style.display = "block";
    e.textContent = "Three.js 載入失敗。請確認 repo 有 vendor/three.min.js，或用有網絡嘅瀏覽器。";
    return;
  }

  const canvas = document.getElementById("c");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x07090c);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 80);
  const controls = makeOrbit(camera, canvas);

  scene.add(new THREE.AmbientLight(0xcfd8e6, 0.85));
  const key = new THREE.DirectionalLight(0xfff6ea, 1.15);
  key.position.set(4, 7, 5);
  scene.add(key);
  scene.add(new THREE.DirectionalLight(0x88a0c4, 0.4).translateX(-5).translateY(2));

  const root = new THREE.Group();
  scene.add(root);

  function M(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color, roughness: 0.48, metalness: 0.02
    }, extra || {}));
  }
  function add(mesh) { root.add(mesh); return mesh; }

  function hollowTube(rOut, rIn, len, segs, matOut, matIn) {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(rOut, rOut, len, segs, 1, true), matOut);
    outer.material.side = THREE.DoubleSide;
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(rIn, rIn, len * 0.99, segs, 1, true), matIn);
    inner.material.side = THREE.DoubleSide;
    g.add(outer); g.add(inner);
    return g;
  }

  function sievePlate(r, y) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r * 0.92, 0.012, 8, 20), M(0xc5d0d6)));
    g.children[0].rotation.x = Math.PI / 2;
    g.children[0].position.y = y;
    const disk = new THREE.Mesh(new THREE.CircleGeometry(r * 0.85, 20), M(0xb7c4cc));
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = y;
    g.add(disk);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), M(0x1a2430));
      hole.position.set(Math.cos(a) * r * 0.35, y + 0.002, Math.sin(a) * r * 0.35);
      hole.rotation.x = -Math.PI / 2;
      g.add(hole);
    }
    return g;
  }

  function clear() {
    while (root.children.length) {
      const o = root.children[0];
      root.remove(o);
    }
  }

  const INFO = {
    leaf: ["組織塊", "葉肉立體模型", "<p>上表皮 → 柵欄（切開兩個見到液泡／葉綠體／核）→ 葉脈（上木質部下韌皮部）→ 海綿氣室 → 氣孔。轉側面可以望入導管空腔。</p>"],
    vein: ["細胞", "葉脈立體模型", "<p>青篩管有篩板孔；旁邊伴胞有核。洋紅導管係空心，側壁有紋孔，頂有穿孔。紅纖維壁厚腔細。</p>"],
    stoma: ["細胞", "氣孔", "<p>一對腎形保衛細胞包圍氣孔，入面有葉綠體同核。</p>"],
    transport: ["功能", "運輸管", "<p>藍管水向上；粉管蔗糖由源到庫。</p>"],
    trunk: ["器官", "樹幹層次", "<p>由外到內：木栓、韌皮部、形成層、邊材、心材。撳剖開睇每一層厚度。</p>"],
    cambium: ["形成層", "雙面形成層", "<p>中間淡色形成層帶。左（內）木質部，右（外）韌皮部，橫條射線。</p>"],
    xylem: ["木材", "導管", "<p>空心導管，端壁單穿孔，側壁紋孔。下面一排活射線細胞。</p>"],
    root: ["根", "四原型中柱", "<p>四條木質部臂，韌皮部夾喺臂之間。</p>"]
  };

  function setInfo(id) {
    const i = INFO[id];
    document.getElementById("badge").textContent = i[0];
    document.getElementById("title").textContent = i[1];
    document.getElementById("body").innerHTML = i[2];
  }

  function viewLeaf() {
    const epi = M(0xc5e3a8);
    for (let x = 0; x < 9; x++) {
      for (let z = 0; z < 5; z++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.06, 0.21), epi);
        c.position.set(-0.95 + x * 0.24, 0.72, -0.48 + z * 0.24);
        add(c);
      }
    }
    const pal = M(0x4fa64b, { roughness: 0.35 });
    const palCut = M(0x8fd18c, { roughness: 0.28 });
    for (let x = 0; x < 9; x++) {
      for (let z = 0; z < 3; z++) {
        const cut = (x === 6 || x === 7) && z === 1;
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.38, 6, 12), cut ? palCut : pal);
        m.position.set(-0.95 + x * 0.24, 0.38, -0.24 + z * 0.24);
        add(m);
        if (cut) {
          add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), M(0xe7f5c8, { transparent: true, opacity: 0.45 }))).position.copy(m.position);
          const n = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), M(0xc45a9a));
          n.position.set(m.position.x + 0.03, m.position.y - 0.1, m.position.z + 0.04);
          add(n);
          for (let k = 0; k < 8; k++) {
            const ch = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), M(0x2f7a28));
            const a = (k / 8) * Math.PI * 2;
            ch.position.set(m.position.x + Math.cos(a) * 0.06, m.position.y + 0.08, m.position.z + Math.sin(a) * 0.04);
            add(ch);
          }
        }
      }
    }
    const xy = hollowTube(0.09, 0.055, 1.5, 16, M(0xb56a32, { side: THREE.DoubleSide }), M(0x3a1c0c, { side: THREE.DoubleSide }));
    xy.rotation.z = Math.PI / 2;
    xy.position.set(0.15, 0.06, 0);
    add(xy);
    const ph = hollowTube(0.07, 0.045, 1.5, 16, M(0xc8c0d8, { side: THREE.DoubleSide }), M(0x3a3048, { side: THREE.DoubleSide }));
    ph.rotation.z = Math.PI / 2;
    ph.position.set(0.15, -0.1, 0);
    add(ph);
    const spongy = M(0x3d8a42);
    for (let i = 0; i < 22; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.09 + (i % 3) * 0.015, 12, 10), spongy);
      s.position.set(-0.9 + (i % 6) * 0.32, -0.32, -0.35 + Math.floor(i / 6) * 0.26);
      add(s);
    }
    const low = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 1.2), M(0x9ec987));
    low.position.y = -0.55;
    add(low);
    const g1 = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.032, 8, 16, Math.PI), M(0x3a6e36));
    g1.rotation.x = Math.PI / 2;
    g1.position.set(-0.2, -0.58, 0.4);
    add(g1);
    controls.look(0, 0.1, 0, 3.6, 0.65, 0.32);
  }

  function viewVein() {
    for (let i = 0; i < 4; i++) {
      const y = -0.7 + i * 0.46;
      const ste = hollowTube(0.16, 0.12, 0.4, 22, M(0x3db8c7, { side: THREE.DoubleSide, roughness: 0.3 }), M(0x12343a, { side: THREE.DoubleSide }));
      ste.position.set(-0.95, y, 0);
      add(ste);
      add(sievePlate(0.16, y + 0.21)).position.x = -0.95;
      const cc = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 14), M(0x2a9aa8));
      cc.position.set(-0.95, y, 0.26);
      add(cc);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), M(0x7a3d8c))).position.copy(cc.position);
    }
    const vessel = hollowTube(0.3, 0.22, 1.85, 28, M(0xc45a86, { side: THREE.DoubleSide, roughness: 0.38 }), M(0x3a1020, { side: THREE.DoubleSide }));
    vessel.position.set(0.2, 0, 0);
    add(vessel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 22), M(0xe08aaa));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0.2, 0.94, 0);
    add(rim);
    for (let i = 0; i < 7; i++) {
      const pit = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), M(0x2a1018));
      pit.position.set(0.2 + 0.301, -0.7 + i * 0.22, 0.1);
      pit.rotation.y = Math.PI / 2;
      add(pit);
    }
    for (let i = 0; i < 3; i++) {
      const tr = hollowTube(0.075, 0.04, 1.85, 12, M(0xa84d74, { side: THREE.DoubleSide }), M(0x2a1018, { side: THREE.DoubleSide }));
      tr.position.set(0.68 + i * 0.17, 0, -0.05);
      add(tr);
    }
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.85, 10), M(0x7a2038));
      f.position.set(1.2 + i * 0.12, 0, 0.06);
      add(f);
    }
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.16, 4, 8), M(0x4ea64a));
      p.position.set(0.3 + (i % 3) * 0.18, 1.15, -0.35 + Math.floor(i / 3) * 0.2);
      add(p);
    }
    controls.look(0.1, 0.1, 0, 3.8, 0.8, 0.25);
  }

  function viewStoma() {
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) + Math.abs(z) < 1.5) continue;
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), M(0x7eaa70));
        c.position.set(x * 0.44, 0, z * 0.44);
        add(c);
      }
    }
    const gm = M(0x4d8f3e, { roughness: 0.35 });
    const L = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.15, 12, 24, Math.PI), gm);
    L.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    L.position.x = -0.1;
    add(L);
    const R = L.clone();
    R.rotation.z = -Math.PI / 2;
    R.position.x = 0.1;
    add(R);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), M(0x8a7ab0))).position.set(-0.22, 0.06, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), M(0x8a7ab0))).position.set(0.22, 0.06, 0);
    for (let i = 0; i < 10; i++) {
      const ch = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M(0x2f7a28));
      const a = (i / 10) * Math.PI * 2;
      ch.position.set(Math.cos(a) * 0.28, 0.08, Math.sin(a) * 0.12);
      add(ch);
    }
    controls.look(0, 0, 0, 2.4, 0.4, 0.55);
  }

  function viewTransport() {
    for (let i = 0; i < 3; i++) {
      const t = hollowTube(0.13, 0.1, 2.2, 16, M(0x3b7dc4, { side: THREE.DoubleSide }), M(0x0d2138, { side: THREE.DoubleSide }));
      t.position.set(-0.4 + i * 0.16, 0, 0);
      add(t);
    }
    for (let i = 0; i < 2; i++) {
      const t = hollowTube(0.13, 0.1, 2.2, 16, M(0xd4a07a, { side: THREE.DoubleSide }), M(0x3a2414, { side: THREE.DoubleSide }));
      t.position.set(0.28 + i * 0.18, 0, 0);
      add(t);
    }
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 2.3, 24, 1, true), M(0x3a7a3a, { side: THREE.DoubleSide, transparent: true, opacity: 0.35 }));
    add(wrap);
    controls.look(0, 0, 0, 3.5, 0.7, 0.25);
  }

  function viewTrunk() {
    const cols = [
      [0.95, 0.88, 0x4a2f1c],
      [0.87, 0.78, 0x9a4d4d],
      [0.77, 0.74, 0x6e8f4a],
      [0.73, 0.4, 0xd7c09a],
      [0.39, 0.02, 0x8a5a32]
    ];
    cols.forEach(([o, i, c]) => {
      add(new THREE.Mesh(new THREE.CylinderGeometry(o, o, 1.9, 40, 1, false, -0.35, Math.PI * 1.5), M(c)));
    });
    controls.look(0, 0, 0, 3.4, 0.9, 0.35);
  }

  function viewCambium() {
    for (let i = 0; i < 6; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.7), M(0xc56b7a))).position.set(-1.1, -0.7 + i * 0.28, 0);
    for (let i = 0; i < 8; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.7), M(0xe8d7b8))).position.set(-0.15, -0.7 + i * 0.2, 0);
    for (let i = 0; i < 6; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.7), M(0x5aaeb8))).position.set(0.85, -0.7 + i * 0.28, 0);
    for (let i = 0; i < 5; i++) add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.08), M(0xd4c4a8))).position.set(0, -0.5 + i * 0.28, 0.2);
    controls.look(0, 0, 0, 3.4, 0.6, 0.2);
  }

  function viewXylem() {
    const v = hollowTube(0.32, 0.24, 2.2, 24, M(0xb08960, { side: THREE.DoubleSide }), M(0x3a2a18, { side: THREE.DoubleSide }));
    v.rotation.z = Math.PI / 2;
    add(v);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 20), M(0xd4b896));
    rim.rotation.y = Math.PI / 2;
    rim.position.x = 1.1;
    add(rim);
    for (let i = 0; i < 8; i++) {
      const ray = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), M(0xd8cbb3));
      ray.position.set(-0.8 + i * 0.22, -0.5, 0.3);
      add(ray);
    }
    controls.look(0, 0, 0, 3.2, 0.7, 0.3);
  }

  function viewRoot() {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.7), M(0xb03a3a));
      arm.position.set(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35);
      arm.lookAt(0, 0, 0);
      add(arm);
      const mx = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 12), M(0xf2f2f0));
      mx.rotation.x = Math.PI / 2;
      mx.position.set(Math.cos(a) * 0.18, 0.02, Math.sin(a) * 0.18);
      add(mx);
      const ph = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18), M(0x6a6aaa));
      const b = a + Math.PI / 4;
      ph.position.set(Math.cos(b) * 0.42, 0, Math.sin(b) * 0.42);
      add(ph);
    }
    add(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 32), M(0x6a3a3a)));
    controls.look(0, 0, 0, 2.8, 0.4, 0.7);
  }

  const BUILD = { leaf: viewLeaf, vein: viewVein, stoma: viewStoma, transport: viewTransport, trunk: viewTrunk, cambium: viewCambium, xylem: viewXylem, root: viewRoot };

  function load(id) {
    document.querySelectorAll("button.nav").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
    clear();
    (BUILD[id] || viewLeaf)();
    setInfo(id);
    document.getElementById("drawer").classList.remove("open");
    document.getElementById("scrim").classList.remove("on");
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / Math.max(innerHeight, 1);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  document.getElementById("menuBtn").onclick = () => {
    document.getElementById("drawer").classList.toggle("open");
    document.getElementById("scrim").classList.toggle("on");
  };
  document.getElementById("infoBtn").onclick = () => document.getElementById("card").classList.toggle("hidden");
  document.getElementById("scrim").onclick = () => {
    document.getElementById("drawer").classList.remove("open");
    document.getElementById("scrim").classList.remove("on");
  };
  document.querySelectorAll("button.nav").forEach((b) => { b.onclick = () => load(b.dataset.id); });

  load("vein");
  (function loop() { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); })();
})();
