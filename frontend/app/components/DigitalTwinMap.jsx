import dynamic from 'next/dynamic';

const PathfinderApp = dynamic(() => import('./pathfinder/PathfinderApp'), {
  ssr: false,
});

export default function DigitalTwinMap() {
  return (
    <div className="w-full h-full bg-[#02040a] relative overflow-hidden">
      <PathfinderApp />
    </div>
  );
}
