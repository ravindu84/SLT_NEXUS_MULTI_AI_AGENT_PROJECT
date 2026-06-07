import dynamic from 'next/dynamic';

const PathfinderApp = dynamic(() => import('./pathfinder/PathfinderApp'), {
  ssr: false,
});

export default function DigitalTwinMap() {
  return (
    <div className="w-full min-h-full bg-[#02040a] relative">
      <PathfinderApp />
    </div>
  );
}
