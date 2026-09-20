import AlbumView from "@/components/memories/album-view";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AlbumView id={id} />;
}
