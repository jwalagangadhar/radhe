import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function WorkerLayout({ children, }) {
    const session = await getSession();
    if (!session) {
        redirect("/portal/login");
    }
    return <>{children}</>;
}
