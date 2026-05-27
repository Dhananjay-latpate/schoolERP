import { redirect } from "next/navigation";

// Direct-URL convenience: /principal/admissions/setup → dashboard with the
// Setup section already selected. Without this, the dynamic [id] route would
// match "setup" as an applicationId and show "Application not found".
export default function PrincipalAdmissionsSetupRedirect() {
  redirect("/principal/admissions?section=setup");
}
