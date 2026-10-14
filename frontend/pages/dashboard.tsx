import { useEffect } from "react";
import { useRouter } from "next/router";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cameras");
  }, [router]);

  return null;
}
