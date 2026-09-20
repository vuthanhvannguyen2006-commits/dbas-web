import NavBar from "@/components/nav-bar/nav-bar";
import Footer from "@/components/footer/footer";
export default function MemoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      {children}
      <Footer />
    </>
  );
}
