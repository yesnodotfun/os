import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore'; // Import the store

// Removed props as they are no longer used by the shader
// interface GalaxyBackgroundProps {
//   particleCount?: number;
//   starSpeed?: number;
// }

// const GalaxyBackground: React.FC<GalaxyBackgroundProps> = ({}) => { // Props removed
const GalaxyBackground: React.FC = () => { // Simplified props
  const mountRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef(new THREE.Clock()); // Use Clock for time uniform
  const [isLargeScreen, setIsLargeScreen] = useState(true); // State for screen size
  const shaderEffectEnabled = useAppStore((state) => state.shaderEffectEnabled); // Get state from store

  // Combined state for rendering condition
  const shouldRender = isLargeScreen && shaderEffectEnabled;

  // Check initial screen width and add resize listener
  useEffect(() => {
    const checkScreenWidth = () => {
      // Use a common breakpoint like 768px (Tailwind 'md') or 640px ('sm')
      setIsLargeScreen(window.innerWidth >= 640); // Update screen size state
    };

    checkScreenWidth(); // Initial check
    window.addEventListener('resize', checkScreenWidth);

    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  useEffect(() => {
    if (!shouldRender || !mountRef.current) return;

    const currentMount = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); // Orthographic for fullscreen shader

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.autoClearColor = false; // No longer needed for trails
    currentMount.appendChild(renderer.domElement);

    // --- Shader Setup ---
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec2 resolution;
      uniform float time;
      varying vec2 vUv;

      // Helper function (implementing rotate3D)
      mat3 rotate3D(float angle, vec3 axis) {
          axis = normalize(axis);
          float s = sin(angle);
          float c = cos(angle);
          float oc = 1.0 - c;

          return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                      oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                      oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
      }

      void main() {
          vec2 r = resolution.xy;
          vec2 FC = gl_FragCoord.xy; // Use gl_FragCoord
          float t = time; // Use time uniform
          vec3 o = vec3(0.0); // Output color, initialize to black

          // User provided shader code adapted
          for(float i=0.0,g=0.0,e=0.0,s=0.0; ++i<99.;o+=vec3(s/8e2)){ // Initialize loop variables, output to o
            vec3 p=vec3((FC.xy-.5*r)/r.y*1.3+vec2(2.8,-.4),g-6.)*rotate3D(sin(t*.5)*.1-3.,vec3(2,40,-7));
            s=3.;
            // Use standard int loop, ensure i is initialized
            for(int j=0; j++<16; p=vec3(0,4,-1)-abs(abs(p)*e-vec3(3,4,3))){
              s*=e=7.5/abs(dot(p,p*(.55+cos(t)*.005)+.3));
            }
            g+=p.y/s-.0015;
            s=log2(s)-g*.5;
          }

          // Dim the output color
          float dimFactor = 0.4; // Adjust this value (0.0 to 1.0)
          gl_FragColor = vec4(o * dimFactor, 1.0);
      }
    `;

    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        resolution: { value: new THREE.Vector2(currentMount.clientWidth, currentMount.clientHeight) },
      },
      vertexShader,
      fragmentShader,
    });

    // Fullscreen Quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(quad);
    // --- End Shader Setup ---

    // Handle resize
    const handleResize = () => {
      if (!currentMount) return;
      const width = currentMount.clientWidth;
      const height = currentMount.clientHeight;
      renderer.setSize(width, height);
      shaderMaterial.uniforms.resolution.value.set(width, height);
      // No camera update needed for orthographic fullscreen quad
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Update time uniform
      shaderMaterial.uniforms.time.value = clockRef.current.getElapsedTime();

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      // Dispose Three.js objects
      scene.remove(quad);
      geometry.dispose();
      shaderMaterial.dispose();
      renderer.dispose();
    };
  // }, [particleCount, starSpeed]); // Update dependencies
  }, [shouldRender]); // Re-run effect if rendering condition changes

  // Conditionally render the container div
  return shouldRender ? (
    <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: -1 }} />
  ) : null; // Render nothing if condition not met
};

export default GalaxyBackground; 