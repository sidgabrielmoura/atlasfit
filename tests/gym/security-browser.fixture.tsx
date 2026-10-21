import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useMfaReauthentication } from "@/components/auth/mfa-reauthentication-dialog";
import { GymClosureForm } from "@/components/application/gym-closure-form";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogCancel } from "@/components/ui/alert-dialog";
function Fixture() {
  const auth = useMfaReauthentication(), [parent, setParent] = useState(false), [result, setResult] = useState("");
  async function change() { try { const reauthenticationProof = await auth.authenticate(); const response = await fetch("/mutation", { method: "POST", body: JSON.stringify({ reauthenticationProof }) }); if (!response.ok) throw new Error("Mutation failed"); setResult("Alteração confirmada"); setParent(false); } catch (failure) { setResult(failure instanceof Error ? failure.message : "Falha"); } }
  return <><button onClick={() => { setResult(""); setParent(true); }}>Alterar MFA</button>{auth.dialog}<output id="result">{result}</output><AlertDialog open={parent} onOpenChange={setParent}><AlertDialogContent><AlertDialogTitle>Alteração sensível</AlertDialogTitle><AlertDialogDescription>Confirme para iniciar.</AlertDialogDescription><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={event => { event.preventDefault(); void change(); }}>Continuar alteração</AlertDialogAction></AlertDialogContent></AlertDialog><GymClosureForm workspaceId="synthetic-workspace" slug="academia-sintetica" /></>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
