# Public Assets

You can upload your 3D models (`.glb`, `.gltf`) and images (`.png`, `.jpg`, `.svg`) into this folder.

To use an uploaded model in your React Three Fiber scene, you can use the `useGLTF` hook from `@react-three/drei`:

```tsx
import { useGLTF } from '@react-three/drei';

export function MyCustomModel() {
  // Assuming you uploaded a file named "my-model.glb" to this folder
  const { scene } = useGLTF('/assets/my-model.glb');
  
  return <primitive object={scene} />;
}
```

To use an uploaded image:
```tsx
// Using a standard img tag
<img src="/assets/logo.png" alt="Logo" />

// Using it as a texture in Three.js
import { useTexture } from '@react-three/drei';

function TexturedCube() {
  const texture = useTexture('/assets/logo.png');
  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
```
