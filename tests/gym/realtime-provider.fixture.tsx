import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AblyProvider, useAbly } from "@/providers/ably-provider";
import { workspaceActions } from "@/stores/workspace.store";
import { chatStore } from "@/stores/chat.store";

const harness = (window as any).__realtimeTest;
function select(id: string | null, type: "PERSONAL" | "GYM" = "PERSONAL") {
  if (id === null) workspaceActions.clear();
  else workspaceActions.setActiveWorkspace({ id, name: id, slug: id, type, logo: "T", primaryColor: "#000000", plan: "Sintético", roles: ["OWNER"] });
}
function Probe() {
  const client = useAbly();
  useEffect(() => { harness.contexts.push(client ? (client as any).serial : null); }, [client]);
  return <output id="client">{client ? (client as any).serial : "none"}</output>;
}
select("A");
const root = createRoot(document.getElementById("root")!);
harness.select = select; harness.store = chatStore; harness.unmount = () => root.unmount();
root.render(<AblyProvider><Probe /></AblyProvider>);
