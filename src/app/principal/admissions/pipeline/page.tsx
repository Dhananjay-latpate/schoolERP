import { redirect } from "next/navigation";

export default function PrincipalAdmissionsPipelineRedirect() {
  redirect("/principal/admissions?section=pipeline");
}
