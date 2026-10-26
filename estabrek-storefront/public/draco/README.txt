Google's Draco mesh decoder (Apache License 2.0), copied from three.js 0.164.1
(node_modules/three/examples/jsm/libs/draco/gltf/). The 3D stage loads it from here
only when a store's own GLB file is Draco-compressed (storeThemes/three/GlbModel.tsx),
so no outside address is needed. Copy them again after upgrading three.
