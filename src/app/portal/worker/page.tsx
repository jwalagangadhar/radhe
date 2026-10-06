import { redirect } from "next/navigation";

export default function WorkerIndexPage() {
  redirect("/portal/worker/queue");
}
