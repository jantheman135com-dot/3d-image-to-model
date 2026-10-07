import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const viewer = document.getElementById('viewer');
const mainImageInput = document.getElementById('mainImageInput');
const labelImageInput = document.getElementById('labelImageInput');
const depthSlider = document.getElementById('depthSlider');
const depthValue = document.getElementById('depthValue');
const autoRotateToggle = document.getElementById('autoRotateToggle');
const gridToggle = document.getElementById('gridToggle');
const resetViewBtn = document.getElementById('resetViewBtn');
const sampleSceneBtn = document.getElementById('sampleSceneBtn');

let scene, camera, renderer, controls, mainMesh, gridMesh;
const labelGroup = new THREE.Group();
const state = {
  depth: Number(depthSlider.value),
  autoRotate: true,
  showGrid: true,
};

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07111f);
  scene.fog = new THREE.Fog(0x07111f, 8, 20);

  camera = new THREE.PerspectiveCamera(42, viewer.clientWidth / viewer.clientHeight, 0.1, 1000);
  camera.position.set(0, 1.5, 6.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  viewer.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
  keyLight.position.set(3, 6, 5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x9cc7ff, 0.9);
  rimLight.position.set(-4, 2, -4);
  scene.add(rimLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2.5;
  controls.maxDistance = 20;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.7;

  const baseGroup = new THREE.Group();
  scene.add(baseGroup);

  const floorGeometry = new THREE.CircleGeometry(6, 80);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x102236,
    transparent: true,
    opacity: 0.7,
    roughness: 0.95,
    metalness: 0.15,
  });
  gridMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  gridMesh.rotation.x = -Math.PI / 2;
  gridMesh.position.y = -1.7;
  scene.add(gridMesh);

  scene.add(labelGroup);

  buildGridLines();

  depthSlider.addEventListener('input', (event) => {
    state.depth = Number(event.target.value);
    depthValue.textContent = `${state.depth.toFixed(1)}x`;
    if (mainMesh) {
      applyDepthTransform(mainMesh, state.depth);
    }
  });

  autoRotateToggle.addEventListener('change', (event) => {
    state.autoRotate = event.target.checked;
    controls.autoRotate = state.autoRotate;
  });

  gridToggle.addEventListener('change', (event) => {
    state.showGrid = event.target.checked;
    gridMesh.visible = state.showGrid;
  });

  resetViewBtn.addEventListener('click', () => {
    camera.position.set(0, 1.5, 6.5);
    controls.target.set(0, 0, 0);
    controls.update();
  });

  sampleSceneBtn.addEventListener('click', () => {
    loadDemoImage();
  });

  mainImageInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) {
      loadMainImage(file);
    }
  });

  labelImageInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) {
      addFloatingLabel(file);
    }
  });

  window.addEventListener('resize', onResize);

  loadDemoImage();
  animate();
}

function onResize() {
  const { clientWidth, clientHeight } = viewer;
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  animateFloatingLabels();
  renderer.render(scene, camera);
}

function buildGridLines() {
  const gridGroup = new THREE.Group();
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x5ac7ff, transparent: true, opacity: 0.22 });

  for (let i = -8; i <= 8; i += 1) {
    const pointsX = [];
    const pointsZ = [];
    pointsX.push(new THREE.Vector3(i, -1.7, -8));
    pointsX.push(new THREE.Vector3(i, -1.7, 8));
    pointsZ.push(new THREE.Vector3(-8, -1.7, i));
    pointsZ.push(new THREE.Vector3(8, -1.7, i));

    const lineX = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsX), lineMaterial);
    const lineZ = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsZ), lineMaterial);
    gridGroup.add(lineX, lineZ);
  }

  scene.add(gridGroup);
}

function animateFloatingLabels() {
  labelGroup.children.forEach((mesh, idx) => {
    const floatOffset = Math.sin((performance.now() * 0.0014) + idx) * 0.12;
    mesh.position.y = mesh.userData.baseY + floatOffset;
    mesh.rotation.z = Math.sin((performance.now() * 0.0009) + idx) * 0.12;
  });
}

function loadDemoImage() {
  const demoImage = new Image();
  demoImage.crossOrigin = 'anonymous';
  demoImage.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80';

  demoImage.onload = () => {
    const texture = new THREE.Texture(demoImage);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    createImageModel(texture, demoImage.width, demoImage.height);
  };
}

function loadMainImage(file) {
  const reader = new FileReader();

  reader.onload = (event) => {
    const image = new Image();
    image.onload = () => {
      const texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      createImageModel(texture, image.width, image.height);
    };
    image.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

function createImageModel(texture, width, height) {
  const aspect = width / height;
  const planeWidth = 4.6;
  const planeHeight = planeWidth / aspect;

  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 220, 220);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  if (mainMesh) {
    scene.remove(mainMesh);
    mainMesh.geometry.dispose();
    mainMesh.material.dispose();
  }

  mainMesh = new THREE.Mesh(geometry, material);
  mainMesh.position.y = 0.2;
  scene.add(mainMesh);

  applyDepthTransform(mainMesh, state.depth);
}

function applyDepthTransform(mesh, depthStrength) {
  const geometry = mesh.geometry;
  const positionAttribute = geometry.attributes.position;
  const texture = mesh.material.map;

  if (!texture || !texture.image) return;

  const sourceImage = texture.image;
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;
  const context = canvas.getContext('2d');
  context.drawImage(sourceImage, 0, 0);

  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;

  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);

    const u = (x + geometry.parameters.width / 2) / geometry.parameters.width;
    const v = (y + geometry.parameters.height / 2) / geometry.parameters.height;

    const sampleX = Math.min(Math.max(Math.floor(u * sourceImage.width), 0), sourceImage.width - 1);
    const sampleY = Math.min(Math.max(Math.floor((1 - v) * sourceImage.height), 0), sourceImage.height - 1);
    const index = (sampleY * sourceImage.width + sampleX) * 4;

    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const brightness = (r + g + b) / 3 / 255;
    const elevation = (brightness - 0.5) * depthStrength * 2.1;

    positionAttribute.setZ(i, elevation);
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
}

function addFloatingLabel(file) {
  const reader = new FileReader();

  reader.onload = (event) => {
    const image = new Image();
    image.onload = () => {
      const texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const aspect = image.width / image.height;
      const width = 1.6;
      const height = width / aspect;
      const geometry = new THREE.PlaneGeometry(width, height);
      const labelMesh = new THREE.Mesh(geometry, material);

      labelMesh.position.set(
        (Math.random() - 0.5) * 2.6,
        1.1 + labelGroup.children.length * 0.3,
        (Math.random() - 0.5) * 2.5,
      );
      labelMesh.rotation.y = (Math.random() - 0.5) * 1.8;
      labelMesh.rotation.x = 0.3;
      labelMesh.userData.baseY = labelMesh.position.y;

      labelGroup.add(labelMesh);
    };
    image.src = event.target.result;
  };

  reader.readAsDataURL(file);
}
