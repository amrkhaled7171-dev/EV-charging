import ChargerDetail from '@/components/ChargerDetail';

export default async function ChargerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChargerDetail id={decodeURIComponent(id)} />;
}
