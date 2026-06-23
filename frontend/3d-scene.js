// 3D Scene for the Welcome View / Landing Page

let scene, camera, renderer, particles;

function init3DScene() {
  const container = document.getElementById('authOverlayScreen');
  if (!container) return;

  // Create a canvas container if it doesn't exist
  let canvasContainer = document.getElementById('welcome-3d-canvas');
  if (!canvasContainer) {
    canvasContainer = document.createElement('div');
    canvasContainer.id = 'welcome-3d-canvas';
    canvasContainer.style.position = 'absolute';
    canvasContainer.style.top = '0';
    canvasContainer.style.left = '0';
    canvasContainer.style.width = '100%';
    canvasContainer.style.height = '100%';
    canvasContainer.style.zIndex = '0';
    canvasContainer.style.overflow = 'hidden';
    container.insertBefore(canvasContainer, container.firstChild);
  }

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a); // Solid dark background
  
  // Camera setup
  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 50;

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  canvasContainer.appendChild(renderer.domElement);

  // Create particles
  const geometry = new THREE.BufferGeometry();
  const particlesCount = 1500;
  const posArray = new Float32Array(particlesCount * 3);
  
  for(let i = 0; i < particlesCount * 3; i++) {
    // Spread particles over a large area
    posArray[i] = (Math.random() - 0.5) * 200;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  
  // Create a material that looks like glowing neon orbs
  const material = new THREE.PointsMaterial({
    size: 0.8,
    color: 0x00f3ff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  
  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Add a subtle rotating wireframe torus
  const torusGeometry = new THREE.TorusGeometry(30, 8, 16, 100);
  const torusMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x9d4edd, 
    wireframe: true,
    transparent: true,
    opacity: 0.15
  });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  scene.add(torus);

  // Mouse interaction
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  const windowHalfX = container.clientWidth / 2;
  const windowHalfY = container.clientHeight / 2;

  container.addEventListener('mousemove', (event) => {
    // Calculate relative mouse position within the container
    const rect = container.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) - windowHalfX;
    mouseY = (event.clientY - rect.top) - windowHalfY;
  });

  // Animation Loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();

    // Smoothly interpolate target values
    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    // Rotate particles slowly and respond to mouse
    particles.rotation.y += 0.002;
    particles.rotation.x += 0.001;
    
    particles.rotation.y += 0.05 * (targetX - particles.rotation.y);
    particles.rotation.x += 0.05 * (targetY - particles.rotation.x);

    // Rotate torus
    torus.rotation.x += 0.005;
    torus.rotation.y += 0.005;

    renderer.render(scene, camera);
  }

  animate();

  // Handle Resize
  window.addEventListener('resize', () => {
    if(!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

function attemptInit() {
  setTimeout(() => {
    const container = document.getElementById('authOverlayScreen');
    if (container && !container.classList.contains('hidden')) {
      // Fallback dimensions if container hasn't sized yet
      if (container.clientWidth === 0) {
        container.style.width = '100vw';
        container.style.height = '100vh';
      }
      init3DScene();
    }
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attemptInit);
} else {
  attemptInit();
}

window.handleAuthViewActive = function() {
  if (!scene) {
    attemptInit();
  }
};
