// Global 3D Scene - Interactive Lightning Web
let globalScene, globalCamera, globalRenderer;
let particlesMesh, linesMesh;
let particlesData = [];
let particlePositions, particleColors;
const maxParticleCount = 150; // Fewer particles for lightning (more segments per connection)
const r = 800; // Radius of particle volume
const maxDistance = 200; // Max distance to draw connecting lightning

// We will use 4 line segments to create a jagged lightning bolt between two close nodes
const segmentsPerLightning = 4;
// Maximum possible lightning connections (worst case)
const maxLines = (maxParticleCount * (maxParticleCount - 1) / 2) * segmentsPerLightning;

function initGlobal3DScene() {
  const container = document.getElementById('global-3d-container');
  if (!container) return;

  globalScene = new THREE.Scene();
  
  globalCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
  globalCamera.position.z = 1750;

  globalRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  globalRenderer.setPixelRatio(window.devicePixelRatio);
  globalRenderer.setSize(window.innerWidth, window.innerHeight);
  globalRenderer.setClearColor(0x000000, 0); 
  container.appendChild(globalRenderer.domElement);

  // Initial colors based on current theme
  const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
  let initialColor = isLightMode ? 0x3730a3 : 0x6366f1; // Dark indigo for light mode, glowing for dark

  const pMaterial = new THREE.PointsMaterial({
    color: initialColor,
    size: 5,
    blending: isLightMode ? THREE.NormalBlending : THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: false
  });

  const pGeometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(maxParticleCount * 3);
  
  for (let i = 0; i < maxParticleCount; i++) {
    const x = Math.random() * r - r / 2;
    const y = Math.random() * r - r / 2;
    const z = Math.random() * r - r / 2;

    particlePositions[i * 3] = x;
    particlePositions[i * 3 + 1] = y;
    particlePositions[i * 3 + 2] = z;

    particlesData.push({
      velocity: new THREE.Vector3(-1 + Math.random() * 2, -1 + Math.random() * 2, -1 + Math.random() * 2),
      numConnections: 0
    });
  }

  pGeometry.setDrawRange(0, maxParticleCount);
  pGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3).setUsage(THREE.DynamicDrawUsage));

  particlesMesh = new THREE.Points(pGeometry, pMaterial);
  globalScene.add(particlesMesh);

  // Lightning lines
  const linePositions = new Float32Array(maxLines * 3 * 2); // * 2 for start/end vertices
  particleColors = new Float32Array(maxLines * 3 * 2);

  const lGeometry = new THREE.BufferGeometry();
  lGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  lGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3).setUsage(THREE.DynamicDrawUsage));

  const lMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: isLightMode ? THREE.NormalBlending : THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.4,
    linewidth: 2 // Note: most browsers ignore linewidth, but WebGL might support it in some environments
  });

  linesMesh = new THREE.LineSegments(lGeometry, lMaterial);
  globalScene.add(linesMesh);

  // Mouse interaction
  let mouseX = 0;
  let mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 2;
    mouseY = (e.clientY - window.innerHeight / 2) * 2;
  });

  // Theme adapter
  window.addEventListener('themeChanged', (e) => {
    const theme = e.detail || 'dark';
    
    if (theme === 'light') {
      particlesMesh.material.color.setHex(0x3730a3);
      particlesMesh.material.blending = THREE.NormalBlending;
      linesMesh.material.blending = THREE.NormalBlending;
      linesMesh.material.opacity = 0.6; // Slightly higher opacity for light mode
    } else if (theme === 'cyberpunk') {
      particlesMesh.material.color.setHex(0x39ff14);
      particlesMesh.material.blending = THREE.AdditiveBlending;
      linesMesh.material.blending = THREE.AdditiveBlending;
      linesMesh.material.opacity = 0.4;
    } else {
      particlesMesh.material.color.setHex(0x6366f1);
      particlesMesh.material.blending = THREE.AdditiveBlending;
      linesMesh.material.blending = THREE.AdditiveBlending;
      linesMesh.material.opacity = 0.4;
    }
  });

  let timeClock = 0;

  function animateGlobal() {
    requestAnimationFrame(animateGlobal);
    timeClock += 0.05;

    let vertexpos = 0;
    let colorpos = 0;
    let numConnected = 0;

    for (let i = 0; i < maxParticleCount; i++) {
      particlesData[i].numConnections = 0;
    }

    // Get current material color to color the lightning
    const hex = particlesMesh.material.color.getHex();
    const rColor = ((hex >> 16) & 255) / 255;
    const gColor = ((hex >> 8) & 255) / 255;
    const bColor = (hex & 255) / 255;

    for (let i = 0; i < maxParticleCount; i++) {
      const particleData = particlesData[i];

      // Move particle
      particlePositions[i * 3] += particleData.velocity.x * 0.4;
      particlePositions[i * 3 + 1] += particleData.velocity.y * 0.4;
      particlePositions[i * 3 + 2] += particleData.velocity.z * 0.4;

      // Bounce
      if (particlePositions[i * 3] < -r / 2 || particlePositions[i * 3] > r / 2) particleData.velocity.x = -particleData.velocity.x;
      if (particlePositions[i * 3 + 1] < -r / 2 || particlePositions[i * 3 + 1] > r / 2) particleData.velocity.y = -particleData.velocity.y;
      if (particlePositions[i * 3 + 2] < -r / 2 || particlePositions[i * 3 + 2] > r / 2) particleData.velocity.z = -particleData.velocity.z;

      for (let j = i + 1; j < maxParticleCount; j++) {
        const particleDataB = particlesData[j];
        
        const dx = particlePositions[i * 3] - particlePositions[j * 3];
        const dy = particlePositions[i * 3 + 1] - particlePositions[j * 3 + 1];
        const dz = particlePositions[i * 3 + 2] - particlePositions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // If close enough, draw lightning
        if (dist < maxDistance) {
          particleData.numConnections++;
          particleDataB.numConnections++;

          // Create jagged lightning effect by interpolating points with random offset
          let startX = particlePositions[i * 3];
          let startY = particlePositions[i * 3 + 1];
          let startZ = particlePositions[i * 3 + 2];

          const endX = particlePositions[j * 3];
          const endY = particlePositions[j * 3 + 1];
          const endZ = particlePositions[j * 3 + 2];

          // Intensity scales inversely with distance and flashes over time
          const intensity = (1.0 - (dist / maxDistance)) * (0.5 + Math.abs(Math.sin(timeClock + dist)) * 0.5);

          for (let s = 1; s <= segmentsPerLightning; s++) {
            const ratio = s / segmentsPerLightning;
            
            // True target point on straight line
            let targetX = particlePositions[i * 3] + (endX - startX) * ratio;
            let targetY = particlePositions[i * 3 + 1] + (endY - startY) * ratio;
            let targetZ = particlePositions[i * 3 + 2] + (endZ - startZ) * ratio;

            // Add jaggedness (skip offset on the final segment to ensure it connects)
            if (s < segmentsPerLightning) {
              const jitter = 15; // Jitter amount
              targetX += (Math.random() - 0.5) * jitter;
              targetY += (Math.random() - 0.5) * jitter;
              targetZ += (Math.random() - 0.5) * jitter;
            } else {
              targetX = endX;
              targetY = endY;
              targetZ = endZ;
            }

            linePositions[vertexpos++] = startX;
            linePositions[vertexpos++] = startY;
            linePositions[vertexpos++] = startZ;

            linePositions[vertexpos++] = targetX;
            linePositions[vertexpos++] = targetY;
            linePositions[vertexpos++] = targetZ;

            // Apply lightning color with intensity variation
            const rJitter = Math.min(1.0, rColor * (1 + intensity));
            const gJitter = Math.min(1.0, gColor * (1 + intensity));
            const bJitter = Math.min(1.0, bColor * (1 + intensity));

            particleColors[colorpos++] = rJitter;
            particleColors[colorpos++] = gJitter;
            particleColors[colorpos++] = bJitter;

            particleColors[colorpos++] = rJitter;
            particleColors[colorpos++] = gJitter;
            particleColors[colorpos++] = bJitter;

            startX = targetX;
            startY = targetY;
            startZ = targetZ;
            
            numConnected++;
          }
        }
      }
    }

    linesMesh.geometry.setDrawRange(0, numConnected * 2);
    linesMesh.geometry.attributes.position.needsUpdate = true;
    linesMesh.geometry.attributes.color.needsUpdate = true;
    particlesMesh.geometry.attributes.position.needsUpdate = true;

    // Fast rotation for high-energy feel
    globalScene.rotation.y = timeClock * 0.05 + (mouseX * 0.00005);
    globalScene.rotation.x = timeClock * 0.02 + (mouseY * 0.00005);

    globalRenderer.render(globalScene, globalCamera);
  }

  animateGlobal();

  window.addEventListener('resize', () => {
    globalCamera.aspect = window.innerWidth / window.innerHeight;
    globalCamera.updateProjectionMatrix();
    globalRenderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Initialise when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobal3DScene);
} else {
  initGlobal3DScene();
}
