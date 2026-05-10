import { redirect } from "next/navigation";

export default function PrincipalAdmissionsAuditRedirect() {
  redirect("/principal/admissions?section=audit");
}
