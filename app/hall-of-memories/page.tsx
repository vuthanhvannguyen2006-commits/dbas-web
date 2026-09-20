import { Suspense } from "react";
import Hall from "@/components/memories/hall";
export const metadata = { title: "Hall of Memories | DBAS" };
export default function Page() {
  return (
    <Suspense fallback={<p>Loading memories...</p>}>
      <Hall />
    </Suspense>
  );
}
