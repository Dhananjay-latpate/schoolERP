import { redirect } from "next/navigation";

export default function PrincipalAdmissionsCustomPlansRedirect() {
  redirect("/principal/admissions?section=custom_plans");
}
