file_path = 'frontend/app/components/pathfinder/components/DigitalTwinMap.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '// Internal Scene Component inside Canvas'
code1 = '''// Technician Dispatch Route Animation Component
interface TechnicianDispatchRouteProps {
  dispatchNodePos: [number, number, number];
  targetNodePos: [number, number, number];
}

function TechnicianDispatchRoute({ dispatchNodePos, targetNodePos }: TechnicianDispatchRouteProps) {
  const truckRef = useRef<THREE.Group>(null);
  const sirenRef = useRef<THREE.Mesh>(null);
  
  const curvePoints = useMemo(() => {
    const points = [];
    const cornerX = targetNodePos[0];
    points.push(new THREE.Vector3(dispatchNodePos[0], getTerrainElevation(dispatchNodePos[0], dispatchNodePos[2]) + 0.05, dispatchNodePos[2]));
    points.push(new THREE.Vector3(cornerX, getTerrainElevation(cornerX, dispatchNodePos[2]) + 0.05, dispatchNodePos[2]));
    points.push(new THREE.Vector3(targetNodePos[0], getTerrainElevation(targetNodePos[0], targetNodePos[2]) + 0.05, targetNodePos[2]));
    const unique = [];
    for (const p of points) {
      if (unique.length === 0 || p.distanceTo(unique[unique.length - 1]) > 0.001) unique.push(p);
    }
    if (unique.length < 2) {
      unique.push(new THREE.Vector3(targetNodePos[0], getTerrainElevation(targetNodePos[0], targetNodePos[2]) + 0.05, targetNodePos[2]));
    }
    return new THREE.CatmullRomCurve3(unique, false, 'catmullrom', 0.1);
  }, [dispatchNodePos, targetNodePos]);

  useFrame((state) => {
    if (truckRef.current) {
      const time = (state.clock.getElapsedTime() * 0.1) % 1.0;
      const point = curvePoints.getPointAt(time);
      try {
        const tangent = curvePoints.getTangentAt(time);
        truckRef.current.position.copy(point);
        const lookAtPos = point.clone().add(tangent);
        truckRef.current.lookAt(lookAtPos);
      } catch (e) {}
    }
    if (sirenRef.current) {
      const pulse = Math.sin(state.clock.getElapsedTime() * 20);
      sirenRef.current.material.color.setHex(pulse > 0 ? 0xff0000 : 0x222222);
    }
  });

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curvePoints, 64, 0.03, 8, false]} />
        <meshBasicMaterial color="#fcd34d" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <group ref={truckRef}>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.15, 0.15, 0.3]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.28, 0.05]} ref={sirenRef}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <Html position={[0, 0.5, 0]} center distanceFactor={15}>
          <div className="px-1.5 py-0.5 bg-amber-500/90 rounded text-[7px] text-black font-bold whitespace-nowrap border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]">
            TECHNICIAN DISPATCHED
          </div>
        </Html>
      </group>
    </group>
  );
}

// Internal Scene Component inside Canvas'''

target2 = '{/* Controls to traverse the digital twin space */}'
code2 = '''{/* Technician Dispatch Routes for active faults */}
      {nodes.filter(n => n.status === "fault").map(faultNode => {
        const dispatchSource = nodes.find(n => n.type === "msan" || n.type === "cabinet") || nodes[0];
        const dispatchPos = nodePositions[dispatchSource.id];
        const faultPos = nodePositions[faultNode.id];
        if (!dispatchPos || !faultPos) return null;
        return (
          <TechnicianDispatchRoute 
            key={`dispatch-${faultNode.id}`} 
            dispatchNodePos={dispatchPos} 
            targetNodePos={faultPos} 
          />
        );
      })}

      {/* Controls to traverse the digital twin space */}'''

if target1 in content and target2 in content:
    content = content.replace(target1, code1)
    content = content.replace(target2, code2)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('FAILED')
